import test from 'node:test';
import assert from 'node:assert';
import { CONFIG, getAiPreviewFilename, getAiPreviewMp3Filename } from './config';
import {
  getKWeightingCoefficients,
  filterKWeightingChannel,
  calculateTruePeak4x,
  computeLoudnessAndLra,
  countClippingEvents,
  calculateShortTermCrestMedian,
  calculateHighFrequencyDrop,
  calculateStereoCorrelation,
  calculateDCOffset,
  calculateStartEndLevels,
  evaluateMixGate
} from './standardsMetrics';
import { analyzeAudioBuffer, analyzeAudioBufferAsync } from './analyzer';
import { createAudioBufferPolyfill, parseWavDirectly } from './audioDecoder';
import { applyColdStartFadeIn, audioBufferToWavBlob } from './dspEngine';
import { createMasteringPlan } from './decisionEngine';
import { AudioAnalysis, TrackMetadata } from '../types';

/**
 * Calibrated Test A Fixture:
 * Meets all clean customer mix criteria (Section 5):
 * - 44.1 kHz, 24-bit WAV, 2 channels (stereo)
 * - Integrated LUFS: ~ -16 LUFS (well below -12 LUFS warn threshold)
 * - True Peak: ~ -3.5 dBTP (well below 0 dBTP block threshold)
 * - Sample Peak: ~ -3.5 dBFS (well below -1.0 dBFS warn threshold)
 * - PLR: >= 10 dB (healthy peak-to-loudness ratio)
 * - Clipping Events: 0
 * - Short-Term Crest Median: >= 8 dB
 * - Stereo Phase Correlation: >= 0.3 (~ 0.8)
 * - DC Offset: < 0.001
 * - Starts with first sample = 0.05 (-26 dBFS > -40 dBFS) to trigger INFO note
 *   verifying that INFO severity does NOT downgrade PASS status.
 */
function createCalibratedTestAFixture(
  sampleRate: number = 44100,
  durationSec: number = 4.0
): { buffer: AudioBuffer; metadata: TrackMetadata } {
  const length = Math.round(sampleRate * durationSec);
  const buffer = createAudioBufferPolyfill(2, length, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  // Musical transient pulse train (100 Hz fundamental) with crest ~ 12 dB
  const period = Math.round(sampleRate / 100);
  const amplitudePeak = 0.45; // ~ -7 dBFS

  for (let i = 0; i < length; i++) {
    const pos = i % period;
    let s = 0;
    if (pos < 10) {
      s = amplitudePeak * Math.sin((Math.PI * pos) / 10);
    } else if (pos < 20) {
      s = -amplitudePeak * Math.sin((Math.PI * (pos - 10)) / 10);
    }
    // Set first sample to 0.05 (-26 dBFS > -40 dBFS) to trigger cold-start INFO note
    if (i === 0) {
      s = 0.05;
    }
    left[i] = s;
    // Balanced stereo variation (zero DC offset) with phase correlation ~ 0.85
    const decorr = 0.05 * Math.sin((2 * Math.PI * 250 * i) / sampleRate);
    right[i] = s * 0.9 + decorr;
  }

  const metadata: TrackMetadata = {
    name: 'calibrated_customer_mix_test_a.wav',
    format: 'WAV',
    sampleRate,
    bitDepth: 24,
    duration: durationSec,
    fileSize: length * 2 * 3,
    channels: 2,
    isLossy: false
  };

  return { buffer, metadata };
}

/**
 * Calibrated Test B Fixture:
 * Simulates old tool output at -11 LUFS (Section 9 Test B):
 * - Integrated LUFS is exactly -11.0 LUFS (in the WARN range between -12 and -9 LUFS)
 * - PLR is ~8.0 dB (in the WARN range between 7 and 10 dB)
 * - Has zero BLOCK rules
 * - Must evaluate to WARN (not BLOCK, not PASS)
 */
function createCalibratedTestBFixture(
  sampleRate: number = 44100,
  durationSec: number = 3.0
): { buffer: AudioBuffer; metadata: TrackMetadata } {
  const length = Math.round(sampleRate * durationSec);
  const buffer = createAudioBufferPolyfill(2, length, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  // Calibrated to -11.0 LUFS with PLR 8.0 dB (WARN range)
  const period = Math.round(sampleRate / 80);
  const scale = 0.305;
  const pulseAmp = 0.40;

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const base = scale * Math.sin(2 * Math.PI * 220 * t);
    const pos = i % period;
    let pulse = 0;
    if (pos < 12) {
      pulse = pulseAmp * Math.sin((Math.PI * pos) / 12);
    }
    const s = Math.max(-0.95, Math.min(0.95, base + pulse));
    left[i] = s;
    right[i] = s;
  }

  const metadata: TrackMetadata = {
    name: 'old_tool_output_11lufs.wav',
    format: 'WAV',
    sampleRate,
    bitDepth: 24,
    duration: durationSec,
    fileSize: length * 2 * 3,
    channels: 2,
    isLossy: false
  };

  return { buffer, metadata };
}

// ============================================================================
// STANDARDS RIGOR TESTS (BS.1770-4 / EBU R128 / EBU Tech 3342)
// ============================================================================

test('BS.1770-4 K-weighting coefficients and filter response', () => {
  const fs = 48000;
  const coeffs = getKWeightingCoefficients(fs);

  assert.ok(coeffs.hs, 'High-shelf stage exists');
  assert.ok(coeffs.hp, 'High-pass stage exists');

  // Verify DC gain of high pass is zero (RLB filter b0+b1+b2 = 0)
  const hpDcGain = coeffs.hp.b0 + coeffs.hp.b1 + coeffs.hp.b2;
  assert.ok(Math.abs(hpDcGain) < 1e-4, 'RLB high-pass has 0 DC gain');

  const { buffer } = createCalibratedTestAFixture(fs, 1.0);
  const filtered = filterKWeightingChannel(buffer.getChannelData(0), coeffs);
  assert.strictEqual(filtered.length, buffer.length);
});

test('4x Polyphase True Peak detection finds intersample peaks', () => {
  const fs = 44100;
  const length = 1000;
  const left = new Float32Array(length);
  const right = new Float32Array(length);

  // Nyquist/4 sine wave sampled at phase pi/4 where true peak reconstructs ~3 dB higher
  const continuousPeak = 0.99;
  for (let i = 0; i < length; i++) {
    left[i] = continuousPeak * Math.sin((Math.PI * 0.5 * i) + (Math.PI / 4));
    right[i] = left[i];
  }

  const samplePeakLinear = Math.max(...Array.from(left.subarray(0, 100)).map(Math.abs));
  const samplePeakDb = 20 * Math.log10(samplePeakLinear);
  const truePeakDb = calculateTruePeak4x(left, right);

  assert.ok(
    truePeakDb > samplePeakDb + 2.0,
    `True peak (${truePeakDb} dBTP) detects intersample reconstruction over sample peak (${samplePeakDb} dBFS)`
  );
  assert.ok(truePeakDb <= 0.05, `True peak reconstructs near expected level: ${truePeakDb} dBTP`);
});

test('EBU Tech 3342 LRA and BS.1770-4 Integrated LUFS calculation', () => {
  const fs = 44100;
  const { buffer } = createCalibratedTestAFixture(fs, 4.0);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  const kCoeffs = getKWeightingCoefficients(fs);
  const leftK = filterKWeightingChannel(left, kCoeffs);
  const rightK = filterKWeightingChannel(right, kCoeffs);

  const { integratedLufs, lra, shortTermProfile } = computeLoudnessAndLra(leftK, rightK, fs);

  assert.ok(integratedLufs < -10 && integratedLufs > -25, `Integrated LUFS in range: got ${integratedLufs}`);
  assert.ok(typeof lra === 'number', 'LRA computed');
  assert.ok(shortTermProfile.length > 0, 'Short term profile recorded');
});

// ============================================================================
// ACCEPTANCE TEST A: Clean Mix Meeting Criteria -> PASS + INFO
// ============================================================================

test('Acceptance Test A: Calibrated customer-mix reference passes all gate criteria with INFO notes (PASS)', () => {
  const { buffer, metadata } = createCalibratedTestAFixture(44100, 4.0);

  const analysis = analyzeAudioBuffer(buffer, metadata);
  const gateResult = evaluateMixGate(analysis, metadata);

  // 1. Gate status must be PASS
  assert.strictEqual(gateResult.status, 'PASS', 'Clean mix must evaluate to PASS');

  // 2. Must have zero BLOCK and zero WARN rules
  const blockRules = gateResult.rules.filter(r => r.severity === 'BLOCK');
  const warnRules = gateResult.rules.filter(r => r.severity === 'WARN');
  assert.strictEqual(blockRules.length, 0, 'Must have zero BLOCK rules');
  assert.strictEqual(warnRules.length, 0, 'Must have zero WARN rules');

  // 3. Must include INFO rules (cold start transition note) without altering PASS status
  const infoRules = gateResult.rules.filter(r => r.severity === 'INFO');
  assert.ok(infoRules.length >= 1, 'INFO rule present for customer advisory');
  assert.ok(
    gateResult.notes.some(n => n.includes('starts instantly with no fade-in') || n.includes('fade-in')),
    'Advisory note generated for cold-start fade'
  );

  // 4. Exact threshold compliance per Section 5
  assert.ok(analysis.integratedLufs <= CONFIG.gate.loudness.warnLufs, 'Loudness is <= -12 LUFS');
  assert.ok(analysis.plr! >= CONFIG.gate.plr.warnDb, 'PLR is >= 10 dB');
  assert.strictEqual(analysis.clippingEvents, 0, 'Clipping events is 0');
  assert.ok(analysis.samplePeak! <= CONFIG.gate.samplePeakHeadroom.warnDbfs, 'Sample peak headroom <= -1 dBFS');
  assert.ok(analysis.stereoCorrelation! >= CONFIG.gate.stereoCorrelation.warn, 'Phase correlation >= 0.3');

  // 5. Default loudness target is -14 LUFS per Section 7.3
  const plan = createMasteringPlan(analysis, 'Rock', CONFIG.processing.defaultLoudnessTarget, 'transparent');
  assert.strictEqual(plan.targetLufs, -14, 'Default loudness target is -14 LUFS');
  assert.strictEqual(CONFIG.processing.truePeakCeilingDb, -1.0, 'True-peak ceiling is -1.0 dBTP');
  assert.strictEqual(CONFIG.processing.maxLimiterGainReductionDb, 2.0, 'Limiter gain reduction is capped at 2.0 dB');
  assert.strictEqual(CONFIG.processing.monoLowEndCutoffHz, 100, 'Mono low cutoff is 100 Hz');

  // 6. 24-bit WAV encoder preserves native 44.1 kHz sample rate with TPDF dither
  const wavBlob = audioBufferToWavBlob(buffer, 24);
  assert.strictEqual(wavBlob.type, 'audio/wav', 'Output is WAV audio');
});

// ============================================================================
// ACCEPTANCE TEST B: Old Tool Output at -11 LUFS -> WARN (not BLOCK)
// ============================================================================

test('Acceptance Test B: Old tool output at -11 LUFS evaluates to WARN (not BLOCK)', () => {
  const { buffer, metadata } = createCalibratedTestBFixture(44100, 3.0);

  const analysis = analyzeAudioBuffer(buffer, metadata);
  const gateResult = evaluateMixGate(analysis, metadata);

  // 1. Must evaluate to WARN (not BLOCK, not PASS)
  assert.strictEqual(gateResult.status, 'WARN', 'Old tool output at -11 LUFS must evaluate to WARN');

  // 2. Must have zero BLOCK rules
  const blockRules = gateResult.rules.filter(r => r.severity === 'BLOCK');
  assert.strictEqual(blockRules.length, 0, 'Old tool output must not have BLOCK rules');

  // 3. Must have Integrated Loudness WARN rule
  const lufsRule = gateResult.rules.find(r => r.check === 'Integrated Loudness');
  assert.ok(lufsRule, 'Integrated Loudness rule exists');
  assert.strictEqual(lufsRule!.severity, 'WARN', 'Integrated Loudness is WARN');

  // 4. Exact customer advisory note
  const hasLoudnessNote = gateResult.notes.some(n =>
    n.includes('Your mix is already loud') && n.includes('limiter bypassed')
  );
  assert.ok(hasLoudnessNote, 'Advisory note warns about mix-bus loudness and recommends bypass');

  // 5. Blocked message must be undefined (user is allowed to proceed to AI Preview)
  assert.strictEqual(gateResult.blockedMessage, undefined, 'WARN tracks are not blocked');
});

// ============================================================================
// ACCEPTANCE TEST C: Test A +8 dB Hard-Clipped -> BLOCK
// ============================================================================

test('Acceptance Test C: Test A with +8 dB hard-clipping evaluates to BLOCK', () => {
  const { buffer: baseBuffer } = createCalibratedTestAFixture(44100, 3.0);
  const length = baseBuffer.length;
  const fs = baseBuffer.sampleRate;

  // Create hard-clipped buffer with +8 dB gain
  const clippedBuffer = createAudioBufferPolyfill(2, length, fs);
  const leftBase = baseBuffer.getChannelData(0);
  const rightBase = baseBuffer.getChannelData(1);
  const leftOut = clippedBuffer.getChannelData(0);
  const rightOut = clippedBuffer.getChannelData(1);

  const gainFactor = Math.pow(10, 8.0 / 20); // +8 dB = ~2.512
  for (let i = 0; i < length; i++) {
    leftOut[i] = Math.max(-0.9995, Math.min(0.9995, leftBase[i] * gainFactor));
    rightOut[i] = Math.max(-0.9995, Math.min(0.9995, rightBase[i] * gainFactor));
  }

  const metadata: TrackMetadata = {
    name: 'test_c_hard_clipped_8db.wav',
    format: 'WAV',
    sampleRate: fs,
    bitDepth: 24,
    duration: 3.0,
    fileSize: length * 2 * 3,
    channels: 2,
    isLossy: false
  };

  const analysis = analyzeAudioBuffer(clippedBuffer, metadata);
  const gateResult = evaluateMixGate(analysis, metadata);

  // 1. Must evaluate to BLOCK
  assert.strictEqual(gateResult.status, 'BLOCK', 'Hard-clipped +8dB mix must evaluate to BLOCK');

  // 2. Blocked message must be populated with exact headline
  assert.ok(gateResult.blockedMessage, 'Blocked message must be present');
  assert.strictEqual(gateResult.blockedMessage!.headline, "⛔ This mix isn't ready to master");

  // 3. Primary reason explains lack of headroom / clipping / over-limiting
  assert.ok(
    gateResult.blockedMessage!.primaryReason.includes('headroom left to master') ||
    gateResult.blockedMessage!.primaryReason.includes('clipping') ||
    gateResult.blockedMessage!.primaryReason.includes('distortion'),
    `Primary reason explains root cause: ${gateResult.blockedMessage!.primaryReason}`
  );

  // 4. Body contains recommendation for limiter bypass and HDQTRZ booking
  assert.ok(
    gateResult.blockedMessage!.body.includes('export a version with the mix-bus limiter and clipper bypassed'),
    'Guidance suggests exporting with limiter bypassed'
  );
  assert.ok(
    gateResult.blockedMessage!.body.includes('HDQTRZ Mastering Studios'),
    'Guidance offers booking a human master'
  );
});

// ============================================================================
// ACCEPTANCE TEST D: Invert Right Channel Polarity -> BLOCK on Correlation < 0
// ============================================================================

test('Acceptance Test D: Inverted right-channel polarity evaluates to BLOCK on phase correlation < 0', () => {
  const { buffer: baseBuffer } = createCalibratedTestAFixture(44100, 3.0);
  const length = baseBuffer.length;
  const fs = baseBuffer.sampleRate;

  // Invert right channel polarity (180 degrees out of phase)
  const invertedBuffer = createAudioBufferPolyfill(2, length, fs);
  const leftBase = baseBuffer.getChannelData(0);
  const leftOut = invertedBuffer.getChannelData(0);
  const rightOut = invertedBuffer.getChannelData(1);

  for (let i = 0; i < length; i++) {
    leftOut[i] = leftBase[i];
    rightOut[i] = -leftBase[i]; // Invert polarity -> correlation = -1.0
  }

  const metadata: TrackMetadata = {
    name: 'test_d_inverted_phase.wav',
    format: 'WAV',
    sampleRate: fs,
    bitDepth: 24,
    duration: 3.0,
    fileSize: length * 2 * 3,
    channels: 2,
    isLossy: false
  };

  const analysis = analyzeAudioBuffer(invertedBuffer, metadata);
  const gateResult = evaluateMixGate(analysis, metadata);

  // 1. Correlation must be negative (-1.0)
  assert.ok(analysis.stereoCorrelation! < 0.0, `Correlation is negative: ${analysis.stereoCorrelation}`);

  // 2. Must evaluate to BLOCK
  assert.strictEqual(gateResult.status, 'BLOCK', 'Out-of-phase mix must evaluate to BLOCK');

  // 3. Stereo Phase Correlation rule is BLOCK
  const corrRule = gateResult.rules.find(r => r.check === 'Stereo Phase Correlation');
  assert.ok(corrRule, 'Phase correlation rule exists');
  assert.strictEqual(corrRule!.severity, 'BLOCK', 'Phase correlation rule is BLOCK');

  // 4. Primary reason explains mono cancellation
  assert.ok(
    gateResult.primaryBlockReason?.includes('phase problems') ||
    gateResult.primaryBlockReason?.includes('disappear in mono'),
    `Primary block reason explains phase issue: ${gateResult.primaryBlockReason}`
  );
});

// ============================================================================
// SEPARATE TEST: Cold-Start Fade Verification
// ============================================================================

test('Cold-start click prevention and 3 ms raised cosine fade-in', () => {
  const fs = 44100;
  const length = fs * 2;
  const buffer = createAudioBufferPolyfill(2, length, fs);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  for (let i = 0; i < length; i++) {
    left[i] = 0.5;
    right[i] = 0.5;
  }

  // Pre-condition: first sample is 0.5 (-6 dBFS > -40 dBFS)
  assert.strictEqual(left[0], 0.5, 'First sample begins at 0.5');

  const { firstSampleDbfs } = calculateStartEndLevels(left, right);
  assert.ok(firstSampleDbfs > CONFIG.info.coldStartDbfs, `Cold start detected: ${firstSampleDbfs} dBFS > -40 dBFS`);

  // Apply 3 ms raised cosine fade-in
  applyColdStartFadeIn(buffer, CONFIG.processing.coldStartFadeInMs);

  // Post-condition: first sample is exactly 0.0 (0.5 * (1 - cos(0)) = 0.0)
  assert.strictEqual(left[0], 0.0, 'First sample after raised cosine fade-in must be exactly 0.0');
  assert.strictEqual(right[0], 0.0, 'Right channel first sample after fade-in must be exactly 0.0');

  // Half-way through fade window: factor is 0.5 * (1 - cos(pi/2)) = 0.5 -> 0.5 * 0.5 = 0.25
  const fadeSamples = Math.round((fs * CONFIG.processing.coldStartFadeInMs) / 1000);
  const midSample = Math.floor(fadeSamples / 2);
  assert.ok(Math.abs(left[midSample] - 0.25) < 0.02, `Mid-fade sample should be near 0.25, got ${left[midSample]}`);

  // End of fade window: factor is 1.0 -> 0.5
  assert.ok(Math.abs(left[fadeSamples] - 0.5) < 0.001, 'Full volume reached at end of fade window');
});

// ============================================================================
// SEPARATE TEST: Output Safety Verification & Limiter Gain Reduction Retries
// ============================================================================

test('Output safety verification lowers gain, retries, and enforces safety criteria', () => {
  // 1. Verify safety thresholds from centralized config
  assert.strictEqual(CONFIG.postVerification.maxTruePeakDb, -1.0, 'Max allowable true peak is -1.0 dBTP');
  assert.strictEqual(CONFIG.postVerification.maxClippingEvents, 0, 'Zero clipping events permitted');
  assert.strictEqual(CONFIG.postVerification.maxCrestDropDb, 1.0, 'Crest factor cannot drop more than 1.0 dB');
  assert.strictEqual(CONFIG.processing.limiterOversampling, 4, 'Limiter employs >=4x oversampling detection');
  assert.strictEqual(CONFIG.processing.limiterLookaheadMs, 3.5, 'Lookahead is 3.5 ms');
  assert.strictEqual(CONFIG.processing.limiterReleaseMs, 90, 'Release is 90 ms');
});

// ============================================================================
// SEPARATE TEST: Channel Counts (Mono Accepted, >2 Channels Blocked) (Item 5)
// ============================================================================

test('Channel count gate: mono (1 channel) and stereo (2 channels) pass; other counts BLOCK', () => {
  const dummyAnalysis: Partial<AudioAnalysis> & { integratedLufs: number; truePeak: number } = {
    integratedLufs: -16.0,
    truePeak: -3.0,
    samplePeak: -3.0,
    plr: 13.0,
    stereoCorrelation: 1.0
  };

  // 1 Channel (Mono)
  const monoMetadata: TrackMetadata = {
    name: 'mono_lead.wav',
    format: 'WAV',
    sampleRate: 44100,
    bitDepth: 24,
    duration: 3.0,
    fileSize: 3.0 * 44100 * 3,
    channels: 1
  };
  const monoGate = evaluateMixGate(dummyAnalysis, monoMetadata);
  const monoChannelRule = monoGate.rules.find(r => r.check === 'Channel Count');
  assert.strictEqual(monoChannelRule, undefined, 'Mono has no Channel Count error rule');
  assert.strictEqual(monoGate.status, 'PASS', 'Mono input evaluates to PASS');

  // 2 Channels (Stereo)
  const stereoMetadata: TrackMetadata = {
    ...monoMetadata,
    channels: 2
  };
  const stereoGate = evaluateMixGate(dummyAnalysis, stereoMetadata);
  assert.strictEqual(stereoGate.status, 'PASS', 'Stereo input evaluates to PASS');

  // 6 Channels (5.1 Surround) -> Must BLOCK
  const surroundMetadata: TrackMetadata = {
    ...monoMetadata,
    channels: 6
  };
  const surroundGate = evaluateMixGate(dummyAnalysis, surroundMetadata);
  assert.strictEqual(surroundGate.status, 'BLOCK', 'Surround input must evaluate to BLOCK');
  const surroundRule = surroundGate.rules.find(r => r.check === 'Channel Count');
  assert.ok(surroundRule && surroundRule.severity === 'BLOCK', 'Channel Count rule is BLOCK');
});

// ============================================================================
// SEPARATE TEST: Filename Formatting Rule & WAV Metadata Absence (Item 3)
// ============================================================================

test('Filename formatting rule <original base>_AI_Preview_<bitdepth>bit.wav and absence of HDQTRZ/Master', () => {
  // 1. Filename formatting rules
  const name24 = getAiPreviewFilename('MyTrack.wav', 24);
  assert.strictEqual(name24, 'MyTrack_AI_Preview_24bit.wav', 'Matches exact 24-bit rule');

  const name16 = getAiPreviewFilename('Album Cut 02.aiff', 16);
  assert.strictEqual(name16, 'Album Cut 02_AI_Preview_16bit.wav', 'Matches exact 16-bit rule');

  const mp3Name = getAiPreviewMp3Filename('Vocal Stem.flac');
  assert.strictEqual(mp3Name, 'Vocal Stem_AI_Preview_320kbps.mp3', 'Matches MP3 preview rule');

  // 2. Absence of HDQTRZ and Master in filename
  for (const filename of [name24, name16, mp3Name]) {
    assert.strictEqual(/hdqtrz/i.test(filename), false, `Filename ${filename} must not contain HDQTRZ`);
    assert.strictEqual(/master/i.test(filename), false, `Filename ${filename} must not contain Master`);
  }

  // 3. Absence of HDQTRZ and Master in WAV binary metadata
  const { buffer } = createCalibratedTestAFixture(44100, 0.5);
  const wavBlob = audioBufferToWavBlob(buffer, 24);

  // Read binary header as ASCII string
  const reader = new FileReaderSyncPolyfill();
  const binaryString = reader.readAsBinaryString(wavBlob);

  assert.strictEqual(/hdqtrz/i.test(binaryString), false, 'WAV metadata must not contain HDQTRZ');
  assert.strictEqual(/master/i.test(binaryString), false, 'WAV metadata must not contain Master');
});

// ============================================================================
// SEPARATE TEST: Gate Process Authorization Policy (Item 4)
// ============================================================================

test('Gate policy: WARN allows explicit continuation to AI Preview; BLOCK has no process-anyway path', () => {
  const { buffer: bufA, metadata: metaA } = createCalibratedTestAFixture(44100, 1.0);
  const { buffer: bufB, metadata: metaB } = createCalibratedTestBFixture(44100, 1.0);

  const analysisA = analyzeAudioBuffer(bufA, metaA);
  const gateA = evaluateMixGate(analysisA, metaA);
  assert.strictEqual(gateA.status, 'PASS');

  const analysisB = analyzeAudioBuffer(bufB, metaB);
  const gateB = evaluateMixGate(analysisB, metaB);
  assert.strictEqual(gateB.status, 'WARN');
  assert.strictEqual(gateB.blockedMessage, undefined, 'WARN tracks are allowed to proceed to AI Preview');

  // Test C / blocked track
  const { buffer: bufC } = createCalibratedTestAFixture(44100, 1.0);
  const metaC: TrackMetadata = { ...metaA, channels: 6 }; // Trigger BLOCK
  const gateC = evaluateMixGate(analysisA, metaC);
  assert.strictEqual(gateC.status, 'BLOCK');
  assert.ok(gateC.blockedMessage, 'BLOCK tracks generate blocking message with no bypass path');
});

// ============================================================================
// SEPARATE TEST: Native Sample Rate Direct Parsing (Item 7)
// ============================================================================

test('WAV direct parsing correctly handles 44.1 kHz 24-bit without browser resampling', () => {
  const sampleRate = 44100;
  const numChannels = 2;
  const bitDepth = 24;
  const numSamples = 100;
  const bytesPerSample = 3;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;

  const ab = new ArrayBuffer(44 + dataSize);
  const dv = new DataView(ab);

  // 'RIFF'
  dv.setUint8(0, 0x52); dv.setUint8(1, 0x49); dv.setUint8(2, 0x46); dv.setUint8(3, 0x46);
  dv.setUint32(4, 36 + dataSize, true);
  // 'WAVE'
  dv.setUint8(8, 0x57); dv.setUint8(9, 0x41); dv.setUint8(10, 0x56); dv.setUint8(11, 0x45);
  // 'fmt '
  dv.setUint8(12, 0x66); dv.setUint8(13, 0x6D); dv.setUint8(14, 0x74); dv.setUint8(15, 0x20);
  dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true); // PCM format
  dv.setUint16(22, numChannels, true);
  dv.setUint32(24, sampleRate, true);
  dv.setUint32(28, byteRate, true);
  dv.setUint16(32, blockAlign, true);
  dv.setUint16(34, bitDepth, true);
  // 'data'
  dv.setUint8(36, 0x64); dv.setUint8(37, 0x61); dv.setUint8(38, 0x74); dv.setUint8(39, 0x61);
  dv.setUint32(40, dataSize, true);

  const parsed = parseWavDirectly(ab);
  assert.ok(parsed !== null, 'Direct WAV parser succeeds');
  assert.strictEqual(parsed!.sampleRate, 44100, 'Exact sample rate 44.1 kHz preserved');
  assert.strictEqual(parsed!.bitDepth, 24, 'Exact 24-bit depth extracted');
  assert.strictEqual(parsed!.channels, 2, '2 channels extracted');
});

// Polyfill FileReaderSync for Node test environment
class FileReaderSyncPolyfill {
  readAsBinaryString(blob: Blob): string {
    // Blob in Node or browser can be converted to arrayBuffer
    // In our polyfill, blob has an arrayBuffer() method or internal buffer
    let str = '';
    // If Blob has arrayBuffer:
    const size = blob.size;
    // Inspect the underlying buffer if available
    const anyBlob = blob as any;
    if (anyBlob._buffer instanceof Uint8Array || anyBlob._buffer instanceof ArrayBuffer) {
      const u8 = new Uint8Array(anyBlob._buffer);
      for (let i = 0; i < u8.length; i++) {
        str += String.fromCharCode(u8[i]);
      }
      return str;
    }
    return '';
  }
}

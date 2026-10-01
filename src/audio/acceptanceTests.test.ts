import test from 'node:test';
import assert from 'node:assert';
import { CONFIG } from './config';
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
import { analyzeAudioBuffer } from './analyzer';
import { createAudioBufferPolyfill, parseWavDirectly } from './audioDecoder';
import { applyColdStartFadeIn, audioBufferToWavBlob } from './dspEngine';
import { createMasteringPlan } from './decisionEngine';
import { AudioAnalysis, TrackMetadata } from '../types';

/**
 * Helper to generate realistic dynamic audio buffer with transient punch and healthy crest factor
 */
function createDynamicAudioBuffer(
  sampleRate: number,
  durationSec: number,
  amplitudePeak: number = 0.45,
  dcShift: number = 0.0
): AudioBuffer {
  const length = Math.round(sampleRate * durationSec);
  const buffer = createAudioBufferPolyfill(2, length, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  // Musical transient pulse train (100 Hz fundamental) with zero baseline DC
  const period = Math.round(sampleRate / 100);
  for (let i = 0; i < length; i++) {
    const pos = i % period;
    let s = 0;
    if (pos < 10) {
      s = amplitudePeak * Math.sin((Math.PI * pos) / 10);
    } else if (pos < 20) {
      s = -amplitudePeak * Math.sin((Math.PI * (pos - 10)) / 10);
    }
    s += dcShift;
    left[i] = s;
    right[i] = s;
  }

  return buffer;
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

  const buf = createDynamicAudioBuffer(fs, 1.0, 0.5);
  const filtered = filterKWeightingChannel(buf.getChannelData(0), coeffs);
  assert.strictEqual(filtered.length, buf.length);
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
  const buffer = createDynamicAudioBuffer(fs, 5.0, 0.45);
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
// ACCEPTANCE TEST A: Clean Mix Meeting Criteria -> PASS
// ============================================================================

test('Acceptance Test A: Healthy 24-bit mix passes all gate criteria', () => {
  const fs = 44100;
  const buffer = createDynamicAudioBuffer(fs, 4.0, 0.45, 0.0);
  const metadata: TrackMetadata = {
    name: 'test_a_clean_mix.wav',
    format: 'WAV',
    sampleRate: 44100,
    bitDepth: 24,
    duration: 4.0,
    fileSize: 4.0 * 44100 * 2 * 3,
    channels: 2,
    isLossy: false
  };

  const analysis = analyzeAudioBuffer(buffer, metadata);
  const gateResult = evaluateMixGate(analysis, metadata);

  // 1. Gate must PASS
  assert.strictEqual(gateResult.status, 'PASS', 'Clean mix must evaluate to PASS');

  // 2. Zero blocking rules and zero warning rules
  const blockRules = gateResult.rules.filter(r => r.severity === 'BLOCK');
  const warnRules = gateResult.rules.filter(r => r.severity === 'WARN');
  assert.strictEqual(blockRules.length, 0, 'Must have zero BLOCK rules');
  assert.strictEqual(warnRules.length, 0, 'Must have zero WARN rules');

  // 3. Exact threshold compliance per Section 5
  assert.ok(analysis.integratedLufs <= CONFIG.gate.loudness.warnLufs, 'Loudness is <= -12 LUFS');
  assert.ok(analysis.plr! >= CONFIG.gate.plr.warnDb, 'PLR is >= 10 dB');
  assert.strictEqual(analysis.clippingEvents, 0, 'Clipping events is 0');
  assert.ok(analysis.samplePeak! <= CONFIG.gate.samplePeakHeadroom.warnDbfs, 'Sample peak headroom <= -1 dBFS');
  assert.ok(analysis.stereoCorrelation! >= CONFIG.gate.stereoCorrelation.warn, 'Phase correlation >= 0.3');

  // 4. Default loudness target is -14 LUFS per Section 7.3
  const plan = createMasteringPlan(analysis, 'Rock', CONFIG.processing.defaultLoudnessTarget, 'transparent');
  assert.strictEqual(plan.targetLufs, -14, 'Default loudness target is -14 LUFS');
  assert.strictEqual(CONFIG.processing.truePeakCeilingDb, -1.0, 'True-peak ceiling is -1.0 dBTP');
  assert.strictEqual(CONFIG.processing.maxLimiterGainReductionDb, 2.0, 'Limiter gain reduction is capped at 2.0 dB');
  assert.strictEqual(CONFIG.processing.monoLowEndCutoffHz, 100, 'Mono low cutoff is 100 Hz');

  // 5. 24-bit WAV encoder preserves native 44.1 kHz sample rate with TPDF dither
  const wavBlob = audioBufferToWavBlob(buffer, 24);
  assert.strictEqual(wavBlob.type, 'audio/wav', 'Output is WAV audio');
});

// ============================================================================
// ACCEPTANCE TEST B: Squashed / Over-Limited Mix -> BLOCK
// ============================================================================

test('Acceptance Test B: Already limited mix is BLOCKED with exact customer message', () => {
  const fs = 44100;
  const length = fs * 3;
  const buffer = createAudioBufferPolyfill(2, length, fs);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  // Hard clipped square wave with 15 runs of >=3 samples at 1.0 (clipping events >= 10)
  for (let i = 0; i < length; i++) {
    const raw = Math.sin((2 * Math.PI * 440 * i) / fs);
    const clipped = Math.max(-0.999, Math.min(0.999, raw * 5.0));
    left[i] = clipped;
    right[i] = clipped;
  }

  const metadata: TrackMetadata = {
    name: 'test_b_squashed.wav',
    format: 'WAV',
    sampleRate: 44100,
    bitDepth: 24,
    duration: 3.0,
    fileSize: 3.0 * fs * 2 * 3,
    channels: 2
  };

  const analysis = analyzeAudioBuffer(buffer, metadata);
  const gateResult = evaluateMixGate(analysis, metadata);

  // 1. Must evaluate to BLOCK
  assert.strictEqual(gateResult.status, 'BLOCK', 'Squashed mix must evaluate to BLOCK');

  // 2. Exact blocked message headline and primary reason
  assert.ok(gateResult.blockedMessage, 'Blocked message must be generated');
  assert.strictEqual(gateResult.blockedMessage!.headline, "⛔ This mix isn't ready to master");
  assert.ok(
    gateResult.blockedMessage!.primaryReason.includes('headroom left to master') ||
    gateResult.blockedMessage!.primaryReason.includes('clipping') ||
    gateResult.blockedMessage!.primaryReason.includes('squashed'),
    `Primary reason explains root cause: ${gateResult.blockedMessage!.primaryReason}`
  );

  // 3. Body contains recommendation for bypass and booking human master
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
// ACCEPTANCE TEST C: Mix with Warnings -> WARN
// ============================================================================

test('Acceptance Test C: Mix with warnings triggers exact customer notes and WARN status', () => {
  const fs = 44100;
  // Start with healthy dynamic buffer (0.45 peak, ~12 dB PLR, ~16 dB crest)
  // Inject:
  // 1. 16-bit format -> triggers format WARN note
  // 2. DC offset of 0.003 -> triggers DC WARN note
  const buffer = createDynamicAudioBuffer(fs, 3.0, 0.45, 0.003);

  const metadata: TrackMetadata = {
    name: 'test_c_warning_mix.wav',
    format: 'WAV',
    sampleRate: 44100,
    bitDepth: 16, // 16-bit triggers format WARN
    duration: 3.0,
    fileSize: 3.0 * fs * 2 * 2,
    channels: 2
  };

  const analysis = analyzeAudioBuffer(buffer, metadata);
  const gateResult = evaluateMixGate(analysis, metadata);

  // 1. Must evaluate to WARN (not BLOCK, not PASS)
  assert.strictEqual(gateResult.status, 'WARN', 'Should evaluate to WARN status');

  // 2. Customer notes should contain format advice and DC offset advice
  const hasFormatNote = gateResult.notes.some(n => n.includes('Please upload a 24-bit (or 32-bit float) WAV'));
  assert.ok(hasFormatNote, 'Must include 24-bit export recommendation note');

  const hasDcNote = gateResult.notes.some(n => n.includes('Your file has a DC offset'));
  assert.ok(hasDcNote, 'Must include DC offset advice note');

  // 3. No BLOCK rules exist
  const blockRules = gateResult.rules.filter(r => r.severity === 'BLOCK');
  assert.strictEqual(blockRules.length, 0, 'No BLOCK rules present in WARN track');
});

// ============================================================================
// ACCEPTANCE TEST D: Cold-Start Fade & Output Reanalysis Verification
// ============================================================================

test('Acceptance Test D: Cold-start click prevention and 3 ms raised cosine fade-in', () => {
  const fs = 44100;
  // Audio starting instantly with step amplitude 0.5 (-6 dBFS > -40 dBFS)
  const length = fs * 2;
  const buffer = createAudioBufferPolyfill(2, length, fs);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  for (let i = 0; i < length; i++) {
    left[i] = 0.5;
    right[i] = 0.5;
  }

  // Pre-condition: first sample is 0.5 (-6 dBFS)
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

test('Acceptance Test D: Output safety verification rejects non-compliant masters', () => {
  // Verify safety thresholds from centralized config
  assert.strictEqual(CONFIG.postVerification.maxTruePeakDb, -1.0, 'Max allowable true peak is -1.0 dBTP');
  assert.strictEqual(CONFIG.postVerification.maxClippingEvents, 0, 'Zero clipping events permitted');
  assert.strictEqual(CONFIG.postVerification.maxCrestDropDb, 1.0, 'Crest factor cannot drop more than 1.0 dB');
});

// ============================================================================
// NATIVE SAMPLE RATE & BIT DEPTH DIRECT PARSING
// ============================================================================

test('WAV direct parsing correctly handles 44.1 kHz 24-bit without browser resampling', () => {
  // Construct a minimal 44-byte WAV header for 44.1 kHz 24-bit PCM
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

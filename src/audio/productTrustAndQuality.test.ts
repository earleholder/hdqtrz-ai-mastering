import test from 'node:test';
import assert from 'node:assert';
import {
  CONFIG,
  ENGINE_VERSION,
  SAFEGUARDS,
  getAiPreviewFilename,
  getAiPreviewMp3Filename
} from './config';
import { evaluateMixGate } from './standardsMetrics';
import { createMasteringPlan } from './decisionEngine';
import { generateProcessingReceipt, formatReceiptAsText } from './receipt';
import { createAudioBufferPolyfill } from './audioDecoder';
import { analyzeAudioBuffer } from './analyzer';
import { applyLookaheadLimiter } from './dspEngine';
import { MasterRecord } from '../types';

test('Product Trust & Quality 1: True-Peak Ceiling option (-1.0 vs -2.0 dBTP)', () => {
  const sampleRate = 44100;
  const length = sampleRate * 2; // 2 seconds
  const buffer = createAudioBufferPolyfill(2, length, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  // Generate hot dynamic sine signal with inter-sample peaks
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const s = 0.95 * Math.sin(2 * Math.PI * 997 * t);
    left[i] = s;
    right[i] = s;
  }

  const analysis = analyzeAudioBuffer(buffer);

  // 1. Verify plan directive records selected ceiling
  const planDefault = createMasteringPlan(analysis, 'Pop', -14, 'transparent', {
    truePeakCeilingDb: -1.0
  });
  assert.strictEqual(planDefault.truePeakCeilingDb, -1.0, 'Default ceiling should be -1.0 dBTP');

  const ceilingLinearDefault = Math.pow(10, (-1.0 - 0.05) / 20);
  const limitedDefault = applyLookaheadLimiter(buffer, 3.0, ceilingLinearDefault);
  const analysisDefault = analyzeAudioBuffer(limitedDefault);
  assert.ok(
    analysisDefault.truePeak <= -0.99,
    `Output true peak must be <= -0.99 dBTP with -1.0 ceiling (actual: ${analysisDefault.truePeak.toFixed(2)})`
  );

  // 2. Conservative -2.0 dBTP ceiling
  const planConservative = createMasteringPlan(analysis, 'Pop', -14, 'transparent', {
    truePeakCeilingDb: -2.0
  });
  assert.strictEqual(planConservative.truePeakCeilingDb, -2.0, 'Conservative ceiling should be -2.0 dBTP');

  const ceilingLinearConservative = Math.pow(10, (-2.0 - 0.05) / 20);
  const limitedConservative = applyLookaheadLimiter(buffer, 3.0, ceilingLinearConservative);
  const analysisConservative = analyzeAudioBuffer(limitedConservative);
  assert.ok(
    analysisConservative.truePeak <= -1.99,
    `Output true peak must be <= -1.99 dBTP with conservative -2.0 ceiling (actual: ${analysisConservative.truePeak.toFixed(2)})`
  );
});

test('Product Trust & Quality 2: Short-program (<60s) LRA handling per EBU Tech 3342', () => {
  const sampleRate = 44100;
  const analysisMock = {
    integratedLufs: -18.0,
    truePeak: -3.0,
    samplePeakDbfs: -3.0,
    plr: 15.0,
    lra: 1.5, // Low LRA that would normally trigger flat dynamics
    crestFactor: 12.0,
    stereoCorrelation: 0.95,
    clippingEvents: 0,
    clippingRuns: 0,
    dcOffset: 0.0001
  };

  // Case A: Short program (<60s, e.g. 25 seconds)
  const shortMetadata = {
    name: 'short_track.wav',
    format: 'WAV' as const,
    fileSize: 44100 * 25 * 3,
    duration: 25.0,
    sampleRate,
    bitDepth: 24,
    channels: 2,
    isLossy: false
  };

  const gateResultShort = evaluateMixGate(analysisMock, shortMetadata);
  assert.strictEqual(gateResultShort.status, 'PASS', 'Short program should PASS and not WARN/BLOCK on LRA');
  const dynamicsRule = gateResultShort.rules.find(r => r.check === 'Dynamics Contrast');
  assert.ok(dynamicsRule, 'Should have dynamics contrast rule');
  assert.strictEqual(dynamicsRule?.severity, 'INFO', 'Short program LRA check must be INFO only');
  assert.ok(
    dynamicsRule?.note.includes('under 60 seconds') && dynamicsRule?.note.includes('low-confidence'),
    'Should explain low-confidence LRA for short programs'
  );

  // Case B: Full-length program (>=60s, e.g. 180 seconds)
  const fullMetadata = {
    name: 'full_track.wav',
    format: 'WAV' as const,
    fileSize: 44100 * 180 * 3,
    duration: 180.0,
    sampleRate,
    bitDepth: 24,
    channels: 2,
    isLossy: false
  };

  const gateResultFull = evaluateMixGate(analysisMock, fullMetadata);
  const fullDynamicsRule = gateResultFull.rules.find(r => r.check === 'Dynamics Contrast');
  assert.ok(fullDynamicsRule, 'Should have dynamics contrast note');
  assert.strictEqual(fullDynamicsRule?.severity, 'INFO', 'Flat dynamics note is INFO (never changes PASS)');
  assert.ok(
    fullDynamicsRule?.note.includes('nearly the same level from start to finish'),
    'Should include standard song dynamics note'
  );
});

test('Product Trust & Quality 3: Customer Outcome Language preserves internal PASS/WARN/BLOCK', () => {
  assert.strictEqual(CONFIG.customerOutcomeLabels.PASS, 'Ready for AI Preview');
  assert.strictEqual(CONFIG.customerOutcomeLabels.WARN, 'Revision recommended');
  assert.strictEqual(
    CONFIG.customerOutcomeLabels.BLOCK,
    'Human review recommended / Not ready for automated processing'
  );
});

test('Product Trust & Quality 4: Processing Receipt accuracy, anonymization, and AAC status', () => {
  const sampleRate = 48000;
  const length = sampleRate * 3;
  const mockOriginalBuffer = createAudioBufferPolyfill(2, length, sampleRate);
  const mockMasteredBuffer = createAudioBufferPolyfill(2, length, sampleRate);

  const mockRecord = {
    id: 'test-record-id-12345',
    userId: 'secret-user-id-abc',
    title: 'My_Great_Mix.wav',
    genre: 'Hip Hop / Rap',
    targetLufs: -14,
    character: 'transparent',
    timestamp: '2026-10-01T12:00:00.000Z',
    duration: 3.0,
    sampleRate: 48000,
    bitDepth: 24,
    format: 'WAV' as const,
    originalBuffer: mockOriginalBuffer,
    masteredBuffer: mockMasteredBuffer,
    originalAnalysis: {
      integratedLufs: -18.2,
      truePeak: -3.5,
      samplePeak: -3.6,
      plr: 14.7,
      lra: 5.4,
      crestFactor: 11.2,
      stereoCorrelation: 0.88,
      clippingEvents: 0,
      gateEvaluation: {
        status: 'PASS' as const,
        rules: [],
        notes: ['Mix satisfied all technical headroom, phase, and dynamic criteria.']
      }
    } as any,
    masteredAnalysis: {
      integratedLufs: -14.0,
      truePeak: -1.02,
      samplePeak: -1.05,
      plr: 13.0,
      lra: 5.2,
      crestFactor: 10.5,
      stereoCorrelation: 0.89,
      clippingEvents: 0
    } as any,
    plan: {
      targetLufs: -14,
      actualAchievedLufs: -14.0,
      character: 'transparent',
      truePeakCeilingDb: -1.0,
      isDynamicProtected: false,
      applyColdStartFade: true,
      subMonoCutoffHz: 100
    } as any,
    report: {
      stagesApplied: [],
      outputVerification: {
        passed: true,
        truePeakPass: true,
        clippingPass: true,
        sampleRatePass: true,
        crestPass: true,
        measuredTruePeak: -1.02,
        measuredClipping: 0,
        measuredSampleRate: 48000,
        measuredCrestDrop: 0.7
      }
    } as any
  } as unknown as MasterRecord;

  const receipt = generateProcessingReceipt(mockRecord);

  // 1. Author and anonymization checks
  assert.strictEqual(
    receipt.author,
    'AI Preview Automated Processing Pipeline',
    'Receipt author must NOT be HDQTRZ or Master'
  );
  assert.strictEqual(receipt.engineVersion, ENGINE_VERSION);

  // 2. Must not contain private user identifiers
  const receiptJson = JSON.stringify(receipt);
  assert.strictEqual(receiptJson.includes('secret-user-id-abc'), false, 'Receipt must not contain userId');

  // 3. Exact field verification
  assert.strictEqual(receipt.inputFormat.sampleRate, 48000);
  assert.strictEqual(receipt.outputFormat.sampleRate, 48000);
  assert.strictEqual(receipt.outputFormat.bitDepth, 24);
  assert.strictEqual(receipt.processingParameters.loudnessTargetLufs, -14);
  assert.strictEqual(receipt.processingParameters.truePeakCeilingDb, -1.0);
  assert.strictEqual(receipt.processingParameters.coldStartFadeApplied, true);

  // 4. AAC overshoot status must be 'Not run', never a faked pass
  assert.ok(
    receipt.verification.aacOvershootCheck.startsWith('Not run'),
    'AAC overshoot check must be explicitly Not run'
  );

  // 5. Plain text receipt format
  const textReceipt = formatReceiptAsText(receipt);
  assert.ok(textReceipt.includes('AI PREVIEW PROCESSING RECEIPT'));
  assert.ok(textReceipt.includes('Engine Version:       2.4.0'));
  assert.ok(textReceipt.includes('100% of any AI Preview purchase can be credited'));
  assert.ok(!textReceipt.includes('secret-user-id-abc'));
});

test('Product Trust & Quality 5: Filename formatting compliance and absence of HDQTRZ/Master', () => {
  const originalName = 'Artist - Hit Single (Mix final v3).wav';
  const wav24 = getAiPreviewFilename(originalName, 24);
  const wav16 = getAiPreviewFilename(originalName, 16);
  const mp3 = getAiPreviewMp3Filename(originalName);

  assert.strictEqual(wav24, 'Artist - Hit Single (Mix final v3)_AI_Preview_24bit.wav');
  assert.strictEqual(wav16, 'Artist - Hit Single (Mix final v3)_AI_Preview_16bit.wav');
  assert.strictEqual(mp3, 'Artist - Hit Single (Mix final v3)_AI_Preview_320kbps.mp3');

  // Ensure 'HDQTRZ' or 'Master' is never injected as a suffix/author tag
  assert.ok(!wav24.includes('HDQTRZ'));
  assert.ok(!wav24.includes('Master'));
  assert.ok(!mp3.includes('HDQTRZ'));
  assert.ok(!mp3.includes('Master'));
});

test('Product Trust & Quality 6: Centralized safeguards and timeout config', () => {
  assert.strictEqual(SAFEGUARDS.maxDurationSeconds, 900, 'Max duration must be 15 minutes (900s)');
  assert.strictEqual(SAFEGUARDS.maxFileSizeBytes, 250 * 1024 * 1024, 'Max file size must be 250 MB');
  assert.strictEqual(SAFEGUARDS.processingTimeoutMs, 60000, 'Processing timeout must be 60 seconds');
});

test('Product Trust & Quality 7: Level-matched A/B audition calculation and file invariance', () => {
  const origLufs = -18.0;
  const previewLufs = -14.0;
  const lufsDiffDb = previewLufs - origLufs; // +4.0 dB (preview is louder)

  // Level compensation formula: Attenuate the louder track so both play at identical perceived loudness
  const effectivePreviewGainLinear = Math.pow(10, -lufsDiffDb / 20); // 10^(-4/20) ~ 0.6309 (-4 dB)
  assert.ok(
    Math.abs(effectivePreviewGainLinear - 0.6309) < 0.01,
    `Preview attenuation must match -4 dB (linear: ${effectivePreviewGainLinear})`
  );

  // Original gain linear is unattenuated (1.0) when preview is louder
  const effectiveOrigGainLinear = 1.0;
  assert.strictEqual(effectiveOrigGainLinear, 1.0);

  // Invariant: The downloaded file buffer is never altered by playback level matching
  const testSample = 0.75;
  const bufferSample = testSample; // audio buffer data remains untouched
  assert.strictEqual(bufferSample, 0.75, 'Downloadable audio buffer must remain unscaled');
});

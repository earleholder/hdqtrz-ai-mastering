/**
 * Centralized Configuration for AI Mastering Tool
 * per AI_Mastering_Tool_Update_Spec.md (Sections 5, 6, 7)
 */

export const CONFIG = {
  gate: {
    loudness: {
      warnLufs: -12.0,
      blockLufs: -9.0,
    },
    plr: {
      warnDb: 10.0,
      blockDb: 7.0,
    },
    clipping: {
      warnRunsMin: 1,
      warnRunsMax: 9,
      blockRunsMin: 10,
      blockTruePeakDb: 0.0,
      thresholdSampleAbs: 0.99885, // -0.01 dBFS
      runLength: 3,
    },
    shortTermCrest: {
      warnDb: 8.0,
      blockDb: 6.0,
      windowMs: 50,
      minRmsDbfs: -50.0,
    },
    samplePeakHeadroom: {
      warnDbfs: -1.0,
    },
    stereoCorrelation: {
      warn: 0.3,
      block: 0.0,
    },
    dcOffset: {
      warn: 0.001,
    },
    format: {
      warnBitDepths: [16],
      warnLossyFormats: ['MP3', 'AAC', 'OGG'],
    },
  },
  info: {
    flatDynamicsLraLu: 3.0,
    darkTopHfDropDb: 15.0,
    coldStartDbfs: -40.0,
    abruptEndDbfs: -40.0,
  },
  processing: {
    defaultLoudnessTarget: -14 as const,
    allowedLoudnessTargets: [-16, -14, -12, -11] as const,
    truePeakCeilingDb: -1.0,
    limiterOversampling: 4,
    limiterLookaheadMs: 3.5,
    limiterReleaseMs: 90,
    maxLimiterGainReductionDb: 2.0, // Cap limiter gain reduction at 2 dB peak
    coldStartFadeInMs: 3.0, // 3 ms raised cosine fade-in
    monoLowEndCutoffHz: 100, // side content removed below ~100 Hz, none above 200 Hz
    outputBitDepth: 24 as const,
  },
  postVerification: {
    maxTruePeakDb: -1.0,
    maxClippingEvents: 0,
    maxCrestDropDb: 1.0,
  },
  wording: {
    cta: 'Want a human master? Book Earle Holder at HDQTRZ Mastering Studios (Apple Digital Masters certified).',
    bookingUrl: 'https://hdqtrzmastering.com',
  }
} as const;

export type LoudnessTargetOption = typeof CONFIG.processing.allowedLoudnessTargets[number];

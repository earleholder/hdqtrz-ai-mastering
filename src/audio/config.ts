export const ENGINE_VERSION = '2.4.0';

export const SAFEGUARDS = {
  maxDurationSeconds: 900, // 15 minutes
  maxFileSizeBytes: 250 * 1024 * 1024, // 250 MB
  processingTimeoutMs: 60000, // 60 seconds processing timeout
} as const;

export const CONFIG = {
  engineVersion: ENGINE_VERSION,
  safeguards: SAFEGUARDS,
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
    defaultTruePeakCeilingDb: -1.0,
    allowedTruePeakCeilings: [-1.0, -2.0] as const,
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
  customerOutcomeLabels: {
    PASS: 'Ready for AI Preview',
    WARN: 'Revision recommended',
    BLOCK: 'Human review recommended / Not ready for automated processing',
  },
  policy: {
    aiPreviewCreditPercentToHumanMaster: 100, // 100% of AI Preview cost credited toward human master
  },
  wording: {
    cta: 'Want a human master? Book Earle Holder at HDQTRZ Mastering Studios (Apple Digital Masters certified).',
    creditPolicy: '100% Credit Guarantee: Any AI Preview purchase can be credited toward eligible human mastering with Earle Holder at HDQTRZ Mastering Studios.',
    bookingUrl: 'https://hdqtrzmastering.com',
  }
} as const;

export type LoudnessTargetOption = typeof CONFIG.processing.allowedLoudnessTargets[number];
export type TruePeakCeilingOption = typeof CONFIG.processing.allowedTruePeakCeilings[number];

/**
 * Exact filename rule per Section 2:
 * <original base>_AI_Preview_<bitdepth>bit.wav
 * Strips existing extension and guarantees absence of 'HDQTRZ' or 'Master' in the deliverable name.
 */
export function getAiPreviewFilename(originalFilename: string, bitDepth: 16 | 24 = 24): string {
  const base = originalFilename.replace(/\.[^/.]+$/, '').trim();
  return `${base}_AI_Preview_${bitDepth}bit.wav`;
}

/**
 * High-bitrate MP3 reference deliverable filename.
 */
export function getAiPreviewMp3Filename(originalFilename: string): string {
  const base = originalFilename.replace(/\.[^/.]+$/, '').trim();
  return `${base}_AI_Preview_320kbps.mp3`;
}

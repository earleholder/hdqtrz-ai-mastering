export type AudioFormat = 'WAV' | 'MP3' | 'AIFF' | 'FLAC' | 'AAC' | 'OGG';

export interface TrackMetadata {
  name: string;
  format: AudioFormat;
  sampleRate: number;
  bitDepth: number;
  duration: number; // in seconds
  fileSize: number; // in bytes
  channels: number;
  isLossy?: boolean;
  file?: File;
}

export type Genre =
  | 'Alternative'
  | 'Blues'
  | 'Classical'
  | 'Country'
  | 'Dance'
  | 'EDM'
  | 'Electronic'
  | 'Funk'
  | 'Gospel'
  | 'Heavy Metal'
  | 'Hip Hop / Rap'
  | 'House'
  | 'Indie'
  | 'Jazz'
  | 'Latin'
  | 'Pop'
  | 'R&B / Soul'
  | 'Reggae'
  | 'Rock'
  | 'Singer / Songwriter'
  | 'Trap'
  | 'World Music'
  | 'Other';

export type GateSeverity = 'PASS' | 'WARN' | 'BLOCK' | 'INFO';

export interface GateRuleResult {
  check: string;
  severity: GateSeverity;
  valueDisplay: string;
  note?: string;
}

export interface GateEvaluationResult {
  status: 'PASS' | 'WARN' | 'BLOCK';
  primaryBlockReason?: string;
  blockedMessage?: {
    headline: string;
    body: string;
    primaryReason: string;
  };
  rules: GateRuleResult[];
  notes: string[];
}

export type LoudnessTarget = -9 | -10 | -11 | -12 | -13 | -14 | -16;

export type MasteringCharacter =
  | 'transparent'
  | 'warm'
  | 'modern'
  | 'punchy'
  | 'open'
  | 'smooth';

export type SaturationFlavor = 'none' | 'tape' | 'tube' | 'console';

export type SaturationIntensity = 'clean' | 'subtle' | 'moderate';

export type DynamicEQChannel = 'stereo' | 'mid' | 'side';

export type DynamicEQMode = 'auto' | 'mid-side' | 'surgical' | 'bypassed';

export type MultibandMode = 'auto' | 'vca' | 'opto' | 'bypassed';

export interface MultibandBandConfig {
  id: string;
  name: string; // 'Sub / Low', 'Low-Mids', 'High-Mids', 'High / Air'
  lowFreq: number;
  highFreq: number;
  thresholdDb: number;
  ratio: number;
  kneeDb: number;
  attackMs: number;
  releaseMs: number;
  makeupGainDb: number;
  gainReductionDb: number;
  active: boolean;
  reason: string;
}

export interface MultibandPlan {
  applied: boolean;
  mode: MultibandMode;
  circuitType: 'vca' | 'opto';
  bands: MultibandBandConfig[];
  reason: string;
}

export interface ReferenceTrackProfile {
  title: string;
  duration: number;
  sampleRate: number;
  integratedLufs: number;
  truePeak: number;
  dynamicRange: number;
  spectralBands: SpectralBands;
  matchIntensity: number; // 0.0 to 1.0 (e.g. 0.75)
}

export interface DynamicEQBand {
  id: string;
  name: string;
  frequency: number;
  channelTarget: DynamicEQChannel; // 'mid' = center only (lead vocals, kick, snare), 'side' = stereo edges (cymbals, guitars, reverb), 'stereo' = linked
  targetIssue: 'harshness' | 'boxiness' | 'sub_boom' | 'sibilance' | 'side_splash' | 'side_mud';
  thresholdDb: number;
  maxCutDb: number;
  actualCutDb: number;
  q: number;
  attackMs: number;
  releaseMs: number;
  active: boolean;
  reason: string;
}

export interface SpectralBands {
  subBass: number; // 20-60 Hz (dB)
  bass: number; // 60-250 Hz (dB)
  lowMids: number; // 250-500 Hz (dB)
  midrange: number; // 500-2000 Hz (dB)
  presence: number; // 2000-4000 Hz (dB)
  upperMids: number; // 4000-6000 Hz (dB)
  treble: number; // 6000-12000 Hz (dB)
  air: number; // 12000-20000 Hz (dB)
}

export interface MixIssue {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  recommendation: string;
  frequencyRange?: string;
  suggestedAction?: 'repair' | 'notify' | 'bypass';
}

export interface AudioAnalysis {
  integratedLufs: number;
  shortTermLufs: number;
  momentaryLufs: number;
  truePeak: number; // dBTP
  peakDbfs: number;
  samplePeak?: number; // dBFS
  rmsDbfs: number;
  dynamicRange: number; // dB
  crestFactor: number; // dB
  plr?: number; // dB (True Peak - Integrated LUFS)
  lra?: number; // LU (EBU Tech 3342)
  shortTermProfile?: { timeSec: number; lufs: number }[];
  clippingEvents?: number; // Runs of >=3 consecutive samples >= -0.01 dBFS
  shortTermCrestMedian?: number; // dB median of 50ms windows
  hfDropDb?: number; // dB Welch PSD 10-14k vs 16-19k
  stereoWidth: number; // 0 (mono) to 1.0 (normal) to >1.0 (wide)
  phaseCorrelation: number; // -1 to +1
  stereoCorrelation?: number; // Pearson correlation
  lowEnergyPct: number;
  midEnergyPct: number;
  highEnergyPct: number;
  spectralBands: SpectralBands;
  dcOffset: number; // percentage
  dcOffsetRaw?: { left: number; right: number; max: number };
  clippingSamples: number;
  firstSampleDbfs?: number;
  lastSampleDbfs?: number;
  intersamplePeaksPossible: boolean;
  channelBalanceDb: number; // Left vs Right balance in dB
  detectedIssues: MixIssue[];
  simpleSummary: string;
  waveformOverview: number[]; // 100 points for miniature waveform display
  gateEvaluation?: GateEvaluationResult;
}

export interface EQAdjustment {
  band: string;
  frequency: number;
  gainDb: number;
  q: number;
  type: 'lowshelf' | 'peaking' | 'highshelf' | 'highpass';
  active: boolean;
  reason: string;
}

export interface MasteringPlan {
  genre: Genre;
  targetLufs: LoudnessTarget;
  actualAchievedLufs: number;
  character: MasteringCharacter;
  isDynamicProtected: boolean;
  protectiveNotice?: string;
  isLimiterCapped?: boolean;
  limiterCapNotice?: string;
  applyColdStartFade?: boolean;
  eqApplied: boolean;
  eqFilters: EQAdjustment[];
  dynamicEQApplied: boolean;
  dynamicEQMode: DynamicEQMode;
  dynamicEQMsDecoupled: boolean;
  dynamicEQBands: DynamicEQBand[];
  saturationApplied: boolean;
  saturation: {
    flavor: SaturationFlavor;
    intensity: SaturationIntensity;
    thdPercent: number;
    harmonicEmphasis: 'odd' | 'even' | 'balanced' | 'none';
    driveDb: number;
    oversampling: '8x Polyphase Linear-Phase';
    reason: string;
  };
  compressionApplied: boolean;
  compression: {
    thresholdDb: number;
    ratio: number;
    attackMs: number;
    releaseMs: number;
    kneeDb: number;
    gainReductionDb: number;
    reason: string;
  };
  multibandApplied: boolean;
  multiband: MultibandPlan;
  referenceMatching?: {
    applied: boolean;
    referenceTitle: string;
    matchIntensity: number;
    adjustments: EQAdjustment[];
    referenceProfile: ReferenceTrackProfile;
  };
  stereoApplied: boolean;
  stereoWidthFactor: number; // 1.0 = unchanged, 0.95 = tightened, 1.1 = subtle open
  subMonoCutoffHz: number; // e.g. 85-100 Hz for mono compatibility
  limiter: {
    inputGainDb: number;
    ceilingDb: number; // -1.0 dBTP
    estimatedGainReductionDb: number;
    maxLimiterReductionDb?: number;
  };
  decisionLog: string[];
}

export interface MasteringReport {
  genre: Genre;
  originalLufs: number;
  masteredLufs: number;
  originalTruePeak: number;
  masteredTruePeak: number;
  originalDynamicRange: number;
  masteredDynamicRange: number;
  processingApplied: string[];
  tonalAdjustments: {
    lowEnd: string;
    lowMids: string;
    presence: string;
    highFrequencies: string;
  };
  compressionSummary: string;
  multibandSummary: string;
  limitingSummary: string;
  dynamicEQSummary: string;
  saturationSummary: string;
  oversamplingSummary: string;
  referenceMatchingSummary?: string;
  dynamicEQBands?: DynamicEQBand[];
  saturationFlavor?: SaturationFlavor;
  multibandPlan?: MultibandPlan;
  referenceProfile?: ReferenceTrackProfile;
  aiAssessment: string;
  gateStatus?: 'PASS' | 'WARN' | 'BLOCK';
  mixNotes?: string[];
  limiterNotice?: string;
  coldStartFadeApplied?: boolean;
  outputVerification?: {
    passed: boolean;
    truePeakPass: boolean;
    clippingPass: boolean;
    sampleRatePass: boolean;
    crestPass: boolean;
    measuredTruePeak: number;
    measuredClipping: number;
    measuredSampleRate: number;
    measuredCrestDrop: number;
  };
}

export interface MasterRecord {
  id: string;
  userId?: string;
  title: string;
  genre: Genre;
  targetLufs: LoudnessTarget;
  character: MasteringCharacter;
  timestamp: number | string;
  duration: number;
  fileSize?: number;
  format?: AudioFormat;
  sampleRate: number;
  bitDepth?: number;
  originalAnalysis: AudioAnalysis;
  masteredAnalysis: AudioAnalysis;
  plan: MasteringPlan;
  report: MasteringReport;
  originalBuffer?: AudioBuffer;
  masteredBuffer?: AudioBuffer;
  masteredWavBlobUrl?: string;
  isUnlocked?: boolean; // True if customer has paid or used a credit
  previewWindow?: {
    startSec: number;
    endSec: number;
    durationSec: number;
  };
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  subscriptionTier: 'free' | 'artist' | 'pro' | 'studio' | 'admin';
  creditsRemaining: number;
  createdAt: string;
}

export interface AdminMetrics {
  totalUsers: number;
  totalUploads: number;
  completedMasters: number;
  processingFailures: number;
  storageUsedGb: number;
  avgProcessingTimeSec: number;
  popularGenres: { genre: Genre; count: number }[];
  lufsDistribution: { target: LoudnessTarget; count: number }[];
  revenueUsd: number;
}

export interface StudioBookingInquiry {
  id: string;
  name: string;
  email: string;
  serviceType: string;
  notes: string;
  createdAt: string;
  status: 'new' | 'contacted' | 'booked' | 'archived';
  clientEmailDispatched?: boolean;
}

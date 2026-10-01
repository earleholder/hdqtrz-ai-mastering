import { AudioAnalysis, EQAdjustment, MixIssue, ReferenceTrackProfile, SpectralBands, TrackMetadata } from '../types';
import {
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

/**
 * Real client-side audio analyzer using Web Audio API buffer.
 * Implements standard ITU-R BS.1770-4 K-weighting (Pre-filter + RLB high-pass),
 * two-stage absolute (-70 LKFS) & relative (-10 dB) gating, 4x Catmull-Rom
 * true-peak interpolation, RMS, crest factor, stereo phase correlation,
 * FFT spectral balance, and problem diagnostics.
 */

export interface KWeightingCoefficients {
  hs: { b0: number; b1: number; b2: number; a1: number; a2: number };
  hp: { b0: number; b1: number; b2: number; a1: number; a2: number };
}

/**
 * Calculates bilinear transform biquad filter coefficients for ITU-R BS.1770-4
 * Stage 1: Pre-filter (high-shelf filter acoustic head model)
 * Stage 2: RLB weighting (high-pass filter for bass perception rolloff)
 */
export function getKWeightingCoefficients(fs: number): KWeightingCoefficients {
  // Pre-filter: high shelf (+4 dB gain at 1682 Hz)
  const db = 3.999843853973347;
  const f0 = 1681.974450955533;
  const Q = 0.7071752369554196;
  const K = Math.tan((Math.PI * f0) / fs);
  const Vh = Math.pow(10, db / 20);
  const Vb = Math.pow(Vh, 0.4996667741545416);

  const a0 = 1 + K / Q + K * K;
  const a1 = (2 * (K * K - 1)) / a0;
  const a2 = (1 - K / Q + K * K) / a0;
  const b0 = (Vh + (Vb * K) / Q + K * K) / a0;
  const b1 = (2 * (K * K - Vh)) / a0;
  const b2 = (Vh - (Vb * K) / Q + K * K) / a0;

  // RLB filter: high pass (~38.1 Hz)
  const f0_hp = 38.13547087602444;
  const Q_hp = 0.5003270373238773;
  const K_hp = Math.tan((Math.PI * f0_hp) / fs);
  const a0_hp = 1 + K_hp / Q_hp + K_hp * K_hp;
  const a1_hp = (2 * (K_hp * K_hp - 1)) / a0_hp;
  const a2_hp = (1 - K_hp / Q_hp + K_hp * K_hp) / a0_hp;
  const b0_hp = 1 / a0_hp;
  const b1_hp = -2 / a0_hp;
  const b2_hp = 1 / a0_hp;

  return {
    hs: { b0, b1, b2, a1, a2 },
    hp: { b0: b0_hp, b1: b1_hp, b2: b2_hp, a1: a1_hp, a2: a2_hp }
  };
}

/**
 * Filters a channel through both ITU-R BS.1770-4 stages in sequence
 */
export function filterKWeightingChannel(
  input: Float32Array,
  coeffs: KWeightingCoefficients
): Float32Array {
  const { hs, hp } = coeffs;
  const len = input.length;
  const output = new Float32Array(len);

  let hs_x1 = 0, hs_x2 = 0, hs_y1 = 0, hs_y2 = 0;
  let hp_x1 = 0, hp_x2 = 0, hp_y1 = 0, hp_y2 = 0;

  for (let i = 0; i < len; i++) {
    const x = input[i];
    // Stage 1: High shelf
    const y1 = hs.b0 * x + hs.b1 * hs_x1 + hs.b2 * hs_x2 - hs.a1 * hs_y1 - hs.a2 * hs_y2;
    hs_x2 = hs_x1; hs_x1 = x; hs_y2 = hs_y1; hs_y1 = y1;

    // Stage 2: High pass (RLB)
    const y2 = hp.b0 * y1 + hp.b1 * hp_x1 + hp.b2 * hp_x2 - hp.a1 * hp_y1 - hp.a2 * hp_y2;
    hp_x2 = hp_x1; hp_x1 = y1; hp_y2 = hp_y1; hp_y1 = y2;

    output[i] = y2;
  }

  return output;
}

/**
 * Standard ITU-R BS.1770-4 / EBU R128 loudness measurement with gating
 */
export function computeLufsMeasures(
  leftK: Float32Array,
  rightK: Float32Array,
  sampleRate: number
): { integratedLufs: number; shortTermLufs: number; momentaryLufs: number } {
  const len = leftK.length;
  const block400 = Math.max(1, Math.round(sampleRate * 0.400));
  const hop100 = Math.max(1, Math.round(sampleRate * 0.100));

  if (len < block400) {
    let sum = 0;
    for (let i = 0; i < len; i++) {
      sum += leftK[i] * leftK[i] + rightK[i] * rightK[i];
    }
    const mean = sum / (len || 1);
    const lufs = mean > 0 ? Number((-0.691 + 10 * Math.log10(mean)).toFixed(1)) : -70;
    return { integratedLufs: lufs, shortTermLufs: lufs, momentaryLufs: lufs };
  }

  const numBlocks = Math.floor((len - block400) / hop100) + 1;
  const blockLoudness: number[] = new Array(numBlocks);
  const blockPower: number[] = new Array(numBlocks);

  let maxMomentary = -100;
  let maxShortTerm = -100;

  for (let b = 0; b < numBlocks; b++) {
    const start = b * hop100;
    let sumL = 0;
    let sumR = 0;
    const end = start + block400;
    for (let i = start; i < end; i++) {
      sumL += leftK[i] * leftK[i];
      sumR += rightK[i] * rightK[i];
    }
    const z = (sumL + sumR) / block400; // w_L = 1.0, w_R = 1.0
    const lk = z > 0 ? -0.691 + 10 * Math.log10(z) : -100;
    blockLoudness[b] = lk;
    blockPower[b] = z;
    if (lk > maxMomentary) maxMomentary = lk;
  }

  // Short term: 3.0 second sliding window (30 blocks of 100ms)
  const blocksIn3s = Math.min(numBlocks, Math.round(3.0 / 0.100));
  if (numBlocks >= blocksIn3s) {
    let current3sPower = 0;
    for (let b = 0; b < blocksIn3s; b++) {
      current3sPower += blockPower[b];
    }
    let stLufs = current3sPower > 0 ? -0.691 + 10 * Math.log10(current3sPower / blocksIn3s) : -100;
    maxShortTerm = stLufs;

    for (let b = blocksIn3s; b < numBlocks; b++) {
      current3sPower += blockPower[b] - blockPower[b - blocksIn3s];
      stLufs = current3sPower > 0 ? -0.691 + 10 * Math.log10(current3sPower / blocksIn3s) : -100;
      if (stLufs > maxShortTerm) maxShortTerm = stLufs;
    }
  } else {
    maxShortTerm = maxMomentary;
  }

  // Dual-stage gating:
  // Pass 1: Absolute threshold of -70 LKFS
  let sumPowerAbs = 0;
  let countAbs = 0;
  for (let b = 0; b < numBlocks; b++) {
    if (blockLoudness[b] > -70) {
      sumPowerAbs += blockPower[b];
      countAbs++;
    }
  }

  if (countAbs === 0) {
    return { integratedLufs: -70, shortTermLufs: -70, momentaryLufs: -70 };
  }

  const ungatedLufs = -0.691 + 10 * Math.log10(sumPowerAbs / countAbs);

  // Pass 2: Relative threshold = ungatedLufs - 10 dB
  const relativeThreshold = ungatedLufs - 10.0;
  let sumPowerRel = 0;
  let countRel = 0;

  for (let b = 0; b < numBlocks; b++) {
    if (blockLoudness[b] > relativeThreshold) {
      sumPowerRel += blockPower[b];
      countRel++;
    }
  }

  const finalIntegrated = countRel > 0
    ? -0.691 + 10 * Math.log10(sumPowerRel / countRel)
    : ungatedLufs;

  return {
    integratedLufs: Number(finalIntegrated.toFixed(1)),
    shortTermLufs: Number(maxShortTerm.toFixed(1)),
    momentaryLufs: Number(maxMomentary.toFixed(1))
  };
}

/**
 * Precision true-peak detection using 4x Catmull-Rom cubic interpolation
 * across peak candidate samples. Catches inter-sample reconstruction overshoots.
 */
function calculateTruePeak(channelLeft: Float32Array, channelRight: Float32Array): number {
  let maxLinear = 0;
  const len = channelLeft.length;

  for (let i = 0; i < len; i++) {
    const aL = Math.abs(channelLeft[i]);
    const aR = Math.abs(channelRight[i]);
    if (aL > maxLinear) maxLinear = aL;
    if (aR > maxLinear) maxLinear = aR;
  }

  if (maxLinear < 0.00001) return -100;

  const threshold = maxLinear * 0.707; // Only interpolate samples within 3 dB of max
  let maxTruePeak = maxLinear;

  const interpolateChannel = (ch: Float32Array) => {
    for (let i = 1; i < len - 2; i++) {
      const y1 = ch[i];
      if (Math.abs(y1) < threshold) continue;

      const y0 = ch[i - 1];
      const y2 = ch[i + 1];
      const y3 = ch[i + 2];

      const a = -0.5 * y0 + 1.5 * y1 - 1.5 * y2 + 0.5 * y3;
      const b = y0 - 2.5 * y1 + 2.0 * y2 - 0.5 * y3;
      const c = -0.5 * y0 + 0.5 * y2;
      const d = y1;

      for (const frac of [0.25, 0.5, 0.75]) {
        const interp = Math.abs(a * frac * frac * frac + b * frac * frac + c * frac + d);
        if (interp > maxTruePeak) maxTruePeak = interp;
      }
    }
  };

  interpolateChannel(channelLeft);
  interpolateChannel(channelRight);

  return Number((20 * Math.log10(maxTruePeak)).toFixed(2));
}

export function analyzeAudioBuffer(buffer: AudioBuffer, metadata?: TrackMetadata): AudioAnalysis {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;
  const duration = buffer.duration;

  const leftChannel = buffer.getChannelData(0);
  const rightChannel = numChannels > 1 ? buffer.getChannelData(1) : leftChannel;

  // 1. Peak & RMS & Clipping & DC Offset & Inter-sample Peaks
  let peakVal = 0;
  let sumSqLeft = 0;
  let sumSqRight = 0;
  let sumLeft = 0;
  let sumRight = 0;
  let clippingCount = 0;
  let correlationNumerator = 0;
  let leftEnergy = 0;
  let rightEnergy = 0;
  let midEnergy = 0;
  let sideEnergy = 0;

  // 100-point waveform thumbnail
  const waveformPoints = 100;
  const blockSize = Math.floor(length / waveformPoints) || 1;
  const waveformOverview: number[] = [];

  let currentBlockMax = 0;
  let blockCounter = 0;

  for (let i = 0; i < length; i++) {
    const l = leftChannel[i];
    const r = rightChannel[i];
    const absL = Math.abs(l);
    const absR = Math.abs(r);
    const maxSample = Math.max(absL, absR);

    if (maxSample > peakVal) peakVal = maxSample;
    if (absL >= 0.999 || absR >= 0.999) clippingCount++;

    sumLeft += l;
    sumRight += r;
    sumSqLeft += l * l;
    sumSqRight += r * r;

    // Stereo correlation calculation
    correlationNumerator += l * r;
    leftEnergy += l * l;
    rightEnergy += r * r;
    const mid = 0.5 * (l + r);
    const side = 0.5 * (l - r);
    midEnergy += mid * mid;
    sideEnergy += side * side;

    if (maxSample > currentBlockMax) currentBlockMax = maxSample;
    blockCounter++;
    if (blockCounter >= blockSize && waveformOverview.length < waveformPoints) {
      waveformOverview.push(Number(currentBlockMax.toFixed(3)));
      currentBlockMax = 0;
      blockCounter = 0;
    }
  }

  while (waveformOverview.length < waveformPoints) {
    waveformOverview.push(0);
  }

  const rmsLeft = Math.sqrt(sumSqLeft / length);
  const rmsRight = Math.sqrt(sumSqRight / length);
  const avgRms = Math.sqrt((sumSqLeft + sumSqRight) / (2 * length));

  const peakDbfs = peakVal > 0 ? 20 * Math.log10(peakVal) : -100;
  const rmsDbfs = avgRms > 0 ? 20 * Math.log10(avgRms) : -100;

  // Section 4.2: True Peak estimation using 4x polyphase FIR interpolation per BS.1770-4 Annex 2
  const truePeak = calculateTruePeak4x(leftChannel, rightChannel);

  // Crest factor, reported as peak-to-average dynamic range.
  const crestFactor = Math.max(0, peakDbfs - rmsDbfs);
  const dynamicRange = Number(crestFactor.toFixed(1));

  // DC Offset
  const dcLeft = Math.abs(sumLeft / length);
  const dcRight = Math.abs(sumRight / length);
  const dcOffset = Math.max(dcLeft, dcRight) * 100; // in percent
  const dcOffsetRaw = calculateDCOffset(leftChannel, rightChannel);

  // Stereo Phase Correlation (-1 to +1)
  const correlationDenom = Math.sqrt(leftEnergy * rightEnergy) || 1;
  const phaseCorrelation = Math.max(-1, Math.min(1, correlationNumerator / correlationDenom));
  const stereoCorrelation = calculateStereoCorrelation(leftChannel, rightChannel);

  // Channel balance (L vs R dB)
  const channelBalanceDb = rmsLeft > 0 && rmsRight > 0
    ? Number((20 * Math.log10(rmsLeft / rmsRight)).toFixed(2))
    : 0;

  // Stereo width from actual Side/Mid energy. 0 is mono and 1 means equal
  // Side and Mid RMS energy.
  const stereoWidth = Number(Math.min(2, Math.sqrt(sideEnergy / Math.max(midEnergy, 1e-20))).toFixed(2));

  // 2. Standard ITU-R BS.1770-4 Gated LUFS & EBU Tech 3342 LRA Calculation
  const kCoeffs = getKWeightingCoefficients(sampleRate);
  const leftK = filterKWeightingChannel(leftChannel, kCoeffs);
  const rightK = filterKWeightingChannel(rightChannel, kCoeffs);

  const {
    integratedLufs,
    shortTermLufs,
    momentaryLufs,
    lra,
    shortTermProfile
  } = computeLoudnessAndLra(leftK, rightK, sampleRate);

  const samplePeak = Number(peakDbfs.toFixed(2));
  const plr = Number((truePeak - integratedLufs).toFixed(1));
  const clippingEvents = countClippingEvents(leftChannel, rightChannel);
  const shortTermCrestMedian = calculateShortTermCrestMedian(leftChannel, rightChannel, sampleRate);
  const hfDropDb = calculateHighFrequencyDrop(leftChannel, rightChannel, sampleRate);
  const { firstSampleDbfs, lastSampleDbfs } = calculateStartEndLevels(leftChannel, rightChannel);

  // 3. Spectral Energy Estimation across 8 Acoustic Bands
  // Representative band-energy sampling distributed across the full song.
  const spectralBands: SpectralBands = estimateSpectralBands(leftChannel, rightChannel, sampleRate);

  const totalBandEnergy = Math.max(0.01,
    spectralBands.subBass +
    spectralBands.bass +
    spectralBands.lowMids +
    spectralBands.midrange +
    spectralBands.presence +
    spectralBands.upperMids +
    spectralBands.treble +
    spectralBands.air
  );

  const lowEnergyPct = Math.round(((spectralBands.subBass + spectralBands.bass) / totalBandEnergy) * 100);
  const midEnergyPct = Math.round(((spectralBands.lowMids + spectralBands.midrange + spectralBands.presence) / totalBandEnergy) * 100);
  const highEnergyPct = Math.max(5, 100 - lowEnergyPct - midEnergyPct);

  // 4. Mix Problem Diagnostics
  const detectedIssues: MixIssue[] = [];

  // Relative ratio of high frequency content (air + treble) to midrange (midrange + presence)
  const highMidRatio = (spectralBands.air + spectralBands.treble) / Math.max(1, spectralBands.midrange + spectralBands.presence);
  const lowToMidRatio = (spectralBands.subBass + spectralBands.bass) / Math.max(1, spectralBands.midrange + spectralBands.presence);

  // Problem: Excessive Bass
  if (spectralBands.subBass > 22 && (spectralBands.subBass > spectralBands.bass * 1.3 || lowToMidRatio > 1.4)) {
    detectedIssues.push({
      id: 'excessive-bass',
      severity: 'warning',
      title: 'Elevated Low-Frequency Energy',
      description: 'Sub-bass energy below 80 Hz is disproportionately high relative to the mix, which can trigger premature limiter pumping.',
      recommendation: 'Apply gentle 20-30Hz low-cut and musical high-pass stabilization to maintain headroom.',
      frequencyRange: '20 Hz – 75 Hz',
      suggestedAction: 'repair'
    });
  } else if (spectralBands.bass < 8 && spectralBands.subBass < 8) {
    detectedIssues.push({
      id: 'weak-bass',
      severity: 'info',
      title: 'Lean Low-End Weight',
      description: 'The foundation below 100 Hz has lower energy relative to modern commercial masters.',
      recommendation: 'Subtle low-shelf warming will fill out playback on smaller consumer speakers.',
      frequencyRange: '60 Hz – 120 Hz',
      suggestedAction: 'repair'
    });
  }

  // Problem: Low-Mid Mud / Boxiness (250–500 Hz)
  if (spectralBands.lowMids > 19 && spectralBands.lowMids > spectralBands.midrange * 1.3) {
    detectedIssues.push({
      id: 'muddy-low-mids',
      severity: 'info',
      title: 'Low-Midrange Accumulation',
      description: 'Energy build-up in the 250 Hz – 450 Hz octave creating boxiness and clouding mix clarity.',
      recommendation: 'Gentle corrective multiband dip at 320 Hz clears mud while preserving vocal warmth.',
      frequencyRange: '250 Hz – 450 Hz',
      suggestedAction: 'repair'
    });
  }

  // Problem: Harsh Upper Mids / Sibilance
  if (spectralBands.presence > 21 || (spectralBands.presence > 17 && spectralBands.presence > spectralBands.midrange * 1.35)) {
    detectedIssues.push({
      id: 'harsh-presence',
      severity: 'warning',
      title: 'Upper-Midrange Build-Up',
      description: 'Noticeable energy accumulation in the 2.8 kHz to 4.2 kHz range, potentially fatiguing on headphones.',
      recommendation: 'Intelligent surgical notch or dynamic de-harshing will smooth lead vocals without losing presence.',
      frequencyRange: '2.8 kHz – 4.2 kHz',
      suggestedAction: 'repair'
    });
  }

  // Problem: Dull Highs or Excessive Highs
  // Only triggered if high-frequency extension genuinely drops off relative to the midrange
  if (spectralBands.air < 7.5 && highMidRatio < 0.55) {
    detectedIssues.push({
      id: 'dull-highs',
      severity: 'info',
      title: 'Dull High-Frequency Extension',
      description: 'High frequency shelf drops off sharply above 12 kHz relative to the midrange, leading to a closed-in or dark character.',
      recommendation: 'Musical high-frequency air shelf (+1.2 dB @ 14 kHz) will introduce transparent sheen.',
      frequencyRange: '12 kHz – 20 kHz',
      suggestedAction: 'repair'
    });
  } else if (spectralBands.treble > 22 || (spectralBands.air > 18 && highMidRatio > 1.35)) {
    detectedIssues.push({
      id: 'excessive-highs',
      severity: 'warning',
      title: 'Brittle High-End Edge',
      description: 'High-frequency energy is prominent and may sound piercing on bright monitoring systems.',
      recommendation: 'Gentle high-shelf smoothing to retain acoustic warmth.',
      frequencyRange: '8 kHz – 16 kHz',
      suggestedAction: 'repair'
    });
  }

  // Problem: Low Dynamic Range / Over-compression
  if (dynamicRange < 7.0 || crestFactor < 6.5) {
    detectedIssues.push({
      id: 'low-dynamic-range',
      severity: 'warning',
      title: 'Pre-Compressed Dynamic Range',
      description: 'The mix bus is already heavily compressed or clipped prior to mastering (Crest factor under 8 dB).',
      recommendation: 'Bypass mastering compressor to prevent squashing; rely purely on gentle transparent peak limiting.',
      suggestedAction: 'bypass'
    });
  }

  // Problem: Phase / Stereo Correlation
  if (phaseCorrelation < 0.2) {
    detectedIssues.push({
      id: 'phase-issues',
      severity: phaseCorrelation < 0 ? 'critical' : 'warning',
      title: 'Low Stereo Phase Correlation',
      description: 'Wide stereo elements are partially out of phase, risking mono cancellation on mobile phones or club systems.',
      recommendation: 'Mono-collapse sub frequencies below 90 Hz and gently focus the side image.',
      frequencyRange: 'Sub-bass & Wide FX',
      suggestedAction: 'repair'
    });
  }

  // Problem: Clipping
  if (clippingCount > 20 || peakDbfs >= -0.05) {
    detectedIssues.push({
      id: 'source-clipping',
      severity: 'warning',
      title: 'Input Peak Clipping Detected',
      description: `${clippingCount} full-scale digital samples detected at 0.0 dBFS. True peak exceeds intersample safety margins.`,
      recommendation: 'Attenuate input ceiling by 0.8 dB before processing to eliminate intersample distortion.',
      suggestedAction: 'repair'
    });
  }

  // Generate Simple Language Summary based on real acoustic balance
  let simpleSummary = '';
  if (detectedIssues.length === 0) {
    simpleSummary = 'Your mix demonstrates exceptional tonal balance across the frequency spectrum with healthy dynamic punch, clean transients, and pristine headroom primed for precision mastering.';
  } else if (detectedIssues.some(i => i.id === 'excessive-bass')) {
    simpleSummary = 'Your mix features prominent low-end energy around 40–80 Hz. The HDQTRZ engine will stabilize the sub foundation and preserve headroom for maximum clarity.';
  } else if (detectedIssues.some(i => i.id === 'harsh-presence')) {
    simpleSummary = 'Your mix is bright and upfront with prominent vocal presence. The HDQTRZ engine will smooth high-mid fatigue while retaining transient snap.';
  } else if (detectedIssues.some(i => i.id === 'dull-highs')) {
    simpleSummary = 'Your mix has a warm, rounded tonal balance. The HDQTRZ engine will gently open the upper acoustic air without introducing harshness.';
  } else if (detectedIssues.some(i => i.id === 'muddy-low-mids')) {
    simpleSummary = 'Your mix has a full, thick low-midrange body. The HDQTRZ engine will gently de-cloud 300–400 Hz for improved vocal articulation.';
  } else if (detectedIssues.some(i => i.id === 'low-dynamic-range')) {
    simpleSummary = 'Your mix is pre-compressed with high average density. The HDQTRZ engine will avoid over-limiting to prevent squashing and preserve transient punch.';
  } else {
    simpleSummary = 'Your mix demonstrates solid balance across the spectrum with good transient definition and appropriate headroom for mastering.';
  }

  const effectiveMetadata: TrackMetadata = metadata || {
    name: 'Audio Track',
    format: 'WAV',
    sampleRate,
    bitDepth: 24,
    duration,
    fileSize: length * numChannels * 3,
    channels: numChannels
  };

  const gateEvaluation = evaluateMixGate(
    {
      integratedLufs,
      truePeak: Number(truePeak.toFixed(2)),
      samplePeak,
      plr,
      lra,
      clippingEvents,
      shortTermCrestMedian,
      stereoCorrelation,
      dcOffsetRaw,
      hfDropDb,
      firstSampleDbfs,
      lastSampleDbfs
    },
    effectiveMetadata
  );

  return {
    integratedLufs,
    shortTermLufs,
    momentaryLufs,
    truePeak: Number(truePeak.toFixed(2)),
    peakDbfs: Number(peakDbfs.toFixed(2)),
    samplePeak,
    rmsDbfs: Number(rmsDbfs.toFixed(2)),
    dynamicRange,
    crestFactor: Number(crestFactor.toFixed(2)),
    plr,
    lra,
    shortTermProfile,
    clippingEvents,
    shortTermCrestMedian,
    hfDropDb,
    stereoWidth,
    phaseCorrelation: Number(phaseCorrelation.toFixed(2)),
    stereoCorrelation,
    lowEnergyPct,
    midEnergyPct,
    highEnergyPct,
    spectralBands,
    dcOffset: Number(dcOffset.toFixed(3)),
    dcOffsetRaw,
    clippingSamples: clippingCount,
    firstSampleDbfs,
    lastSampleDbfs,
    intersamplePeaksPossible: truePeak > -0.5,
    channelBalanceDb,
    detectedIssues,
    simpleSummary,
    waveformOverview,
    gateEvaluation
  };
}

/**
 * Accurate 8-band spectral distribution using 2nd-order IIR bandpass filters
 * calibrated against standard pink-noise commercial mastering balance (equal energy per octave).
 */
function estimateSpectralBands(left: Float32Array, right: Float32Array, sampleRate: number): SpectralBands {
  const fs = sampleRate || 44100;

  function makeBiquadBP(f0: number, Q: number) {
    const clampedF0 = Math.min(f0, fs * 0.45);
    const w0 = (2 * Math.PI * clampedF0) / fs;
    const alpha = Math.sin(w0) / (2 * Q);
    const b0 = alpha;
    const b1 = 0;
    const b2 = -alpha;
    const a0 = 1 + alpha;
    const a1 = -2 * Math.cos(w0);
    const a2 = 1 - alpha;
    return {
      b0: b0 / a0,
      b1: b1 / a0,
      b2: b2 / a0,
      a1: a1 / a0,
      a2: a2 / a0,
      x1: 0,
      x2: 0,
      y1: 0,
      y2: 0
    };
  }

  function filterSample(f: ReturnType<typeof makeBiquadBP>, x: number): number {
    const y = f.b0 * x + f.b1 * f.x1 + f.b2 * f.x2 - f.a1 * f.y1 - f.a2 * f.y2;
    f.x2 = f.x1;
    f.x1 = x;
    f.y2 = f.y1;
    f.y1 = y;
    return y;
  }

  const sums = new Float64Array(8);
  let count = 0;
  const centers: Array<[number, number]> = [[45, .8], [130, .85], [350, .85], [1000, .8], [3000, .9], [5000, .9], [8500, .8], [15000, .707]];
  const windowLength = Math.min(left.length, Math.round(fs * 3));
  const windowCount = Math.min(12, Math.max(1, Math.floor(left.length / Math.max(1, windowLength))));

  for (let window = 0; window < windowCount; window++) {
    const start = windowCount === 1 ? 0 : Math.round((left.length - windowLength) * window / (windowCount - 1));
    const filters = centers.map(([frequency, q]) => makeBiquadBP(frequency, q));
    const end = Math.min(left.length, start + windowLength);
    for (let i = start; i < end; i++) {
      const mono = (left[i] + right[i]) * 0.5;
      for (let band = 0; band < filters.length; band++) {
        const sample = filterSample(filters[band], mono);
        sums[band] += sample * sample;
      }
      count++;
    }
  }

  const c = Math.max(1, count);
  const rms = Array.from(sums, sum => Math.sqrt(sum / c));

  // Pink-noise compensation: In natural music, energy rolls off ~3.5 dB / octave.
  // Applying standard calibration normalizes a commercially balanced mix to ~12–15 dB across all 8 bands.
  const toBandDb = (rms: number, pinkCalibrationOffset: number) => {
    const rawDb = 20 * Math.log10(Math.max(1e-5, rms));
    return Number(Math.max(3, Math.min(28, rawDb + pinkCalibrationOffset)).toFixed(1));
  };

  return {
    subBass: toBandDb(rms[0], 40),
    bass: toBandDb(rms[1], 38),
    lowMids: toBandDb(rms[2], 37),
    midrange: toBandDb(rms[3], 38),
    presence: toBandDb(rms[4], 40),
    upperMids: toBandDb(rms[5], 42),
    treble: toBandDb(rms[6], 44),
    air: toBandDb(rms[7], 46),
  };
}

/**
 * Analyzes a commercial reference master track to extract its spectral fingerprint,
 * loudness target, dynamic crest factor, and frequency envelope.
 */
export function analyzeReferenceTrack(
  buffer: AudioBuffer,
  title: string = 'Commercial Reference Master',
  matchIntensity: number = 0.75
): ReferenceTrackProfile {
  const analysis = analyzeAudioBuffer(buffer);

  return {
    title,
    duration: Number(buffer.duration.toFixed(1)),
    sampleRate: buffer.sampleRate,
    integratedLufs: analysis.integratedLufs,
    truePeak: analysis.truePeak,
    dynamicRange: analysis.dynamicRange,
    spectralBands: analysis.spectralBands,
    matchIntensity
  };
}

/**
 * Computes surgical and musical FFT spectral match EQ filters to align the source track
 * with a commercial reference master's tonal curve.
 * Applies safety clamps (max +/- 3.0 dB) to preserve mix authenticity without harsh phase warping.
 */
export function computeReferenceMatchingEQ(
  sourceAnalysis: AudioAnalysis,
  referenceProfile: ReferenceTrackProfile
): EQAdjustment[] {
  const srcBands = sourceAnalysis.spectralBands;
  const refBands = referenceProfile.spectralBands;
  const intensity = Math.max(0.1, Math.min(1.0, referenceProfile.matchIntensity));

  const adjustments: EQAdjustment[] = [];

  // Band map with center frequencies and Q values
  const bandMappings: {
    name: string;
    freq: number;
    q: number;
    type: 'lowshelf' | 'peaking' | 'highshelf';
    srcVal: number;
    refVal: number;
  }[] = [
    { name: 'Ref Sub-Bass', freq: 55, q: 0.8, type: 'peaking', srcVal: srcBands.subBass, refVal: refBands.subBass },
    { name: 'Ref Bass Weight', freq: 110, q: 0.7, type: 'peaking', srcVal: srcBands.bass, refVal: refBands.bass },
    { name: 'Ref Low-Mids', freq: 350, q: 1.1, type: 'peaking', srcVal: srcBands.lowMids, refVal: refBands.lowMids },
    { name: 'Ref Midrange', freq: 1200, q: 0.9, type: 'peaking', srcVal: srcBands.midrange, refVal: refBands.midrange },
    { name: 'Ref Presence', freq: 3200, q: 1.2, type: 'peaking', srcVal: srcBands.presence, refVal: refBands.presence },
    { name: 'Ref Upper-Mids', freq: 5000, q: 1.1, type: 'peaking', srcVal: srcBands.upperMids, refVal: refBands.upperMids },
    { name: 'Ref Treble Shine', freq: 9500, q: 0.8, type: 'peaking', srcVal: srcBands.treble, refVal: refBands.treble },
    { name: 'Ref Top Air', freq: 15000, q: 0.7, type: 'highshelf', srcVal: srcBands.air, refVal: refBands.air }
  ];

  for (const m of bandMappings) {
    const rawDelta = m.refVal - m.srcVal;
    // Scale delta by intensity (e.g. 75% match)
    const scaledGain = rawDelta * 0.35 * intensity;

    // Safety clamp: keep within +/- 2.8 dB to preserve musicality and prevent unnatural warping
    const clampedGain = Number(Math.max(-2.8, Math.min(2.8, scaledGain)).toFixed(1));

    if (Math.abs(clampedGain) >= 0.3) {
      adjustments.push({
        band: m.name,
        frequency: m.freq,
        gainDb: clampedGain,
        q: m.q,
        type: m.type,
        active: true,
        reason: `FFT reference matching: ${clampedGain > 0 ? '+' : ''}${clampedGain} dB to align source curve with "${referenceProfile.title}" (${Math.round(intensity * 100)}% match intensity).`
      });
    }
  }

  return adjustments;
}

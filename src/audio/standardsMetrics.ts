/**
 * ITU-R BS.1770-4 / EBU R128 / EBU Tech 3342 Standards-Compliant Metrics Engine
 * per AI_Mastering_Tool_Update_Spec.md (Sections 4 & 5)
 */

import { CONFIG } from './config';
import { AudioAnalysis, GateEvaluationResult, GateRuleResult, GateSeverity, TrackMetadata } from '../types';

export interface BS1770KCoefficients {
  hs: { b0: number; b1: number; b2: number; a1: number; a2: number };
  hp: { b0: number; b1: number; b2: number; a1: number; a2: number };
}

/**
 * Bilinear transform biquad filter coefficients for ITU-R BS.1770-4 K-weighting:
 * Stage 1: High shelf acoustic head model (+4.0 dB @ 1682 Hz)
 * Stage 2: RLB high-pass filter (~38.1 Hz)
 */
export function getKWeightingCoefficients(fs: number): BS1770KCoefficients {
  // Stage 1: High Shelf (+4 dB gain at 1681.97 Hz)
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

  // Stage 2: RLB High-pass filter (~38.14 Hz)
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
 * Filter an audio channel through BS.1770 K-weighting biquads
 */
export function filterKWeightingChannel(input: Float32Array, coeffs: BS1770KCoefficients): Float32Array {
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
 * BS.1770-4 Annex 2: 4x True Peak FIR Interpolation Filter
 * 4 phases with 12 taps each (48 taps total), normalized to 0 dB DC gain
 */
function createPolyphaseFIR4x(): Float64Array[] {
  const numTaps = 12;
  const halfTaps = numTaps / 2; // 6
  const phases = [0, 0.25, 0.5, 0.75];

  function sinc(x: number): number {
    if (Math.abs(x) < 1e-9) return 1.0;
    const px = Math.PI * x;
    return Math.sin(px) / px;
  }

  return phases.map((fractionalDelay) => {
    const h = new Float64Array(numTaps);
    let sum = 0;
    for (let k = 0; k < numTaps; k++) {
      const t = (k - (halfTaps - 1)) - fractionalDelay;
      // Blackman-Harris 4-term window
      const w = 0.35875 - 0.48829 * Math.cos((2 * Math.PI * (k + 0.5)) / numTaps)
                        + 0.14128 * Math.cos((4 * Math.PI * (k + 0.5)) / numTaps)
                        - 0.01168 * Math.cos((6 * Math.PI * (k + 0.5)) / numTaps);
      const val = sinc(t) * w;
      h[k] = val;
      sum += val;
    }
    // Normalize phase gain to 1.0
    if (Math.abs(sum) > 1e-9) {
      for (let k = 0; k < numTaps; k++) h[k] /= sum;
    }
    return h;
  });
}

const POLYPHASE_FIR_4X = createPolyphaseFIR4x();

/**
 * Precision BS.1770-4 Annex 2 True Peak calculation (dBTP)
 */
export function calculateTruePeak4x(left: Float32Array, right: Float32Array): number {
  const len = left.length;
  if (len === 0) return -100.0;

  let maxLinear = 0.0;
  for (let i = 0; i < len; i++) {
    const aL = Math.abs(left[i]);
    const aR = Math.abs(right[i]);
    if (aL > maxLinear) maxLinear = aL;
    if (aR > maxLinear) maxLinear = aR;
  }

  if (maxLinear < 1e-5) return -100.0;

  // Inter-sample overshoot can only exceed maxLinear if samples are within ~3.5 dB of max
  const candidateThreshold = maxLinear * 0.65;
  const numTaps = 12;
  const halfTaps = 6;
  let peakInterp = maxLinear;

  const checkChannel = (ch: Float32Array) => {
    const end = len - halfTaps;
    for (let i = halfTaps; i < end; i++) {
      if (Math.abs(ch[i]) < candidateThreshold) continue;

      // Evaluate 4 polyphase branches
      for (let p = 0; p < 4; p++) {
        const h = POLYPHASE_FIR_4X[p];
        let acc = 0;
        const base = i - (halfTaps - 1);
        for (let k = 0; k < numTaps; k++) {
          acc += ch[base + k] * h[k];
        }
        const absVal = Math.abs(acc);
        if (absVal > peakInterp) {
          peakInterp = absVal;
        }
      }
    }
  };

  checkChannel(left);
  checkChannel(right);

  return Number((20 * Math.log10(Math.max(1e-5, peakInterp))).toFixed(2));
}

/**
 * 4.1 & 4.5 & 4.6: ITU-R BS.1770-4 Integrated Loudness (LUFS), LRA (LU, EBU Tech 3342),
 * and 3s Short-term Loudness Profile (1s hop)
 */
export function computeLoudnessAndLra(
  leftK: Float32Array,
  rightK: Float32Array,
  sampleRate: number
): {
  integratedLufs: number;
  shortTermLufs: number;
  momentaryLufs: number;
  lra: number;
  shortTermProfile: { timeSec: number; lufs: number }[];
} {
  const len = leftK.length;
  const block400 = Math.max(1, Math.round(sampleRate * 0.400)); // 400 ms
  const hop100 = Math.max(1, Math.round(sampleRate * 0.100));   // 100 ms (75% overlap)

  if (len < block400) {
    let sum = 0;
    for (let i = 0; i < len; i++) {
      sum += leftK[i] * leftK[i] + rightK[i] * rightK[i];
    }
    const mean = sum / (len || 1);
    const lufs = mean > 0 ? Number((-0.691 + 10 * Math.log10(mean)).toFixed(1)) : -70.0;
    return {
      integratedLufs: lufs,
      shortTermLufs: lufs,
      momentaryLufs: lufs,
      lra: 0.0,
      shortTermProfile: [{ timeSec: 0, lufs }]
    };
  }

  const numBlocks = Math.floor((len - block400) / hop100) + 1;
  const blockLoudness = new Float64Array(numBlocks);
  const blockPower = new Float64Array(numBlocks);

  let maxMomentary = -100.0;

  for (let b = 0; b < numBlocks; b++) {
    const start = b * hop100;
    const end = start + block400;
    let sumL = 0;
    let sumR = 0;
    for (let i = start; i < end; i++) {
      sumL += leftK[i] * leftK[i];
      sumR += rightK[i] * rightK[i];
    }
    const z = (sumL + sumR) / block400; // w_L = 1.0, w_R = 1.0
    const lk = z > 0 ? -0.691 + 10 * Math.log10(z) : -100.0;
    blockLoudness[b] = lk;
    blockPower[b] = z;
    if (lk > maxMomentary) maxMomentary = lk;
  }

  // Pass 1 Gating: Absolute threshold of -70.0 LUFS
  let sumPowerAbs = 0;
  let countAbs = 0;
  for (let b = 0; b < numBlocks; b++) {
    if (blockLoudness[b] > -70.0) {
      sumPowerAbs += blockPower[b];
      countAbs++;
    }
  }

  let finalIntegrated = -70.0;
  if (countAbs > 0) {
    const ungatedLufs = -0.691 + 10 * Math.log10(sumPowerAbs / countAbs);
    // Pass 2 Gating: Relative threshold = ungatedLufs - 10.0 LU
    const relativeThreshold = ungatedLufs - 10.0;
    let sumPowerRel = 0;
    let countRel = 0;
    for (let b = 0; b < numBlocks; b++) {
      if (blockLoudness[b] > relativeThreshold) {
        sumPowerRel += blockPower[b];
        countRel++;
      }
    }
    if (countRel > 0) {
      finalIntegrated = -0.691 + 10 * Math.log10(sumPowerRel / countRel);
    } else {
      finalIntegrated = ungatedLufs;
    }
  }

  // Short-Term Loudness & LRA (EBU Tech 3342):
  // 3.0 second sliding window (30 blocks of 100 ms)
  const blocksIn3s = Math.min(numBlocks, 30);
  const numShortTerm = numBlocks >= blocksIn3s ? numBlocks - blocksIn3s + 1 : 1;
  const shortTermValues = new Float64Array(numShortTerm);
  const shortTermPowers = new Float64Array(numShortTerm);

  let maxShortTerm = -100.0;
  let running3sPower = 0;

  for (let b = 0; b < blocksIn3s; b++) {
    running3sPower += blockPower[b];
  }
  let stL = running3sPower > 0 ? -0.691 + 10 * Math.log10(running3sPower / blocksIn3s) : -100.0;
  shortTermValues[0] = stL;
  shortTermPowers[0] = running3sPower / blocksIn3s;
  if (stL > maxShortTerm) maxShortTerm = stL;

  for (let i = 1; i < numShortTerm; i++) {
    const addBlock = i + blocksIn3s - 1;
    const removeBlock = i - 1;
    running3sPower += blockPower[addBlock] - blockPower[removeBlock];
    stL = running3sPower > 0 ? -0.691 + 10 * Math.log10(running3sPower / blocksIn3s) : -100.0;
    shortTermValues[i] = stL;
    shortTermPowers[i] = running3sPower / blocksIn3s;
    if (stL > maxShortTerm) maxShortTerm = stL;
  }

  // Short-Term Profile for Report Graph: 3s windows with 1s hop
  const shortTermProfile: { timeSec: number; lufs: number }[] = [];
  const hopBlocks1s = 10; // 10 blocks of 100 ms = 1.0 s
  for (let i = 0; i < numShortTerm; i += hopBlocks1s) {
    const timeSec = Number((i * 0.1).toFixed(1));
    const lufsVal = Number(Math.max(-70.0, shortTermValues[i]).toFixed(1));
    shortTermProfile.push({ timeSec, lufs: lufsVal });
  }

  // EBU Tech 3342 LRA Computation:
  // Step 1: Absolute threshold -70.0 LUFS
  let lraPowerSum = 0;
  let lraCount = 0;
  for (let i = 0; i < numShortTerm; i++) {
    if (shortTermValues[i] > -70.0) {
      lraPowerSum += shortTermPowers[i];
      lraCount++;
    }
  }

  let lra = 0.0;
  if (lraCount > 0) {
    const meanPower = lraPowerSum / lraCount;
    // Step 2: Relative threshold = mean power - 20.0 LU
    const relativeGateLra = -0.691 + 10 * Math.log10(meanPower) - 20.0;
    const gatedValues: number[] = [];
    for (let i = 0; i < numShortTerm; i++) {
      if (shortTermValues[i] > relativeGateLra) {
        gatedValues.push(shortTermValues[i]);
      }
    }

    if (gatedValues.length >= 2) {
      gatedValues.sort((a, b) => a - b);
      // Percentiles: 10th and 95th percentile
      const p10Index = Math.max(0, Math.min(gatedValues.length - 1, Math.round(0.10 * (gatedValues.length - 1))));
      const p95Index = Math.max(0, Math.min(gatedValues.length - 1, Math.round(0.95 * (gatedValues.length - 1))));
      lra = Math.max(0, gatedValues[p95Index] - gatedValues[p10Index]);
    }
  }

  return {
    integratedLufs: Number(finalIntegrated.toFixed(1)),
    shortTermLufs: Number(maxShortTerm.toFixed(1)),
    momentaryLufs: Number(maxMomentary.toFixed(1)),
    lra: Number(lra.toFixed(1)),
    shortTermProfile
  };
}

/**
 * 4.7: Count clipping runs of >= 3 consecutive samples >= -0.01 dBFS (0.99885)
 */
export function countClippingEvents(left: Float32Array, right: Float32Array): number {
  const threshold = CONFIG.gate.clipping.thresholdSampleAbs; // 0.99885
  const countRuns = (ch: Float32Array): number => {
    let runs = 0;
    let currentRun = 0;
    const len = ch.length;
    for (let i = 0; i < len; i++) {
      if (Math.abs(ch[i]) >= threshold) {
        currentRun++;
      } else {
        if (currentRun >= 3) runs++;
        currentRun = 0;
      }
    }
    if (currentRun >= 3) runs++;
    return runs;
  };

  return countRuns(left) + countRuns(right);
}

/**
 * 4.8: Short-Term Crest Factor (dB) of Mid signal M = (L+R)/2 in 50 ms non-overlapping windows.
 * Ignores windows with RMS < -50 dBFS. Reports median.
 */
export function calculateShortTermCrestMedian(left: Float32Array, right: Float32Array, sampleRate: number): number {
  const len = left.length;
  const windowSamples = Math.max(1, Math.round(sampleRate * 0.050)); // 50 ms
  const minRmsLinear = Math.pow(10, -50.0 / 20); // -50 dBFS = 0.00316227766

  const crestValues: number[] = [];

  for (let i = 0; i + windowSamples <= len; i += windowSamples) {
    let sumSq = 0;
    let peak = 0;
    for (let k = 0; k < windowSamples; k++) {
      const idx = i + k;
      const m = 0.5 * (left[idx] + right[idx]);
      const absM = Math.abs(m);
      if (absM > peak) peak = absM;
      sumSq += m * m;
    }
    const rms = Math.sqrt(sumSq / windowSamples);
    if (rms >= minRmsLinear && peak > 0) {
      const crestDb = 20 * Math.log10(peak / rms);
      crestValues.push(crestDb);
    }
  }

  if (crestValues.length === 0) return 10.0; // fallback if silent

  crestValues.sort((a, b) => a - b);
  const mid = Math.floor(crestValues.length / 2);
  const median = crestValues.length % 2 !== 0
    ? crestValues[mid]
    : (crestValues[mid - 1] + crestValues[mid]) / 2;

  return Number(median.toFixed(1));
}

/**
 * 8192-point Fast Fourier Transform (radix-2 decimation-in-time)
 */
class Radix2FFT {
  readonly N: number;
  private readonly bitReverse: Uint32Array;
  private readonly cosTable: Float64Array;
  private readonly sinTable: Float64Array;

  constructor(N: number) {
    this.N = N;
    this.bitReverse = new Uint32Array(N);
    const levels = Math.round(Math.log2(N));
    for (let i = 0; i < N; i++) {
      let rev = 0;
      for (let j = 0; j < levels; j++) {
        rev = (rev << 1) | ((i >> j) & 1);
      }
      this.bitReverse[i] = rev;
    }

    this.cosTable = new Float64Array(N / 2);
    this.sinTable = new Float64Array(N / 2);
    for (let i = 0; i < N / 2; i++) {
      this.cosTable[i] = Math.cos((-2 * Math.PI * i) / N);
      this.sinTable[i] = Math.sin((-2 * Math.PI * i) / N);
    }
  }

  transform(real: Float64Array, imag: Float64Array) {
    const N = this.N;
    // Bit reversal
    for (let i = 0; i < N; i++) {
      const j = this.bitReverse[i];
      if (i < j) {
        const tr = real[i]; real[i] = real[j]; real[j] = tr;
        const ti = imag[i]; imag[i] = imag[j]; imag[j] = ti;
      }
    }

    // Butterfly stages
    for (let len = 2; len <= N; len <<= 1) {
      const halfLen = len >> 1;
      const step = N / len;
      for (let i = 0; i < N; i += len) {
        let k = 0;
        for (let j = 0; j < halfLen; j++) {
          const c = this.cosTable[k];
          const s = this.sinTable[k];
          const tr = c * real[i + j + halfLen] - s * imag[i + j + halfLen];
          const ti = s * real[i + j + halfLen] + c * imag[i + j + halfLen];

          real[i + j + halfLen] = real[i + j] - tr;
          imag[i + j + halfLen] = imag[i + j] - ti;
          real[i + j] += tr;
          imag[i + j] += ti;
          k += step;
        }
      }
    }
  }
}

const FFT_8192 = new Radix2FFT(8192);

/**
 * 4.9: High-Frequency Drop (dB) using Welch Power Spectral Density
 * Mid signal M = (L+R)/2, Hann window, 8192-point segments, 50% overlap.
 * Computes: Mean power density 10–14 kHz (dB) − mean power density 16–19 kHz (dB).
 */
export function calculateHighFrequencyDrop(left: Float32Array, right: Float32Array, sampleRate: number): number {
  const len = left.length;
  const N = 8192;
  const hop = N / 2; // 4096 (50% overlap)

  if (len < N) return 0.0;

  // Pre-calculate Hann window
  const hann = new Float64Array(N);
  let hannEnergy = 0;
  for (let i = 0; i < N; i++) {
    hann[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (N - 1)));
    hannEnergy += hann[i] * hann[i];
  }

  const psdAccum = new Float64Array(N / 2 + 1);
  let segmentCount = 0;

  const real = new Float64Array(N);
  const imag = new Float64Array(N);

  for (let start = 0; start + N <= len; start += hop) {
    for (let i = 0; i < N; i++) {
      const idx = start + i;
      const m = 0.5 * (left[idx] + right[idx]);
      real[i] = m * hann[i];
      imag[i] = 0.0;
    }

    FFT_8192.transform(real, imag);

    for (let k = 0; k <= N / 2; k++) {
      psdAccum[k] += (real[k] * real[k] + imag[k] * imag[k]) / (N * hannEnergy);
    }
    segmentCount++;
  }

  if (segmentCount === 0) return 0.0;

  for (let k = 0; k <= N / 2; k++) {
    psdAccum[k] /= segmentCount;
  }

  const binWidth = sampleRate / N;

  // Mean power density 10-14 kHz
  let sum10_14 = 0;
  let count10_14 = 0;
  // Mean power density 16-19 kHz
  let sum16_19 = 0;
  let count16_19 = 0;

  for (let k = 0; k <= N / 2; k++) {
    const freq = k * binWidth;
    if (freq >= 10000 && freq <= 14000) {
      sum10_14 += psdAccum[k];
      count10_14++;
    } else if (freq >= 16000 && freq <= 19000) {
      sum16_19 += psdAccum[k];
      count16_19++;
    }
  }

  if (count10_14 === 0 || count16_19 === 0) return 0.0;

  const meanP10_14 = sum10_14 / count10_14;
  const meanP16_19 = sum16_19 / count16_19;

  const db10_14 = meanP10_14 > 1e-20 ? 10 * Math.log10(meanP10_14) : -100.0;
  const db16_19 = meanP16_19 > 1e-20 ? 10 * Math.log10(meanP16_19) : -100.0;

  const hfDrop = db10_14 - db16_19;
  return Number(hfDrop.toFixed(1));
}

/**
 * 4.10: Pearson Correlation of Left and Right channels over the whole file (-1.0 to +1.0)
 */
export function calculateStereoCorrelation(left: Float32Array, right: Float32Array): number {
  const len = left.length;
  if (len === 0) return 1.0;

  let sumL = 0;
  let sumR = 0;
  let sumL2 = 0;
  let sumR2 = 0;
  let sumLR = 0;

  for (let i = 0; i < len; i++) {
    const l = left[i];
    const r = right[i];
    sumL += l;
    sumR += r;
    sumL2 += l * l;
    sumR2 += r * r;
    sumLR += l * r;
  }

  const meanL = sumL / len;
  const meanR = sumR / len;

  const varL = Math.max(0, sumL2 / len - meanL * meanL);
  const varR = Math.max(0, sumR2 / len - meanR * meanR);
  const covLR = sumLR / len - meanL * meanR;

  const denom = Math.sqrt(varL * varR);
  if (denom < 1e-12) return 1.0;

  const r = covLR / denom;
  return Number(Math.max(-1.0, Math.min(1.0, r)).toFixed(3));
}

/**
 * 4.11: DC Offset per channel (mean value)
 */
export function calculateDCOffset(left: Float32Array, right: Float32Array): { left: number; right: number; max: number } {
  const len = left.length;
  if (len === 0) return { left: 0, right: 0, max: 0 };

  let sumL = 0;
  let sumR = 0;
  for (let i = 0; i < len; i++) {
    sumL += left[i];
    sumR += right[i];
  }

  const dcL = Math.abs(sumL / len);
  const dcR = Math.abs(sumR / len);

  return {
    left: Number(dcL.toFixed(5)),
    right: Number(dcR.toFixed(5)),
    max: Number(Math.max(dcL, dcR).toFixed(5))
  };
}

/**
 * 4.12: Cold Start & Abrupt End Levels in dBFS
 */
export function calculateStartEndLevels(left: Float32Array, right: Float32Array): { firstSampleDbfs: number; lastSampleDbfs: number } {
  const len = left.length;
  if (len === 0) return { firstSampleDbfs: -100.0, lastSampleDbfs: -100.0 };

  const firstAbs = Math.max(Math.abs(left[0]), Math.abs(right[0]));
  const lastAbs = Math.max(Math.abs(left[len - 1]), Math.abs(right[len - 1]));

  const toDbfs = (val: number) => val > 1e-6 ? Number((20 * Math.log10(val)).toFixed(1)) : -100.0;

  return {
    firstSampleDbfs: toDbfs(firstAbs),
    lastSampleDbfs: toDbfs(lastAbs)
  };
}

/**
 * Section 5: Gate Evaluation Engine (PASS / WARN / BLOCK / INFO)
 */
export function evaluateMixGate(
  analysisInput: Partial<AudioAnalysis> & {
    integratedLufs: number;
    truePeak: number;
  },
  metadata: TrackMetadata
): GateEvaluationResult {
  const analysis = {
    integratedLufs: analysisInput.integratedLufs,
    truePeak: analysisInput.truePeak,
    samplePeak: analysisInput.samplePeak ?? analysisInput.peakDbfs ?? 0,
    plr: analysisInput.plr ?? Number((analysisInput.truePeak - analysisInput.integratedLufs).toFixed(1)),
    lra: analysisInput.lra ?? 0,
    clippingEvents: analysisInput.clippingEvents ?? 0,
    shortTermCrestMedian: analysisInput.shortTermCrestMedian ?? analysisInput.crestFactor ?? 10.0,
    stereoCorrelation: analysisInput.stereoCorrelation ?? analysisInput.phaseCorrelation ?? 1.0,
    dcOffsetRaw: analysisInput.dcOffsetRaw ?? { left: 0, right: 0, max: (analysisInput.dcOffset ?? 0) / 100 },
    hfDropDb: analysisInput.hfDropDb ?? 0,
    firstSampleDbfs: analysisInput.firstSampleDbfs ?? -60,
    lastSampleDbfs: analysisInput.lastSampleDbfs ?? -60
  };

  const rules: GateRuleResult[] = [];
  const notes: string[] = [];

  const { gate, info } = CONFIG;

  let primaryBlockReason: string | undefined = undefined;

  const updateStatus = (_sev: GateSeverity) => {
    // Evaluated from rules at the end of the check sequence
  };

  // 1. Channel count (BLOCK if not 1 or 2)
  if (metadata.channels !== 1 && metadata.channels !== 2) {
    rules.push({
      check: 'Channel Count',
      severity: 'BLOCK',
      valueDisplay: `${metadata.channels} channels`,
      note: `Channel count ${metadata.channels} is invalid for stereo mastering.`
    });
    updateStatus('BLOCK');
    if (!primaryBlockReason) {
      primaryBlockReason = `Your audio file has ${metadata.channels} channels. Stereo (2 channels) or mono (1 channel) files are required.`;
    }
  }

  // 2. Integrated Loudness
  if (analysis.integratedLufs > gate.loudness.blockLufs) { // > -9 LUFS
    rules.push({
      check: 'Integrated Loudness',
      severity: 'BLOCK',
      valueDisplay: `${analysis.integratedLufs.toFixed(1)} LUFS`,
      note: `Your mix is already loud (${analysis.integratedLufs.toFixed(1)} LUFS). There's limited room to master it without adding distortion. For best results, export with the mix-bus limiter bypassed.`
    });
    updateStatus('BLOCK');
    if (!primaryBlockReason) {
      primaryBlockReason = `Your mix is already at ${analysis.integratedLufs.toFixed(1)} LUFS with limiting on the master bus, so there's no headroom left to master it without adding distortion.`;
    }
  } else if (analysis.integratedLufs > gate.loudness.warnLufs) { // > -12 LUFS
    const note = `Your mix is already loud (${analysis.integratedLufs.toFixed(1)} LUFS). There's limited room to master it without adding distortion. For best results, export with the mix-bus limiter bypassed.`;
    rules.push({
      check: 'Integrated Loudness',
      severity: 'WARN',
      valueDisplay: `${analysis.integratedLufs.toFixed(1)} LUFS`,
      note
    });
    notes.push(note);
    updateStatus('WARN');
  } else {
    rules.push({
      check: 'Integrated Loudness',
      severity: 'PASS',
      valueDisplay: `${analysis.integratedLufs.toFixed(1)} LUFS`
    });
  }

  // 3. PLR (Peak to Loudness Ratio)
  if (analysis.plr < gate.plr.blockDb) { // < 7 dB
    rules.push({
      check: 'PLR (Peak to Loudness Ratio)',
      severity: 'BLOCK',
      valueDisplay: `${analysis.plr.toFixed(1)} dB`,
      note: `Your peaks are close to your average level (${analysis.plr.toFixed(1)} dB), which usually means the mix bus is already compressed or limited.`
    });
    updateStatus('BLOCK');
    if (!primaryBlockReason) {
      primaryBlockReason = `The dynamic range is too narrow (PLR ${analysis.plr.toFixed(1)} dB), indicating excessive mix-bus limiting.`;
    }
  } else if (analysis.plr < gate.plr.warnDb) { // < 10 dB
    const note = `Your peaks are close to your average level (${analysis.plr.toFixed(1)} dB), which usually means the mix bus is already compressed or limited.`;
    rules.push({
      check: 'PLR (Peak to Loudness Ratio)',
      severity: 'WARN',
      valueDisplay: `${analysis.plr.toFixed(1)} dB`,
      note
    });
    notes.push(note);
    updateStatus('WARN');
  } else {
    rules.push({
      check: 'PLR (Peak to Loudness Ratio)',
      severity: 'PASS',
      valueDisplay: `${analysis.plr.toFixed(1)} dB`
    });
  }

  // 4. Clipping Events & True Peak
  const isClippingBlock = analysis.clippingEvents >= gate.clipping.blockRunsMin || analysis.truePeak > gate.clipping.blockTruePeakDb;
  if (isClippingBlock) {
    rules.push({
      check: 'Waveform Clipping',
      severity: 'BLOCK',
      valueDisplay: `${analysis.clippingEvents} runs (${analysis.truePeak.toFixed(2)} dBTP)`,
      note: `We found ${analysis.clippingEvents} spots where the waveform hits full scale and clips. Lower the mix-bus output and re-export.`
    });
    updateStatus('BLOCK');
    if (!primaryBlockReason) {
      primaryBlockReason = `Your mix is clipping in ${analysis.clippingEvents} places (true peak ${analysis.truePeak.toFixed(2)} dBTP), so there's no headroom left to master it without adding distortion.`;
    }
  } else if (analysis.clippingEvents >= gate.clipping.warnRunsMin) { // 1-9 runs
    const note = `We found ${analysis.clippingEvents} spots where the waveform hits full scale and clips. Lower the mix-bus output and re-export.`;
    rules.push({
      check: 'Waveform Clipping',
      severity: 'WARN',
      valueDisplay: `${analysis.clippingEvents} runs`,
      note
    });
    notes.push(note);
    updateStatus('WARN');
  } else {
    rules.push({
      check: 'Waveform Clipping',
      severity: 'PASS',
      valueDisplay: `0 events (${analysis.truePeak.toFixed(2)} dBTP)`
    });
  }

  // 5. Short-Term Crest Factor
  if (analysis.shortTermCrestMedian < gate.shortTermCrest.blockDb) { // < 6 dB
    rules.push({
      check: 'Short-Term Crest Factor',
      severity: 'BLOCK',
      valueDisplay: `${analysis.shortTermCrestMedian.toFixed(1)} dB`,
      note: `Transients (drum hits, attacks) are already squashed. Mastering can't bring them back.`
    });
    updateStatus('BLOCK');
    if (!primaryBlockReason) {
      primaryBlockReason = `The transients in your mix are already heavily squashed (crest ${analysis.shortTermCrestMedian.toFixed(1)} dB), so mastering cannot enhance dynamics.`;
    }
  } else if (analysis.shortTermCrestMedian < gate.shortTermCrest.warnDb) { // < 8 dB
    const note = `Transients (drum hits, attacks) are already squashed. Mastering can't bring them back.`;
    rules.push({
      check: 'Short-Term Crest Factor',
      severity: 'WARN',
      valueDisplay: `${analysis.shortTermCrestMedian.toFixed(1)} dB`,
      note
    });
    notes.push(note);
    updateStatus('WARN');
  } else {
    rules.push({
      check: 'Short-Term Crest Factor',
      severity: 'PASS',
      valueDisplay: `${analysis.shortTermCrestMedian.toFixed(1)} dB`
    });
  }

  // 6. Sample Peak / Headroom
  if (analysis.samplePeak > gate.samplePeakHeadroom.warnDbfs) { // > -1.0 dBFS
    const note = `Your peaks are above −1 dBFS. Leave more headroom: peaks around −6 dBFS are ideal for mastering.`;
    rules.push({
      check: 'Peak Headroom',
      severity: 'WARN',
      valueDisplay: `${analysis.samplePeak.toFixed(2)} dBFS`,
      note
    });
    notes.push(note);
    updateStatus('WARN');
  } else {
    rules.push({
      check: 'Peak Headroom',
      severity: 'PASS',
      valueDisplay: `${analysis.samplePeak.toFixed(2)} dBFS`
    });
  }

  // 7. Stereo Phase Correlation
  if (analysis.stereoCorrelation < gate.stereoCorrelation.block) { // < 0.0
    rules.push({
      check: 'Stereo Phase Correlation',
      severity: 'BLOCK',
      valueDisplay: `${analysis.stereoCorrelation.toFixed(2)}`,
      note: `Parts of your mix are out of phase and may disappear on mono speakers (phones, clubs, Bluetooth). Check stereo wideners and polarity.`
    });
    updateStatus('BLOCK');
    if (!primaryBlockReason) {
      primaryBlockReason = `Your mix has phase problems that will make parts of it disappear in mono (phase correlation ${analysis.stereoCorrelation.toFixed(2)}).`;
    }
  } else if (analysis.stereoCorrelation < gate.stereoCorrelation.warn) { // < 0.3
    const note = `Parts of your mix are out of phase and may disappear on mono speakers (phones, clubs, Bluetooth). Check stereo wideners and polarity.`;
    rules.push({
      check: 'Stereo Phase Correlation',
      severity: 'WARN',
      valueDisplay: `${analysis.stereoCorrelation.toFixed(2)}`,
      note
    });
    notes.push(note);
    updateStatus('WARN');
  } else {
    rules.push({
      check: 'Stereo Phase Correlation',
      severity: 'PASS',
      valueDisplay: `${analysis.stereoCorrelation.toFixed(2)}`
    });
  }

  // 8. DC Offset
  if (analysis.dcOffsetRaw.max > gate.dcOffset.warn) { // > 0.001
    const note = `Your file has a DC offset. A high-pass filter at 20 Hz on the mix bus usually fixes it.`;
    rules.push({
      check: 'DC Offset',
      severity: 'WARN',
      valueDisplay: `${analysis.dcOffsetRaw.max.toFixed(4)}`,
      note
    });
    notes.push(note);
    updateStatus('WARN');
  } else {
    rules.push({
      check: 'DC Offset',
      severity: 'PASS',
      valueDisplay: `Clean (<0.001)`
    });
  }

  // 9. Format (16-bit or lossy)
  const isLossy = metadata.isLossy || ['MP3', 'AAC', 'OGG'].includes(metadata.format);
  if (metadata.bitDepth === 16 || isLossy) {
    const note = `Please upload a 24-bit (or 32-bit float) WAV straight from your session. MP3/AAC files and 16-bit exports lose detail before mastering starts.`;
    rules.push({
      check: 'Audio Format',
      severity: 'WARN',
      valueDisplay: `${metadata.format} ${metadata.bitDepth}-bit`,
      note
    });
    notes.push(note);
    updateStatus('WARN');
  } else {
    rules.push({
      check: 'Audio Format',
      severity: 'PASS',
      valueDisplay: `${metadata.format} ${metadata.bitDepth}-bit`
    });
  }

  // INFO Checks (Report Notes Only - Never change overall gate result)
  // Flat Dynamics: LRA < 3.0 LU
  if (analysis.lra < info.flatDynamicsLraLu) {
    const note = `Your song stays at nearly the same level from start to finish (${analysis.lra.toFixed(1)} LU range). If you want the chorus to lift, build that contrast in the mix.`;
    rules.push({
      check: 'Dynamics Contrast',
      severity: 'INFO',
      valueDisplay: `${analysis.lra.toFixed(1)} LU`,
      note
    });
    notes.push(note);
  }

  // Dark Top End: HF Drop > 15 dB
  if (analysis.hfDropDb > info.darkTopHfDropDb) {
    const note = `The top end rolls off early (above ~16 kHz). If you want more air and sparkle, check your mix EQ or the source files.`;
    rules.push({
      check: 'High-Frequency Extension',
      severity: 'INFO',
      valueDisplay: `${analysis.hfDropDb.toFixed(1)} dB drop`,
      note
    });
    notes.push(note);
  }

  // Cold Start: First sample > -40 dBFS
  if (analysis.firstSampleDbfs > info.coldStartDbfs) {
    const note = `The audio starts instantly with no fade-in, which can cause a click on some players. We've added an inaudible 3 ms fade-in.`;
    rules.push({
      check: 'Start Transition',
      severity: 'INFO',
      valueDisplay: `${analysis.firstSampleDbfs.toFixed(1)} dBFS`,
      note
    });
    notes.push(note);
  }

  // Abrupt End: Last sample > -40 dBFS
  if (analysis.lastSampleDbfs > info.abruptEndDbfs) {
    const note = `The song ends abruptly without fading to silence, which can click at the end. Consider a short fade-out.`;
    rules.push({
      check: 'End Transition',
      severity: 'INFO',
      valueDisplay: `${analysis.lastSampleDbfs.toFixed(1)} dBFS`,
      note
    });
    notes.push(note);
  }

  const hasBlock = rules.some(r => r.severity === 'BLOCK');
  const hasWarn = rules.some(r => r.severity === 'WARN');
  const overallStatus: 'PASS' | 'WARN' | 'BLOCK' = hasBlock ? 'BLOCK' : hasWarn ? 'WARN' : 'PASS';

  let blockedMessage: GateEvaluationResult['blockedMessage'] = undefined;
  if (overallStatus === 'BLOCK') {
    blockedMessage = {
      headline: '⛔ This mix isn\'t ready to master',
      primaryReason: primaryBlockReason || `Your mix is already at ${analysis.integratedLufs.toFixed(1)} LUFS with limiting on the master bus, so there's no headroom left to master it without adding distortion.`,
      body: 'For the best result: export a version with the mix-bus limiter and clipper bypassed, with peaks around −6 dBFS, and upload it again.\n\nOr book a human master with HDQTRZ Mastering Studios and we\'ll work out the best approach together.'
    };
  }

  return {
    status: overallStatus,
    primaryBlockReason,
    blockedMessage,
    rules,
    notes
  };
}


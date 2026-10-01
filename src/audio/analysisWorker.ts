/**
 * Web Worker for standards-compliant audio analysis (Section 8.2)
 * Offloads heavy BS.1770-4 K-weighting, 4x polyphase FIR True Peak calculation,
 * and FFT spectral estimation off the main thread to keep UI responsive.
 */

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
import { estimateSpectralBands } from './analyzer';
import { TrackMetadata, AudioAnalysis, MixIssue, SpectralBands } from '../types';

export interface AnalysisWorkerInput {
  left: Float32Array;
  right: Float32Array;
  sampleRate: number;
  duration: number;
  metadata?: TrackMetadata;
}

export type AnalysisWorkerMessage =
  | { type: 'progress'; stage: string; progressPct: number }
  | { type: 'complete'; analysis: AudioAnalysis }
  | { type: 'error'; error: string };

self.onmessage = async (e: MessageEvent<AnalysisWorkerInput>) => {
  try {
    const { left, right, sampleRate, duration, metadata } = e.data;
    const length = left.length;

    self.postMessage({
      type: 'progress',
      stage: 'Ingesting Audio & Measuring Sample Levels...',
      progressPct: 10
    } satisfies AnalysisWorkerMessage);

    // 1. Peak & RMS & Clipping & DC Offset & Waveform thumbnail
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

    const waveformPoints = 100;
    const blockSize = Math.floor(length / waveformPoints) || 1;
    const waveformOverview: number[] = [];
    let currentBlockMax = 0;
    let blockCounter = 0;

    for (let i = 0; i < length; i++) {
      const l = left[i];
      const r = right[i];
      const absL = Math.abs(l);
      const absR = Math.abs(r);
      const maxSample = Math.max(absL, absR);

      if (maxSample > peakVal) peakVal = maxSample;
      if (absL >= 0.999 || absR >= 0.999) clippingCount++;

      sumLeft += l;
      sumRight += r;
      sumSqLeft += l * l;
      sumSqRight += r * r;

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

    self.postMessage({
      type: 'progress',
      stage: 'Filtering ITU-R BS.1770-4 K-Weighting...',
      progressPct: 25
    } satisfies AnalysisWorkerMessage);

    // 2. K-Weighting & Loudness
    const kCoeffs = getKWeightingCoefficients(sampleRate);
    const leftK = filterKWeightingChannel(left, kCoeffs);
    const rightK = filterKWeightingChannel(right, kCoeffs);

    self.postMessage({
      type: 'progress',
      stage: 'Computing EBU R128 Gated LUFS & Tech 3342 LRA...',
      progressPct: 40
    } satisfies AnalysisWorkerMessage);

    const {
      integratedLufs,
      shortTermLufs,
      momentaryLufs,
      lra,
      shortTermProfile
    } = computeLoudnessAndLra(leftK, rightK, sampleRate);

    self.postMessage({
      type: 'progress',
      stage: 'Measuring 4x Polyphase FIR True Peak (BS.1770-4 Annex 2)...',
      progressPct: 55
    } satisfies AnalysisWorkerMessage);

    // 3. 4x Polyphase FIR True Peak
    const truePeak = calculateTruePeak4x(left, right, (subPct) => {
      self.postMessage({
        type: 'progress',
        stage: 'Measuring 4x Polyphase FIR True Peak (BS.1770-4 Annex 2)...',
        progressPct: Math.round(55 + subPct * 0.2)
      } satisfies AnalysisWorkerMessage);
    });

    self.postMessage({
      type: 'progress',
      stage: 'Evaluating Short-Term Crest Factor & Clipping Runs...',
      progressPct: 78
    } satisfies AnalysisWorkerMessage);

    const crestFactor = Math.max(0, peakDbfs - rmsDbfs);
    const dynamicRange = Number(crestFactor.toFixed(1));
    const dcOffsetRaw = calculateDCOffset(left, right);
    const dcOffset = Math.max(Math.abs(sumLeft / length), Math.abs(sumRight / length)) * 100;
    const correlationDenom = Math.sqrt(leftEnergy * rightEnergy) || 1;
    const phaseCorrelation = Math.max(-1, Math.min(1, correlationNumerator / correlationDenom));
    const stereoCorrelation = calculateStereoCorrelation(left, right);
    const channelBalanceDb = rmsLeft > 0 && rmsRight > 0
      ? Number((20 * Math.log10(rmsLeft / rmsRight)).toFixed(2))
      : 0;
    const stereoWidth = Number(Math.min(2, Math.sqrt(sideEnergy / Math.max(midEnergy, 1e-20))).toFixed(2));
    const samplePeak = Number(peakDbfs.toFixed(2));
    const plr = Number((truePeak - integratedLufs).toFixed(1));
    const clippingEvents = countClippingEvents(left, right);
    const shortTermCrestMedian = calculateShortTermCrestMedian(left, right, sampleRate);
    const hfDropDb = calculateHighFrequencyDrop(left, right, sampleRate);
    const { firstSampleDbfs, lastSampleDbfs } = calculateStartEndLevels(left, right);

    self.postMessage({
      type: 'progress',
      stage: 'Estimating Spectral Energy Across 8 Acoustic Bands...',
      progressPct: 88
    } satisfies AnalysisWorkerMessage);

    const spectralBands: SpectralBands = estimateSpectralBands(left, right, sampleRate);
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

    // Problem diagnostics
    const detectedIssues: MixIssue[] = [];
    const lowToMidRatio = (spectralBands.subBass + spectralBands.bass) / Math.max(1, spectralBands.midrange + spectralBands.presence);
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
    }

    self.postMessage({
      type: 'progress',
      stage: 'Evaluating Mix Gate (PASS / WARN / BLOCK)...',
      progressPct: 95
    } satisfies AnalysisWorkerMessage);

    const analysisObj: AudioAnalysis = {
      integratedLufs,
      shortTermLufs,
      momentaryLufs,
      truePeak,
      peakDbfs,
      samplePeak,
      rmsDbfs,
      dynamicRange,
      crestFactor: Number(crestFactor.toFixed(1)),
      plr,
      lra,
      shortTermProfile,
      clippingEvents,
      shortTermCrestMedian,
      hfDropDb,
      stereoWidth,
      phaseCorrelation,
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
      intersamplePeaksPossible: truePeak > peakDbfs + 0.1,
      channelBalanceDb,
      detectedIssues,
      simpleSummary: `Measured ${integratedLufs.toFixed(1)} LUFS with ${truePeak.toFixed(2)} dBTP true-peak and ${dynamicRange.toFixed(1)} dB crest factor.`,
      waveformOverview
    };

    if (metadata) {
      analysisObj.gateEvaluation = evaluateMixGate(analysisObj, metadata);
    }

    self.postMessage({
      type: 'complete',
      analysis: analysisObj
    } satisfies AnalysisWorkerMessage);
  } catch (err) {
    self.postMessage({
      type: 'error',
      error: err instanceof Error ? err.message : 'Analysis failed in worker'
    } satisfies AnalysisWorkerMessage);
  }
};

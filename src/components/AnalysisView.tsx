import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Gauge,
  Layers,
  Radio,
  Sliders,
  Sparkles,
  Volume2,
  RotateCcw,
  Zap
} from 'lucide-react';
import { AudioAnalysis, TrackMetadata } from '../types';

interface AnalysisViewProps {
  analysis: AudioAnalysis;
  metadata: TrackMetadata;
  onProceed: () => void;
  onReUpload: () => void;
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({
  analysis,
  metadata,
  onProceed,
  onReUpload
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [overrideWarning, setOverrideWarning] = useState(false);

  const criticalIssues = analysis.detectedIssues.filter(i => i.severity === 'critical');
  const warningIssues = analysis.detectedIssues.filter(i => i.severity === 'warning');
  const infoIssues = analysis.detectedIssues.filter(i => i.severity === 'info');

  const hasCriticalWarning = criticalIssues.length > 0 || (warningIssues.length > 0 && !overrideWarning);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2 pt-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#111111] border border-white/5 text-[10px] uppercase tracking-[0.2em] text-[#D4AF37]">
          <span>02 / Mix Diagnostics & Spectral Map</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-light tracking-tight text-white">
          Mix Diagnostic Overview
        </h2>
        <p className="text-gray-400 text-xs sm:text-sm max-w-xl mx-auto font-light">
          HDQTRZ evaluated input loudness, dynamics, spectral balance, and phase correlation.
        </p>
      </div>

      {/* Simple Language Assessment Callout */}
      <div className="rounded-xl bg-[#0A0A0A] border border-white/10 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            <h3 className="text-xs uppercase tracking-widest text-[#D4AF37] font-medium">
              Acoustic Assessment
            </h3>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-gray-500">Autonomous Diagnostic</span>
        </div>

        <p className="text-gray-200 text-sm sm:text-base leading-relaxed font-light">
          "{analysis.simpleSummary}"
        </p>

        {/* Quick health pills */}
        <div className="flex flex-wrap gap-2 pt-1 text-xs">
          <span className="px-2.5 py-1 rounded bg-[#111111] text-gray-300 border border-white/5 flex items-center gap-1.5 text-[11px]">
            <Gauge className="w-3 h-3 text-[#D4AF37]" />
            Loudness: <strong className="text-white font-mono">{analysis.integratedLufs} LUFS</strong>
          </span>
          <span className="px-2.5 py-1 rounded bg-[#111111] text-gray-300 border border-white/5 flex items-center gap-1.5 text-[11px]">
            <Zap className="w-3 h-3 text-[#D4AF37]" />
            True Peak: <strong className="text-white font-mono">{analysis.truePeak} dBTP</strong>
          </span>
          <span className="px-2.5 py-1 rounded bg-[#111111] text-gray-300 border border-white/5 flex items-center gap-1.5 text-[11px]">
            <BarChart3 className="w-3 h-3 text-[#D4AF37]" />
            Dynamic Range: <strong className="text-white font-mono">{analysis.dynamicRange} dB</strong>
          </span>
          <span className="px-2.5 py-1 rounded bg-[#111111] text-gray-300 border border-white/5 flex items-center gap-1.5 text-[11px]">
            <Radio className="w-3 h-3 text-[#D4AF37]" />
            Phase: <strong className="text-white">{analysis.phaseCorrelation > 0.5 ? 'Mono Compatible' : 'Wide / Check Lows'}</strong>
          </span>
        </div>
      </div>

      {/* Mix Problem Warnings Alert (if any issues flagged) OR Pristine Mix Certification */}
      {analysis.detectedIssues.length > 0 ? (
        <div className="rounded-xl bg-[#0A0A0A] border border-amber-500/20 p-5 space-y-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs uppercase tracking-wider text-amber-300 font-medium">
              Mix Observations & DSP Guardrails
            </h4>
          </div>

          <div className="space-y-2 pt-1">
            {analysis.detectedIssues.map((issue) => (
              <div
                key={issue.id}
                className="p-3 rounded-lg bg-[#0F0F0F] border border-white/5 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">{issue.title}</span>
                  {issue.frequencyRange && (
                    <span className="px-1.5 py-0.5 rounded bg-[#1A1A1A] text-[#D4AF37] font-mono text-[9px] uppercase tracking-wider">
                      {issue.frequencyRange}
                    </span>
                  )}
                </div>
                <p className="text-gray-400 text-xs leading-relaxed font-light">{issue.description}</p>
                <p className="text-[#D4AF37] text-[11px]">
                  → HDQTRZ Action: {issue.recommendation}
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-[11px] text-gray-500 border-t border-white/5">
            <span>The AI engine automatically compensates without squashing transient clarity.</span>
            <button
              onClick={onReUpload}
              className="text-gray-400 hover:text-white underline underline-offset-2 transition-colors"
            >
              Upload revised mix?
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-[#0A0A0A] border border-emerald-500/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs uppercase tracking-wider text-emerald-300 font-medium">
                Pristine Mix Balance Verified
              </h4>
              <p className="text-gray-400 text-xs font-light">
                No phase cancellation, spectral masking, or clipping detected. Mix headroom is primed for mastering.
              </p>
            </div>
          </div>
          <span className="self-start sm:self-center px-2.5 py-1 rounded bg-emerald-950/30 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono uppercase tracking-widest shrink-0">
            Acoustics QC Passed
          </span>
        </div>
      )}

      {/* Core Studio Meters Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Integrated LUFS */}
        <div className="bg-[#0F0F0F] p-4 rounded-lg border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-gray-500">
            <span>Integrated LUFS</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-light text-white">
            {analysis.integratedLufs}
          </div>
          <p className="text-[10px] text-gray-600 uppercase tracking-tight">ITU-R BS.1770</p>
        </div>

        {/* True Peak */}
        <div className="bg-[#0F0F0F] p-4 rounded-lg border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-gray-500">
            <span>True Peak</span>
            <span className={`w-1.5 h-1.5 rounded-full ${analysis.truePeak > 0 ? 'bg-red-500' : 'bg-emerald-400'}`} />
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-light text-white">
            {analysis.truePeak} <span className="text-xs text-gray-400">dBTP</span>
          </div>
          <p className="text-[10px] text-gray-600 uppercase tracking-tight">
            {analysis.truePeak > 0 ? 'Full Scale Exceeded' : 'Clean Headroom'}
          </p>
        </div>

        {/* Dynamic Range */}
        <div className="bg-[#0F0F0F] p-4 rounded-lg border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-gray-500">
            <span>Dynamic Range</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-light text-white">
            {analysis.dynamicRange} <span className="text-xs text-gray-400">dB</span>
          </div>
          <p className="text-[10px] text-gray-600 uppercase tracking-tight">Crest: {analysis.crestFactor} dB</p>
        </div>

        {/* Stereo Width */}
        <div className="bg-[#0F0F0F] p-4 rounded-lg border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-gray-500">
            <span>Correlation</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-light text-white">
            {analysis.phaseCorrelation > 0 ? `+${analysis.phaseCorrelation}` : analysis.phaseCorrelation}
          </div>
          <p className="text-[10px] text-gray-600 uppercase tracking-tight">
            Width Index: {analysis.stereoWidth}x
          </p>
        </div>
      </div>

      {/* Energy Balance Bar */}
      <div className="rounded-xl bg-[#0A0A0A] border border-white/5 p-5 space-y-3">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-gray-500">
          <span>Spectral Energy Distribution</span>
          <span>Acoustic Weighting</span>
        </div>

        {/* Multi-segment bar */}
        <div className="h-3 w-full rounded bg-[#111111] overflow-hidden flex">
          <div
            style={{ width: `${analysis.lowEnergyPct}%` }}
            className="bg-[#996515] h-full transition-all"
            title={`Low End: ${analysis.lowEnergyPct}%`}
          />
          <div
            style={{ width: `${analysis.midEnergyPct}%` }}
            className="bg-[#D4AF37] h-full transition-all"
            title={`Midrange: ${analysis.midEnergyPct}%`}
          />
          <div
            style={{ width: `${analysis.highEnergyPct}%` }}
            className="bg-[#E5C158] opacity-75 h-full transition-all"
            title={`Highs: ${analysis.highEnergyPct}%`}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
          <div className="flex items-center gap-2 text-[11px]">
            <span className="w-2 h-2 rounded-sm bg-[#996515]" />
            <span>Low End ({analysis.lowEnergyPct}%)</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="w-2 h-2 rounded-sm bg-[#D4AF37]" />
            <span>Midrange ({analysis.midEnergyPct}%)</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="w-2 h-2 rounded-sm bg-[#E5C158] opacity-75" />
            <span>Highs & Air ({analysis.highEnergyPct}%)</span>
          </div>
        </div>
      </div>

      {/* Advanced Analysis Toggle */}
      <div className="space-y-3">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full py-2.5 px-4 rounded-md bg-[#111111] hover:bg-[#1A1A1A] border border-white/5 text-gray-400 hover:text-white text-[10px] uppercase tracking-[0.15em] flex items-center justify-center gap-2 transition-colors"
        >
          <span>{showAdvanced ? 'Hide Detailed Frequency Specs' : 'Show 8-Band Energy Breakdown & Intersample Profile'}</span>
          {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showAdvanced && (
          <div className="p-5 rounded-xl bg-[#0A0A0A] border border-white/5 space-y-5">
            <h4 className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-medium">
              8-Band Acoustic Spectrum Profile (dB Energy)
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-lg bg-[#0F0F0F] border border-white/5">
                <span className="text-[10px] uppercase tracking-wider text-gray-500 block">Sub-Bass (20-60 Hz)</span>
                <span className="font-mono text-sm text-white">
                  {analysis.spectralBands.subBass} dB
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#0F0F0F] border border-white/5">
                <span className="text-[10px] uppercase tracking-wider text-gray-500 block">Bass (60-250 Hz)</span>
                <span className="font-mono text-sm text-white">
                  {analysis.spectralBands.bass} dB
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#0F0F0F] border border-white/5">
                <span className="text-[10px] uppercase tracking-wider text-gray-500 block">Low-Mids (250-500 Hz)</span>
                <span className="font-mono text-sm text-white">
                  {analysis.spectralBands.lowMids} dB
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#0F0F0F] border border-white/5">
                <span className="text-[10px] uppercase tracking-wider text-gray-500 block">Midrange (500-2k Hz)</span>
                <span className="font-mono text-sm text-[#D4AF37]">
                  {analysis.spectralBands.midrange} dB
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#0F0F0F] border border-white/5">
                <span className="text-[10px] uppercase tracking-wider text-gray-500 block">Presence (2k-4k Hz)</span>
                <span className="font-mono text-sm text-white">
                  {analysis.spectralBands.presence} dB
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#0F0F0F] border border-white/5">
                <span className="text-[10px] uppercase tracking-wider text-gray-500 block">Upper-Mids (4k-6k Hz)</span>
                <span className="font-mono text-sm text-white">
                  {analysis.spectralBands.upperMids} dB
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#0F0F0F] border border-white/5">
                <span className="text-[10px] uppercase tracking-wider text-gray-500 block">Treble (6k-12k Hz)</span>
                <span className="font-mono text-sm text-white">
                  {analysis.spectralBands.treble} dB
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#0F0F0F] border border-white/5">
                <span className="text-[10px] uppercase tracking-wider text-gray-500 block">Air (12k-20k Hz)</span>
                <span className="font-mono text-sm text-[#D4AF37]">
                  {analysis.spectralBands.air} dB
                </span>
              </div>
            </div>

            {/* Intersample Peak & DC Offset Specs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/5 text-xs">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-gray-500 block">Momentary LUFS</span>
                <span className="font-mono text-white text-xs">{analysis.momentaryLufs} LUFS</span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-gray-500 block">Short-Term LUFS</span>
                <span className="font-mono text-white text-xs">{analysis.shortTermLufs} LUFS</span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-gray-500 block">DC Offset</span>
                <span className="font-mono text-white text-xs">{analysis.dcOffset}%</span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-gray-500 block">Channel Balance (L/R)</span>
                <span className="font-mono text-white text-xs">{analysis.channelBalanceDb} dB</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/5">
        <button
          onClick={onReUpload}
          className="w-full sm:w-auto px-4 py-3 rounded-md bg-[#111111] hover:bg-[#1A1A1A] border border-white/5 text-xs uppercase tracking-wider text-gray-300 transition-colors flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Change Track</span>
        </button>

        <button
          onClick={onProceed}
          className="w-full sm:w-auto px-6 py-3.5 rounded-md font-bold text-xs uppercase tracking-[0.2em] transition-colors flex items-center justify-center gap-2 bg-[#D4AF37] hover:bg-[#C19A2E] text-black"
        >
          <span>Select Mastering Preferences</span>
          <ArrowRight className="w-3.5 h-3.5 text-black" />
        </button>
      </div>
    </div>
  );
};

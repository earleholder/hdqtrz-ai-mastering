import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Gauge,
  HelpCircle,
  Radio,
  RotateCcw,
  Sparkles,
  Volume2,
  XCircle,
  Zap
} from 'lucide-react';
import { AudioAnalysis, TrackMetadata } from '../types';
import { CONFIG } from '../audio/config';

interface AnalysisViewProps {
  analysis: AudioAnalysis;
  metadata: TrackMetadata;
  applyColdStartFade: boolean;
  onToggleColdStartFade: (enabled: boolean) => void;
  onProceed: () => void;
  onReUpload: () => void;
  onOpenHumanStudio: () => void;
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({
  analysis,
  metadata,
  applyColdStartFade,
  onToggleColdStartFade,
  onProceed,
  onReUpload,
  onOpenHumanStudio
}) => {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const gateEval = analysis.gateEvaluation || {
    status: 'PASS' as const,
    rules: [],
    notes: []
  };

  const status = gateEval.status; // 'PASS' | 'WARN' | 'BLOCK'

  // Key numbers & dot colors per Section 5 thresholds
  const lufs = analysis.integratedLufs;
  const lufsColor = lufs > CONFIG.gate.loudness.blockLufs
    ? 'text-rose-400 bg-rose-500'
    : lufs > CONFIG.gate.loudness.warnLufs
    ? 'text-amber-400 bg-amber-500'
    : 'text-emerald-400 bg-emerald-500';

  const tp = analysis.truePeak;
  const tpColor = tp > CONFIG.gate.clipping.blockTruePeakDb
    ? 'text-rose-400 bg-rose-500'
    : tp > -1.0
    ? 'text-amber-400 bg-amber-500'
    : 'text-emerald-400 bg-emerald-500';

  const plr = analysis.plr ?? Number((tp - lufs).toFixed(1));
  const plrColor = plr < CONFIG.gate.plr.blockDb
    ? 'text-rose-400 bg-rose-500'
    : plr < CONFIG.gate.plr.warnDb
    ? 'text-amber-400 bg-amber-500'
    : 'text-emerald-400 bg-emerald-500';

  const lra = analysis.lra ?? 0.0;
  const lraColor = lra < CONFIG.info.flatDynamicsLraLu
    ? 'text-amber-400 bg-amber-500'
    : 'text-emerald-400 bg-emerald-500';

  const corr = analysis.stereoCorrelation ?? analysis.phaseCorrelation;
  const corrColor = corr < CONFIG.gate.stereoCorrelation.block
    ? 'text-rose-400 bg-rose-500'
    : corr < CONFIG.gate.stereoCorrelation.warn
    ? 'text-amber-400 bg-amber-500'
    : 'text-emerald-400 bg-emerald-500';

  // Short-term profile graph data
  const profile = analysis.shortTermProfile || [];

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* 6.1 Status Banner */}
      <div className="text-center space-y-3 pt-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#1E4263] border border-cyan-100/20 text-[10px] uppercase tracking-[0.2em] text-[#57E6FF]">
          <span>02 / Mix Report Card</span>
        </div>

        {status === 'PASS' && (
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between gap-4 max-w-2xl mx-auto shadow-lg shadow-emerald-950/20">
            <div className="flex items-center gap-3.5 text-left">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0 text-xl font-bold">
                ✓
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-medium text-emerald-300">
                  Ready to master
                </h3>
                <p className="text-xs text-emerald-100/80 font-light">
                  Your mix meets all dynamic, headroom, and phase safety criteria for AI Preview mastering.
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-flex px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-medium">
              PASS
            </span>
          </div>
        )}

        {status === 'WARN' && (
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-950/40 border border-amber-500/50 flex items-center justify-between gap-4 max-w-2xl mx-auto shadow-lg shadow-amber-950/20">
            <div className="flex items-center gap-3.5 text-left">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0 text-xl font-bold">
                ⚠
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-medium text-amber-300">
                  Ready, with notes
                </h3>
                <p className="text-xs text-amber-100/80 font-light">
                  Your mix has specific characteristics flagged below. You may proceed to AI Preview or upload a revised session export.
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-flex px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-mono font-medium">
              WARN
            </span>
          </div>
        )}

        {status === 'BLOCK' && (
          <div className="p-4 sm:p-5 rounded-2xl bg-rose-950/50 border border-rose-500/60 flex items-center justify-between gap-4 max-w-2xl mx-auto shadow-lg shadow-rose-950/30">
            <div className="flex items-center gap-3.5 text-left">
              <div className="w-10 h-10 rounded-full bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400 shrink-0 text-xl font-bold">
                ⛔
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-medium text-rose-300">
                  Not ready to master
                </h3>
                <p className="text-xs text-rose-100/80 font-light">
                  This mix exceeds safe mastering tolerances. Automated processing has been halted to prevent distortion.
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-flex px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-mono font-medium">
              BLOCK
            </span>
          </div>
        )}
      </div>

      {/* 6.3 Blocked-Mix Message (If status === 'BLOCK') */}
      {status === 'BLOCK' && gateEval.blockedMessage && (
        <div className="rounded-2xl bg-[#142338] border-2 border-rose-500/60 p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="space-y-3">
            <h3 className="text-xl sm:text-2xl font-semibold text-rose-300">
              {gateEval.blockedMessage.headline}
            </h3>
            <p className="text-base sm:text-lg text-white font-normal leading-relaxed">
              {gateEval.blockedMessage.primaryReason}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0F1C2E] border border-cyan-100/10 space-y-2 text-sm text-slate-200 font-light leading-relaxed">
            <p>
              <strong className="text-[#57E6FF] font-medium">For the best result:</strong> export a version with the mix-bus limiter and clipper bypassed, with peaks around <span className="font-mono text-white">−6 dBFS</span>, and upload it again.
            </p>
            <p>
              <strong className="text-white font-medium">Or</strong> book a human master with HDQTRZ Mastering Studios and we'll work out the best approach together.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
            <button
              onClick={onReUpload}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white hover:bg-slate-200 text-black font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Upload a new mix
            </button>
            <button
              onClick={onOpenHumanStudio}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#1E4263] hover:bg-[#285782] border border-cyan-100/30 text-[#57E6FF] font-semibold text-sm transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-[#57E6FF]" />
              Book a human master
            </button>
          </div>
        </div>
      )}

      {/* 6.1 Key Numbers with Indicator Dots */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        {/* 1. Loudness */}
        <div className="p-4 rounded-xl bg-[#173653] border border-cyan-100/20 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-300">
            <span>Loudness</span>
            <span className={`w-2.5 h-2.5 rounded-full ${lufsColor.split(' ')[1]}`} />
          </div>
          <div className="text-lg sm:text-2xl font-mono font-semibold text-white">
            {lufs.toFixed(1)} <span className="text-xs font-normal text-slate-300 font-sans">LUFS</span>
          </div>
          <div className="text-[10px] text-slate-400">Target: -14 LUFS</div>
        </div>

        {/* 2. True Peak */}
        <div className="p-4 rounded-xl bg-[#173653] border border-cyan-100/20 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-300">
            <span>True Peak</span>
            <span className={`w-2.5 h-2.5 rounded-full ${tpColor.split(' ')[1]}`} />
          </div>
          <div className="text-lg sm:text-2xl font-mono font-semibold text-white">
            {tp.toFixed(2)} <span className="text-xs font-normal text-slate-300 font-sans">dBTP</span>
          </div>
          <div className="text-[10px] text-slate-400">Ceiling: -1.0 dBTP</div>
        </div>

        {/* 3. PLR */}
        <div className="p-4 rounded-xl bg-[#173653] border border-cyan-100/20 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-300">
            <span>PLR (Dynamics)</span>
            <span className={`w-2.5 h-2.5 rounded-full ${plrColor.split(' ')[1]}`} />
          </div>
          <div className="text-lg sm:text-2xl font-mono font-semibold text-white">
            {plr.toFixed(1)} <span className="text-xs font-normal text-slate-300 font-sans">dB</span>
          </div>
          <div className="text-[10px] text-slate-400">Min safe: 10 dB</div>
        </div>

        {/* 4. Loudness Range */}
        <div className="p-4 rounded-xl bg-[#173653] border border-cyan-100/20 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-300">
            <span>LRA Range</span>
            <span className={`w-2.5 h-2.5 rounded-full ${lraColor.split(' ')[1]}`} />
          </div>
          <div className="text-lg sm:text-2xl font-mono font-semibold text-white">
            {lra.toFixed(1)} <span className="text-xs font-normal text-slate-300 font-sans">LU</span>
          </div>
          <div className="text-[10px] text-slate-400">EBU Tech 3342</div>
        </div>

        {/* 5. Stereo Correlation */}
        <div className="col-span-2 sm:col-span-1 p-4 rounded-xl bg-[#173653] border border-cyan-100/20 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-300">
            <span>Phase Corr</span>
            <span className={`w-2.5 h-2.5 rounded-full ${corrColor.split(' ')[1]}`} />
          </div>
          <div className="text-lg sm:text-2xl font-mono font-semibold text-white">
            {corr.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-400">Mono safe: &gt; 0.3</div>
        </div>
      </div>

      {/* 6.1 Short-Term Loudness Profile Graph */}
      {profile.length > 1 && (
        <div className="rounded-xl bg-[#173653] border border-cyan-100/30 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#57E6FF] font-medium">
              <BarChart3 className="w-4 h-4 text-[#57E6FF]" />
              <span>Short-Term Loudness Profile (3s Windows / 1s Hop)</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">EBU R128</span>
          </div>

          {/* SVG Graph */}
          <div className="w-full h-32 bg-[#0E2034] rounded-lg p-2 border border-cyan-100/10 relative">
            <svg
              className="w-full h-full overflow-visible"
              viewBox={`0 0 ${profile.length} 100`}
              preserveAspectRatio="none"
            >
              {/* Reference Grid Line (-14 LUFS) */}
              {/* Map -30 LUFS to -6 LUFS into 0 to 100 y coordinate */}
              <line
                x1="0"
                y1={(( -14 - (-30) ) / 24) * 100}
                x2={profile.length}
                y2={(( -14 - (-30) ) / 24) * 100}
                stroke="#57E6FF"
                strokeDasharray="4 4"
                strokeWidth="1"
                opacity="0.4"
              />

              {/* Sparkline path */}
              <polyline
                fill="none"
                stroke="#57E6FF"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={profile
                  .map((p, idx) => {
                    const clampedLufs = Math.max(-30, Math.min(-6, p.lufs));
                    // In SVG y=0 is top, y=100 is bottom
                    const y = 100 - ((clampedLufs - (-30)) / 24) * 100;
                    return `${idx},${y.toFixed(1)}`;
                  })
                  .join(' ')}
              />
            </svg>
            <div className="absolute top-2 right-3 text-[10px] font-mono text-[#57E6FF]/80">
              -14 LUFS Target Line
            </div>
          </div>
        </div>
      )}

      {/* 6.2 Customer Notes (One plain-language sentence per triggered item) */}
      {gateEval.notes.length > 0 && (
        <div className="rounded-xl bg-[#173653] border border-cyan-100/30 p-5 space-y-3">
          <div className="flex items-center gap-2 border-b border-cyan-100/20 pb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs uppercase tracking-wider text-white font-medium">
              Mix Observations & Notes
            </h4>
          </div>

          <div className="space-y-2.5 pt-1">
            {gateEval.notes.map((note, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-lg bg-[#14263B] border border-cyan-100/20 text-xs sm:text-sm text-slate-100 font-light leading-relaxed flex items-start gap-2.5"
              >
                <span className="text-[#57E6FF] mt-0.5">•</span>
                <span>{note}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7.5 Cold-Start Option Toggle */}
      <div className="rounded-xl bg-[#173653] border border-cyan-100/30 p-4 sm:p-5 flex items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-white font-medium">
              Click-Prevention Cold-Start Fade
            </span>
            <span className="px-2 py-0.5 rounded bg-[#1E4263] text-[#57E6FF] text-[9px] uppercase tracking-wider font-mono">
              3 ms Raised Cosine
            </span>
          </div>
          <p className="text-xs text-slate-300 font-light">
            Smooths instant audio attacks that can cause speaker clicks on consumer devices. Recommended on by default.
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={applyColdStartFade}
            onChange={(e) => onToggleColdStartFade(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#57E6FF]"></div>
        </label>
      </div>

      {/* 6.1 Call to Action (Always Shown per Section 6.1) */}
      <div className="rounded-2xl bg-gradient-to-r from-[#173653] via-[#1A3F64] to-[#122A44] border border-[#57E6FF]/40 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#57E6FF] font-medium">
            <Sparkles className="w-4 h-4 text-[#57E6FF]" />
            <span>Analog Human Mastering Suite</span>
          </div>
          <h3 className="text-lg sm:text-xl font-light text-white leading-snug">
            {CONFIG.wording.cta}
          </h3>
          <p className="text-xs text-slate-300 font-light max-w-xl">
            Custom analog outboard processing (Manley, Weiss, Tube-Tech), surgical stem mixing review, and dedicated Apple Digital Masters delivery.
          </p>
        </div>
        <button
          onClick={onOpenHumanStudio}
          className="px-6 py-3 rounded-xl bg-[#57E6FF] hover:bg-[#41CBE8] text-black font-semibold text-xs uppercase tracking-wider transition-all shrink-0 shadow-lg"
        >
          Book a Session
        </button>
      </div>

      {/* Action Buttons for PASS / WARN flow (Section 6.4) */}
      {status !== 'BLOCK' && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-cyan-100/20">
          <button
            onClick={onReUpload}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#173653] hover:bg-[#1E4263] border border-cyan-100/30 text-slate-200 text-xs font-medium uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Upload a new mix
          </button>

          <button
            onClick={onProceed}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#57E6FF] to-[#36C4F0] hover:brightness-110 text-black font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
          >
            <span>Continue to AI Preview</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

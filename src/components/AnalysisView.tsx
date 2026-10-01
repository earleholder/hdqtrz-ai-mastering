import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Info,
  CheckSquare,
  ShieldAlert,
  Sliders,
  Table
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
  const [showGraphTable, setShowGraphTable] = useState(false);

  const gateEval = analysis.gateEvaluation || {
    status: 'PASS' as const,
    rules: [],
    notes: []
  };

  const status = gateEval.status; // 'PASS' | 'WARN' | 'BLOCK'
  const isShortProgram = metadata.duration !== undefined && metadata.duration < 60;

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
  // If short program, LRA is not decision-driving
  const lraColor = isShortProgram
    ? 'text-slate-300 bg-slate-500'
    : lra < CONFIG.info.flatDynamicsLraLu
    ? 'text-amber-400 bg-amber-500'
    : 'text-emerald-400 bg-emerald-500';

  const corr = analysis.stereoCorrelation ?? analysis.phaseCorrelation;
  const corrColor = corr < CONFIG.gate.stereoCorrelation.block
    ? 'text-rose-400 bg-rose-500'
    : corr < CONFIG.gate.stereoCorrelation.warn
    ? 'text-amber-400 bg-amber-500'
    : 'text-emerald-400 bg-emerald-500';

  // Aesthetic risk indicators for technically passing / mild warning mixes (Feature 4)
  const aestheticIndicators: { title: string; desc: string }[] = [];
  if (!isShortProgram && lra < CONFIG.info.flatDynamicsLraLu) {
    aestheticIndicators.push({
      title: 'Flat Dynamics (Low LRA)',
      desc: `Loudness range is ${lra.toFixed(1)} LU. The song maintains uniform level throughout. If you desire verse-to-chorus dynamic lift, build that into your mix arrangement.`
    });
  }
  if (analysis.spectralBalance && analysis.spectralBalance.highRatio < 0.06) {
    aestheticIndicators.push({
      title: 'Dark / Rolled-Off Top End',
      desc: 'High-frequency energy above 10 kHz is noticeably low. If not an intentional aesthetic choice (e.g. vintage lo-fi), adding gentle mix-bus air can prevent a dull playback translation.'
    });
  }
  if (corr < 0.5 && corr >= 0.3) {
    aestheticIndicators.push({
      title: 'Wide / Unusual Stereo Image',
      desc: `Stereo phase correlation is ${corr.toFixed(2)}. While safe from complete cancellation, verify your low end on mono playback to confirm bass and kick punch hold together.`
    });
  }
  if (analysis.crestFactor < 8.0 && status !== 'BLOCK') {
    aestheticIndicators.push({
      title: 'Dense Crest Factor',
      desc: `Crest factor is ${analysis.crestFactor.toFixed(1)} dB. Drum transients are already tightly contained, limiting available headroom for further aggressive mastering.`
    });
  }

  // Short-term profile graph data
  const profile = analysis.shortTermProfile || [];

  return (
    <main className="space-y-8 max-w-4xl mx-auto" role="main" aria-label="Mix Analysis and Gate Evaluation">
      {/* 6.1 Status Banner with Empathetic Customer Language (Feature 3) */}
      <div className="text-center space-y-3 pt-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#1E4263] border border-cyan-100/20 text-[10px] uppercase tracking-[0.2em] text-[#57E6FF]">
          <span>02 / Mix Evaluation Card</span>
        </div>

        {status === 'PASS' && (
          <section
            className="p-5 sm:p-6 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between gap-4 max-w-2xl mx-auto shadow-lg shadow-emerald-950/20"
            aria-live="polite"
          >
            <div className="flex items-center gap-4 text-left">
              <div
                className="w-11 h-11 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0 text-2xl font-bold"
                aria-hidden="true"
              >
                ✓
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-medium text-emerald-300">
                    Ready for AI Preview
                  </h2>
                  <span className="sr-only">Outcome: Ready for AI Preview</span>
                </div>
                <p className="text-xs text-emerald-100/90 font-light mt-0.5">
                  Your mix meets all headroom, dynamic crest, and stereo phase criteria for transparent AI Preview mastering.
                </p>
              </div>
            </div>
            <span
              className="hidden sm:inline-flex px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-medium shrink-0"
              title="Technical Gate Code: PASS"
            >
              PASS
            </span>
          </section>
        )}

        {status === 'WARN' && (
          <section
            className="p-5 sm:p-6 rounded-2xl bg-amber-950/40 border border-amber-500/50 flex items-center justify-between gap-4 max-w-2xl mx-auto shadow-lg shadow-amber-950/20"
            aria-live="polite"
          >
            <div className="flex items-center gap-4 text-left">
              <div
                className="w-11 h-11 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0 text-2xl font-bold"
                aria-hidden="true"
              >
                ⚠
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-medium text-amber-300">
                    Revision recommended
                  </h2>
                  <span className="sr-only">Outcome: Revision recommended</span>
                </div>
                <p className="text-xs text-amber-100/90 font-light mt-0.5">
                  Your mix has specific characteristics flagged below. You may proceed to AI Preview by confirming, or upload a revised session export for optimal sonic results.
                </p>
              </div>
            </div>
            <span
              className="hidden sm:inline-flex px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-mono font-medium shrink-0"
              title="Technical Gate Code: WARN"
            >
              WARN
            </span>
          </section>
        )}

        {status === 'BLOCK' && (
          <section
            className="p-5 sm:p-6 rounded-2xl bg-rose-950/50 border border-rose-500/60 flex items-center justify-between gap-4 max-w-2xl mx-auto shadow-lg shadow-rose-950/30"
            aria-live="assertive"
          >
            <div className="flex items-center gap-4 text-left">
              <div
                className="w-11 h-11 rounded-full bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400 shrink-0 text-2xl font-bold"
                aria-hidden="true"
              >
                ⛔
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-medium text-rose-300">
                    Human review recommended / Not ready for automated processing
                  </h2>
                  <span className="sr-only">Outcome: Human review recommended / Not ready for automated processing</span>
                </div>
                <p className="text-xs text-rose-100/90 font-light mt-0.5">
                  This mix exceeds safe automated mastering tolerances. Processing has been blocked to protect your music from harsh distortion. No file has been generated.
                </p>
              </div>
            </div>
            <span
              className="hidden sm:inline-flex px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-mono font-medium shrink-0"
              title="Technical Gate Code: BLOCK"
            >
              BLOCK
            </span>
          </section>
        )}
      </div>

      {/* 6.3 Blocked-Mix Message & Diagnostic (Feature 3 & 7) */}
      {status === 'BLOCK' && gateEval.blockedMessage && (
        <article className="rounded-2xl bg-[#142338] border-2 border-rose-500/60 p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="space-y-3">
            <h3 className="text-xl sm:text-2xl font-semibold text-rose-300">
              {gateEval.blockedMessage.headline}
            </h3>
            <p className="text-base sm:text-lg text-white font-normal leading-relaxed">
              {gateEval.blockedMessage.primaryReason}
            </p>
          </div>

          {/* Mix Revision Checklist (Feature 7) */}
          <div className="p-5 rounded-xl bg-[#0F1C2E] border border-cyan-100/20 space-y-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#57E6FF] font-medium">
              <CheckSquare className="w-4 h-4 text-[#57E6FF]" />
              <span>Recommended Mix Revision Checklist Before Re-Exporting</span>
            </div>
            <ul className="space-y-2.5 text-xs text-slate-200 font-light leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-[#57E6FF] font-bold">•</span>
                <span><strong className="text-white font-medium">Bypass mix-bus limiter & clipper:</strong> Turn off any final brickwall limiters or master-channel hard clippers in your DAW so the mastering chain has dynamic headroom.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#57E6FF] font-bold">•</span>
                <span><strong className="text-white font-medium">Keep intentional creative bus processing:</strong> Analog saturation, glue compressors, and automation rides that shape your mix tone should remain active.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#57E6FF] font-bold">•</span>
                <span><strong className="text-white font-medium">Disable export normalization:</strong> Ensure your DAW's bounce dialog has "Normalize" turned OFF.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#57E6FF] font-bold">•</span>
                <span><strong className="text-white font-medium">Export at native session rate:</strong> Bounce as WAV or AIFF at your project's native sample rate (44.1 kHz, 48 kHz, or 96 kHz).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#57E6FF] font-bold">•</span>
                <span><strong className="text-white font-medium">Prefer 24-bit or 32-bit floating point:</strong> Avoid 16-bit truncation before mastering.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#57E6FF] font-bold">•</span>
                <span><strong className="text-white font-medium">Peak headroom guidance:</strong> Peaks around −3 to −6 dBFS provide ideal headroom. Clean 32-bit float mixes closer to full scale with intact crest factor and zero flat-top clipping runs are also workable.</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
            <button
              onClick={onReUpload}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white hover:bg-slate-200 text-black font-semibold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-[#57E6FF]"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Upload Revised Mix</span>
            </button>
            <button
              onClick={onOpenHumanStudio}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#1E4263] hover:bg-[#285782] border border-cyan-100/30 text-[#57E6FF] font-semibold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-[#57E6FF]"
            >
              <Sparkles className="w-4 h-4 text-[#57E6FF]" />
              <span>Book Earle Holder for Human Mastering</span>
            </button>
          </div>
        </article>
      )}

      {/* Mix Revision Checklist for WARN Status (Feature 7) */}
      {status === 'WARN' && (
        <article className="rounded-xl bg-[#173653] border border-amber-500/40 p-5 space-y-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-amber-300 font-medium">
            <CheckSquare className="w-4 h-4 text-amber-400" />
            <span>Mix Revision Best Practices (Optional before continuing)</span>
          </div>
          <p className="text-xs text-slate-200 font-light leading-relaxed">
            Your track can proceed to AI Preview right now, but addressing the flagged notes in your mix can significantly improve transient punch and depth.
          </p>
          <ul className="space-y-2 text-xs text-slate-200 font-light leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-amber-400">•</span>
              <span><strong className="text-white font-medium">Limiter headroom:</strong> If your mix is already loud or limited, pulling the master fader back to retain ~3 to 6 dB headroom allows our analog emulation EQ and multi-band dynamic stages to breathe.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400">•</span>
              <span><strong className="text-white font-medium">Export bit depth:</strong> If bounced at 16-bit or lossy MP3, consider re-exporting in 24-bit WAV to preserve harmonic clarity.</span>
            </li>
          </ul>
        </article>
      )}

      {/* 6.1 Key Numbers with Indicator Dots (Accessible color + text representation) */}
      <section aria-label="Acoustic Measurement Cards" className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        {/* 1. Loudness */}
        <div className="p-4 rounded-xl bg-[#173653] border border-cyan-100/20 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-300">
            <span>Loudness</span>
            <span
              className={`w-2.5 h-2.5 rounded-full ${lufsColor.split(' ')[1]}`}
              aria-hidden="true"
            />
          </div>
          <div className="text-lg sm:text-2xl font-mono font-semibold text-white">
            {lufs.toFixed(1)} <span className="text-xs font-normal text-slate-300 font-sans">LUFS</span>
          </div>
          <div className="text-[10px] text-slate-300 font-light">Target: -14 LUFS</div>
        </div>

        {/* 2. True Peak */}
        <div className="p-4 rounded-xl bg-[#173653] border border-cyan-100/20 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-300">
            <span>True Peak</span>
            <span
              className={`w-2.5 h-2.5 rounded-full ${tpColor.split(' ')[1]}`}
              aria-hidden="true"
            />
          </div>
          <div className="text-lg sm:text-2xl font-mono font-semibold text-white">
            {tp.toFixed(2)} <span className="text-xs font-normal text-slate-300 font-sans">dBTP</span>
          </div>
          <div className="text-[10px] text-slate-300 font-light">Ceiling: -1.0 dBTP</div>
        </div>

        {/* 3. PLR */}
        <div className="p-4 rounded-xl bg-[#173653] border border-cyan-100/20 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-300">
            <span>PLR (Dynamics)</span>
            <span
              className={`w-2.5 h-2.5 rounded-full ${plrColor.split(' ')[1]}`}
              aria-hidden="true"
            />
          </div>
          <div className="text-lg sm:text-2xl font-mono font-semibold text-white">
            {plr.toFixed(1)} <span className="text-xs font-normal text-slate-300 font-sans">dB</span>
          </div>
          <div className="text-[10px] text-slate-300 font-light">Min safe: 10 dB</div>
        </div>

        {/* 4. Loudness Range with Short-Program Handling (Feature 8) */}
        <div className="p-4 rounded-xl bg-[#173653] border border-cyan-100/20 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-300">
            <span>LRA Range</span>
            <span
              className={`w-2.5 h-2.5 rounded-full ${lraColor.split(' ')[1]}`}
              aria-hidden="true"
            />
          </div>
          <div className="text-lg sm:text-2xl font-mono font-semibold text-white">
            {lra.toFixed(1)} <span className="text-xs font-normal text-slate-300 font-sans">LU</span>
          </div>
          <div className="text-[10px] text-slate-300 font-light truncate">
            {isShortProgram ? 'Short program (<60s)' : 'EBU Tech 3342'}
          </div>
        </div>

        {/* 5. Stereo Correlation */}
        <div className="col-span-2 sm:col-span-1 p-4 rounded-xl bg-[#173653] border border-cyan-100/20 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-300">
            <span>Phase Corr</span>
            <span
              className={`w-2.5 h-2.5 rounded-full ${corrColor.split(' ')[1]}`}
              aria-hidden="true"
            />
          </div>
          <div className="text-lg sm:text-2xl font-mono font-semibold text-white">
            {corr.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-300 font-light">Mono safe: &gt; 0.3</div>
        </div>
      </section>

      {/* Short Program Explanation Notice (Feature 8) */}
      {isShortProgram && (
        <aside className="p-4 rounded-xl bg-[#142338] border border-cyan-100/20 text-xs text-slate-200 flex items-start gap-3">
          <Info className="w-4 h-4 text-[#57E6FF] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-medium text-white uppercase tracking-wider text-[11px]">
              Short Program Notice (Duration &lt; 60 seconds)
            </span>
            <p className="text-slate-300 font-light leading-relaxed">
              Per standard EBU Tech 3342, statistical Loudness Range (LRA) calculation requires longer program windows to produce meaningful dynamic distribution figures. LRA is reported for information only and is not decision-driving. All headroom, clipping, and phase safety checks remain active.
            </p>
          </div>
        </aside>
      )}

      {/* 6.1 Short-Term Loudness Profile Graph + Accessible Screen Reader Alternative (Feature 10) */}
      {profile.length > 1 && (
        <section aria-label="Short-Term Loudness Profile Graph" className="rounded-xl bg-[#173653] border border-cyan-100/30 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#57E6FF] font-medium">
              <BarChart3 className="w-4 h-4 text-[#57E6FF]" />
              <span>Short-Term Loudness Profile (3s Windows / 1s Hop)</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowGraphTable(!showGraphTable)}
                className="text-[11px] text-slate-300 hover:text-white flex items-center gap-1 underline focus-visible:ring-1 focus-visible:ring-[#57E6FF]"
                aria-expanded={showGraphTable}
              >
                <Table className="w-3 h-3 text-[#57E6FF]" />
                <span>{showGraphTable ? 'Hide data table' : 'Screen-reader table'}</span>
              </button>
              <span className="text-[10px] font-mono text-slate-400">EBU R128</span>
            </div>
          </div>

          {/* SVG Graph */}
          <div className="w-full h-32 bg-[#0E2034] rounded-lg p-2 border border-cyan-100/10 relative" aria-hidden="true">
            <svg
              className="w-full h-full overflow-visible"
              viewBox={`0 0 ${profile.length} 100`}
              preserveAspectRatio="none"
            >
              {/* Reference Grid Line (-14 LUFS) */}
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

          {/* Accessible Table Alternative (Feature 10) */}
          {showGraphTable && (
            <div className="pt-2 max-h-48 overflow-y-auto border-t border-cyan-100/10">
              <table className="w-full text-left text-xs font-mono text-slate-300">
                <caption className="sr-only">Sampled Short-Term Loudness Data Points</caption>
                <thead>
                  <tr className="border-b border-cyan-100/10 text-slate-400">
                    <th scope="col" className="p-1">Time (approx)</th>
                    <th scope="col" className="p-1">Short-Term LUFS</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.filter((_, i) => i % 5 === 0).map((p, idx) => (
                    <tr key={idx} className="border-b border-cyan-100/5">
                      <td className="p-1">{idx * 5}s</td>
                      <td className="p-1 text-white">{p.lufs.toFixed(1)} LUFS</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* 6.2 Customer Notes (One plain-language sentence per triggered item) */}
      {gateEval.notes.length > 0 && (
        <section aria-label="Ingest Gate Observations" className="rounded-xl bg-[#173653] border border-cyan-100/30 p-5 space-y-3">
          <div className="flex items-center gap-2 border-b border-cyan-100/20 pb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs uppercase tracking-wider text-white font-medium">
              Mix Observations & Gate Notes
            </h3>
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
        </section>
      )}

      {/* Feature 4: Aesthetic-Risk Indicators for Technically Passing Mixes */}
      {status !== 'BLOCK' && aestheticIndicators.length > 0 && (
        <article className="rounded-xl bg-[#142338] border border-cyan-100/30 p-5 space-y-3">
          <div className="flex items-center gap-2 border-b border-cyan-100/20 pb-3">
            <Sliders className="w-4 h-4 text-[#57E6FF]" />
            <h3 className="text-xs uppercase tracking-wider text-white font-medium">
              Aesthetic Context & Mix Characteristics
            </h3>
          </div>
          <p className="text-xs text-slate-300 font-light leading-relaxed">
            These indicators highlight stylistic tendencies in your mix. They are <strong className="text-white font-medium">not technical flaws</strong> or errors; your artistic vision is respected.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {aestheticIndicators.map((ind, idx) => (
              <div key={idx} className="p-3.5 rounded-lg bg-[#173653] border border-cyan-100/20 space-y-1">
                <div className="text-xs font-medium text-[#57E6FF]">{ind.title}</div>
                <p className="text-[11px] text-slate-300 font-light leading-relaxed">{ind.desc}</p>
              </div>
            ))}
          </div>
        </article>
      )}

      {/* Feature 5: Clear Limitations Panel */}
      <article className="rounded-xl bg-[#122438] border border-cyan-100/20 p-5 space-y-3 text-xs">
        <div className="flex items-center gap-2 border-b border-cyan-100/10 pb-2.5 text-slate-300">
          <HelpCircle className="w-4 h-4 text-[#57E6FF]" />
          <h3 className="uppercase tracking-wider font-medium text-white text-[11px]">
            Automated Processing Scope & Objective Limitations
          </h3>
        </div>
        <p className="text-slate-300 font-light leading-relaxed">
          Automated analysis evaluates objective acoustic and electrical metrics (BS.1770-4 LUFS, True Peak, dynamic crest, and phase correlation). Automated software <strong className="text-white font-medium">cannot evaluate</strong> vocal balance, arrangement density, lyrical masking, emotional impact, genre nuances, or artistic intent.
        </p>
        <p className="text-slate-400 font-light italic">
          Passing technical checks confirms safe headroom and dynamic compliance; it does not substitute for an experienced human mastering engineer's artistic ear.
        </p>
      </article>

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
            Smooths non-zero instant audio starts that cause DAC clicks on consumer earbuds and streaming apps.
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={applyColdStartFade}
            onChange={(e) => onToggleColdStartFade(e.target.checked)}
            className="sr-only peer"
            aria-label="Click-prevention cold-start fade toggle"
          />
          <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none focus-visible:ring-2 focus-visible:ring-[#57E6FF] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#57E6FF]"></div>
        </label>
      </div>

      {/* 6.1 Call to Action & 100% Credit Guarantee (Feature 4 & Centralized Policy) */}
      <aside aria-label="Human Mastering Upgrade Option" className="rounded-2xl bg-gradient-to-r from-[#173653] via-[#1A3F64] to-[#122A44] border border-[#57E6FF]/40 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#57E6FF] font-medium">
            <Sparkles className="w-4 h-4 text-[#57E6FF]" />
            <span>Analog Human Mastering Suite • Earle Holder</span>
          </div>
          <h3 className="text-lg sm:text-xl font-light text-white leading-snug">
            {CONFIG.wording.cta}
          </h3>
          <p className="text-xs text-slate-200 font-light max-w-xl leading-relaxed">
            Bespoke analog outboard processing (Manley, Weiss, Tube-Tech), surgical stem mixing review, album flow, and certified Apple Digital Masters delivery.
          </p>
          <div className="p-2.5 rounded-lg bg-[#0F2032] border border-[#57E6FF]/30 text-xs text-[#57E6FF] font-normal">
            ✓ {CONFIG.wording.creditPolicy}
          </div>
        </div>
        <button
          onClick={onOpenHumanStudio}
          className="px-6 py-3 rounded-xl bg-[#57E6FF] hover:bg-[#41CBE8] text-black font-semibold text-xs uppercase tracking-wider transition-all shrink-0 shadow-lg focus-visible:ring-2 focus-visible:ring-white"
        >
          Book Human Master
        </button>
      </aside>

      {/* Action Buttons for PASS / WARN flow (Section 6.4) */}
      {status !== 'BLOCK' && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-cyan-100/20">
          <button
            onClick={onReUpload}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#173653] hover:bg-[#1E4263] border border-cyan-100/30 text-slate-200 text-xs font-medium uppercase tracking-wider transition-colors flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-[#57E6FF]"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Upload Revised Mix</span>
          </button>

          <button
            onClick={onProceed}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#57E6FF] to-[#36C4F0] hover:brightness-110 text-black font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-white"
          >
            <span>Continue to AI Preview</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </main>
  );
};

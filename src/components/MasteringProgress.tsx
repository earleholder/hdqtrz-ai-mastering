import React from 'react';
import { Activity, CheckCircle2, Disc3, Layers, Radio, ShieldCheck, Sliders, Sparkles, Volume2 } from 'lucide-react';

interface MasteringProgressProps {
  currentStage: string;
  progressPct: number;
  genre: string;
  targetLufs: number;
}

export const MasteringProgress: React.FC<MasteringProgressProps> = ({
  currentStage,
  progressPct,
  genre,
  targetLufs
}) => {
  const stages = [
    { label: 'Audio Analysis & Feature Extraction', minPct: 10 },
    { label: 'AI Decision Engine & Surgical Planning', minPct: 30 },
    { label: 'Precision EQ & Infrasonic Cleansing', minPct: 50 },
    { label: 'Dynamic Bus Control & Transient Sculpting', minPct: 70 },
    { label: 'True-Peak Limiter (-1.0 dBTP Ceiling)', minPct: 85 },
    { label: 'Iterative Quality Control (QC) Loop', minPct: 95 }
  ];

  return (
    <div className="max-w-xl mx-auto py-10 px-4 space-y-8 text-center">
      {/* Spinning Studio Emblem */}
      <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-cyan-100/30 border-t-[#57E6FF] animate-spin" />
        <div className="w-16 h-16 rounded-full bg-[#173653] border border-cyan-100/30 flex items-center justify-center">
          <Disc3 className="w-8 h-8 text-[#57E6FF] animate-pulse" />
        </div>
      </div>

      {/* Headline */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#1E4263] border border-cyan-100/20 text-[10px] uppercase tracking-[0.2em] text-[#57E6FF]">
          <span>04 / DSP Signal Processing Engine</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-white">
          Mastering Your Track
        </h2>
        <p className="text-slate-200 text-xs sm:text-sm font-light">
          Calibrating to <strong className="text-white font-mono">{targetLufs} LUFS</strong> for <strong className="text-white">{genre}</strong>
        </p>
      </div>

      {/* Current Stage Label & Progress Bar */}
      <div className="space-y-4 p-6 rounded-xl bg-[#173653] border border-cyan-100/30 text-left">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#57E6FF] font-medium flex items-center gap-2 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#57E6FF] animate-ping" />
            {currentStage || 'Processing audio buffers...'}
          </span>
          <span className="text-slate-200 font-mono text-xs">{Math.round(progressPct)}%</span>
        </div>

        <div className="h-1.5 w-full rounded bg-[#1E4263] overflow-hidden">
          <div
            style={{ width: `${progressPct}%` }}
            className="h-full bg-[#57E6FF] transition-all duration-300 rounded"
          />
        </div>

        {/* Step Checklist */}
        <div className="space-y-2 pt-4 border-t border-cyan-100/20">
          {stages.map((st, i) => {
            const isDone = progressPct >= st.minPct;
            const isCurrent = progressPct < st.minPct && (i === 0 || progressPct >= stages[i - 1].minPct);

            return (
              <div
                key={i}
                className={`flex items-center justify-between text-xs py-1 transition-opacity ${
                  isDone ? 'text-slate-100' : isCurrent ? 'text-[#57E6FF] font-medium' : 'text-slate-300'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  {isDone ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#57E6FF]" />
                  ) : isCurrent ? (
                    <div className="w-3.5 h-3.5 border border-[#57E6FF] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-cyan-100/30" />
                  )}
                  <span className="font-light">{st.label}</span>
                </span>
                {isDone && <span className="text-[9px] text-[#57E6FF] uppercase tracking-widest font-mono">Passed</span>}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-slate-300 italic font-light tracking-wide">
        "Less is best. Preserve the soul of the song."
      </p>
    </div>
  );
};

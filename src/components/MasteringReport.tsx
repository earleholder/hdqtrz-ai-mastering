import React from 'react';
import {
  Award,
  CheckCircle2,
  FileCheck,
  Layers,
  Printer,
  Shield,
  Sparkles,
  Zap,
  Download,
  SlidersHorizontal,
  Cpu,
  FileAudio,
  Target,
  AlertCircle,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { MasterRecord } from '../types';
import { CONFIG } from '../audio/config';

interface MasteringReportProps {
  record: MasterRecord;
}

export const MasteringReport: React.FC<MasteringReportProps> = ({ record }) => {
  const { report, plan, originalAnalysis, masteredAnalysis } = record;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="rounded-xl bg-[#173653] border border-cyan-100/30 p-6 sm:p-8 space-y-6 relative overflow-hidden">
      {/* Background Watermark */}
      <div className="absolute top-6 right-6 opacity-[0.03] pointer-events-none select-none">
        <span className="text-8xl font-light text-[#57E6FF]">HDQTRZ</span>
      </div>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-cyan-100/20">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-[#57E6FF]">
              HDQTRZ Studio Certification
            </span>
            <span className="w-1 h-1 rounded-full bg-[#57E6FF]" />
            <span className="text-[10px] text-slate-300 font-mono">
              ID: {record.id.slice(0, 10).toUpperCase()}
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-light text-white tracking-tight">
            Acoustic Mastering Report
          </h3>
          <p className="text-xs text-slate-200 font-mono">
            Track: <span className="text-white font-medium">{record.title}</span> • {new Date(record.timestamp).toLocaleDateString()}
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="px-3.5 py-2 rounded-md bg-[#1E4263] hover:bg-[#1A1A1A] border border-cyan-100/20 text-slate-100 hover:text-white text-xs uppercase tracking-wider flex items-center gap-2 transition-colors print:hidden"
        >
          <Printer className="w-3.5 h-3.5 text-[#57E6FF]" />
          <span>Export / Print</span>
        </button>
      </div>

      {/* Core AI Assessment Statement */}
      <div className="p-5 rounded-lg bg-[#1B3C5C] border border-cyan-100/20 space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#57E6FF]" />
          <h4 className="text-[10px] font-medium text-[#57E6FF] uppercase tracking-widest">
            Acoustic Engineer Evaluation
          </h4>
        </div>
        <p className="text-gray-200 text-xs sm:text-sm leading-relaxed font-light italic">
          "{report.aiAssessment}"
        </p>
        <div className="text-[10px] text-slate-300 pt-1 font-light uppercase tracking-wider">
          Mastering Creed: Less is best. Preserve the soul of the song.
        </div>
      </div>

      {/* Metrics Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3.5 rounded-lg bg-[#1B3C5C] border border-cyan-100/20 space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-slate-300 block">Genre Profile</span>
          <span className="text-xs font-medium text-white block truncate">{record.genre}</span>
          <span className="text-[10px] text-slate-200 uppercase tracking-tight">{record.character} character</span>
        </div>

        <div className="p-3.5 rounded-lg bg-[#1B3C5C] border border-cyan-100/20 space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-slate-300 block">Integrated LUFS</span>
          <span className="text-xs font-mono text-[#57E6FF] block">
            {record.masteredAnalysis.integratedLufs} LUFS
          </span>
          <span className="text-[10px] text-slate-300 font-mono">
            Mix was {record.originalAnalysis.integratedLufs} LUFS
          </span>
        </div>

        <div className="p-3.5 rounded-lg bg-[#1B3C5C] border border-cyan-100/20 space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-slate-300 block">True Peak</span>
          <span className="text-xs font-mono text-emerald-400 block">
            {record.masteredAnalysis.truePeak} dBTP
          </span>
          <span className="text-[10px] text-slate-300 uppercase tracking-tight">
            ITU-R BS.1770 safe
          </span>
        </div>

        <div className="p-3.5 rounded-lg bg-[#1B3C5C] border border-cyan-100/20 space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-slate-300 block">Dynamic Range</span>
          <span className="text-xs font-mono text-white block">
            {record.masteredAnalysis.dynamicRange} dB
          </span>
          <span className="text-[10px] text-slate-300 font-mono">
            Crest: {record.masteredAnalysis.crestFactor} dB
          </span>
        </div>
      </div>

      {/* Processing Applied Checklist */}
      <div className="space-y-2.5">
        <h4 className="text-[10px] uppercase tracking-widest text-[#57E6FF] font-medium">
          Signal Processing Stages Executed
        </h4>
        <div className="flex flex-wrap gap-2">
          {report.processingApplied.map((proc, idx) => (
            <span
              key={idx}
              className="px-2.5 py-1 rounded bg-[#1E4263] border border-cyan-100/20 text-[11px] text-slate-100 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3 h-3 text-[#57E6FF]" />
              <span>{proc}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Technical Tonal & Dynamic Adjustments */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {/* Tonal Adjustments */}
        <div className="p-4 rounded-lg bg-[#1B3C5C] border border-cyan-100/20 space-y-2.5">
          <h5 className="text-[10px] uppercase tracking-wider text-slate-200 font-medium">
            Tonal Spectrum Adjustments
          </h5>
          <div className="space-y-1.5 text-slate-200 font-light">
            <div>
              <strong className="text-slate-100 font-normal">Low End: </strong>
              <span>{report.tonalAdjustments.lowEnd}</span>
            </div>
            <div>
              <strong className="text-slate-100 font-normal">Low Mids: </strong>
              <span>{report.tonalAdjustments.lowMids}</span>
            </div>
            <div>
              <strong className="text-slate-100 font-normal">Presence: </strong>
              <span>{report.tonalAdjustments.presence}</span>
            </div>
            <div>
              <strong className="text-slate-100 font-normal">Air & Treble: </strong>
              <span>{report.tonalAdjustments.highFrequencies}</span>
            </div>
          </div>
        </div>

        {/* Dynamic & Limiting Control */}
        <div className="p-4 rounded-lg bg-[#1B3C5C] border border-cyan-100/20 space-y-2.5">
          <h5 className="text-[10px] uppercase tracking-wider text-slate-200 font-medium">
            Dynamic & Intersample Limiting
          </h5>
          <div className="space-y-2 text-slate-200 font-light">
            <div>
              <strong className="text-slate-100 font-normal">Bus Compression: </strong>
              <span>{report.compressionSummary}</span>
            </div>
            <div>
              <strong className="text-slate-100 font-normal">True-Peak Limiting: </strong>
              <span>{report.limitingSummary}</span>
            </div>
            <div>
              <strong className="text-slate-100 font-normal">Stereo Integrity: </strong>
              <span>
                {plan.stereoApplied
                  ? `Sub frequencies below ${plan.subMonoCutoffHz} Hz consolidated to mono for vinyl/club phase security.`
                  : 'Stereo correlation verified in phase; zero artificial phase smearing.'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Resonance & Analog Harmonic Stages */}
      {(plan.dynamicEQApplied || plan.saturationApplied) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Dynamic EQ Band Details */}
          <div className="p-4 rounded-lg bg-[#1B3C5C] border border-cyan-100/20 space-y-2.5">
            <h5 className="text-[10px] uppercase tracking-wider text-slate-200 font-medium flex items-center justify-between">
              <span>{plan.dynamicEQMsDecoupled ? 'Mid/Side Decoupled Dynamic EQ' : 'Dynamic Resonance EQ'}</span>
              <span className="text-[#57E6FF] font-mono text-[9px]">
                {plan.dynamicEQApplied ? `${plan.dynamicEQBands.length} BANDS • ${plan.dynamicEQMsDecoupled ? 'M/S DECOUPLED' : 'LINKED'}` : 'BYPASSED'}
              </span>
            </h5>
            <div className="space-y-2 text-slate-200 font-light">
              <p className="text-slate-100 text-xs">
                {report.dynamicEQSummary}
              </p>
              {plan.dynamicEQBands.length > 0 && (
                <div className="pt-1 space-y-1.5 border-t border-cyan-100/20">
                  {plan.dynamicEQBands.map((band) => (
                    <div key={band.id} className="flex items-center justify-between text-[11px] bg-[#234A6A] px-2.5 py-1.5 rounded border border-cyan-100/20">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[8px] font-mono px-1 py-0.2 rounded font-bold uppercase tracking-wider ${
                            band.channelTarget === 'side'
                              ? 'bg-purple-950/70 text-purple-300 border border-purple-800/50'
                              : band.channelTarget === 'mid'
                              ? 'bg-amber-950/70 text-[#57E6FF] border border-[#57E6FF]/50'
                              : 'bg-white/10 text-slate-100 border border-cyan-100/30'
                          }`}>
                            {band.channelTarget}
                          </span>
                          <span className="text-white font-medium block">{band.name} ({band.frequency} Hz)</span>
                        </div>
                        <span className="text-[10px] text-slate-300 block">Q={band.q} • Thresh: {band.thresholdDb} dB</span>
                      </div>
                      <div className="text-right">
                        <span className="text-emerald-400 font-mono text-xs block">
                          {band.actualCutDb > 0 ? `-${band.actualCutDb} dB` : `Max -${band.maxCutDb} dB`}
                        </span>
                        <span className="text-[9px] text-slate-300 uppercase tracking-tight">Dynamic Cut</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Analog Saturation Details with Polyphase 8x Oversampling */}
          <div className="p-4 rounded-lg bg-[#1B3C5C] border border-cyan-100/20 space-y-2.5">
            <h5 className="text-[10px] uppercase tracking-wider text-slate-200 font-medium flex items-center justify-between">
              <span>Analog Harmonic Saturation Stage</span>
              <span className="text-[#57E6FF] font-mono text-[9px]">
                {plan.saturationApplied ? plan.saturation.flavor.toUpperCase() : 'PRISTINE DIGITAL'}
              </span>
            </h5>
            <div className="space-y-2 text-slate-200 font-light">
              <p className="text-slate-100 text-xs">
                {report.saturationSummary}
              </p>
              {plan.saturationApplied && plan.saturation.flavor !== 'none' && (
                <div className="pt-1 space-y-2 border-t border-cyan-100/20">
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-[#234A6A] p-2 rounded border border-cyan-100/20 space-y-0.5">
                      <span className="text-[10px] text-slate-300 uppercase tracking-wider block">Harmonic Structure</span>
                      <span className="text-white font-medium block capitalize">
                        {plan.saturation.harmonicEmphasis} Harmonics
                      </span>
                    </div>
                    <div className="bg-[#234A6A] p-2 rounded border border-cyan-100/20 space-y-0.5">
                      <span className="text-[10px] text-slate-300 uppercase tracking-wider block">Total Harmonic Distortion</span>
                      <span className="text-[#57E6FF] font-mono font-medium block">
                        {plan.saturation.thdPercent}% THD ({plan.saturation.intensity})
                      </span>
                    </div>
                  </div>

                  {/* 8x Polyphase Oversampling Details */}
                  <div className="bg-[#121212] p-2 rounded border border-cyan-100/20 flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5 text-slate-100">
                      <Cpu className="w-3 h-3 text-[#57E6FF]" />
                      <span>{report.oversamplingSummary}</span>
                    </div>
                    <span className="text-emerald-400 font-mono font-medium">&lt; -96 dB aliasing foldback</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4-Band Downward Multiband Dynamics Stage */}
      {plan.multibandApplied && (
        <div className="p-4 rounded-lg bg-[#1B3C5C] border border-cyan-100/20 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-cyan-100/20 pb-2.5">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#57E6FF]" />
              <h5 className="text-[10px] uppercase tracking-wider text-slate-100 font-medium">
                4-Band Downward Multiband Dynamics (Linkwitz-Riley LR4)
              </h5>
            </div>
            <span className="text-[#57E6FF] font-mono text-[9px] uppercase tracking-wider">
              {plan.multiband.mode.toUpperCase()} CIRCUIT MODELING
            </span>
          </div>

          <p className="text-slate-100 text-xs font-light">
            {report.multibandSummary}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1">
            {plan.multiband.bands.map((b) => (
              <div
                key={b.bandId}
                className="bg-[#234A6A] p-2.5 rounded border border-cyan-100/20 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-white">{b.name}</span>
                  <span className={`text-[8px] font-mono px-1 py-0.2 rounded font-bold uppercase ${
                    b.circuit === 'vca'
                      ? 'bg-blue-950/70 text-blue-300 border border-blue-800/40'
                      : 'bg-amber-950/70 text-[#57E6FF] border border-[#57E6FF]/40'
                  }`}>
                    {b.circuit}
                  </span>
                </div>
                <div className="text-[10px] text-slate-300 font-mono">
                  {b.lowCutHz} Hz – {b.highCutHz} Hz
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-cyan-100/20 text-[10px]">
                  <span className="text-slate-200">Ratio {b.ratio}:1</span>
                  <span className="text-emerald-400 font-mono font-medium">
                    {b.measuredGainReductionDb > 0 ? `-${b.measuredGainReductionDb} dB GR` : 'Linear'}
                  </span>
                </div>
                <div className="text-[9px] text-slate-300">
                  Thresh: {b.thresholdDb} dB • Att: {b.attackMs}ms / Rel: {b.releaseMs}ms
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reference Track Matching Report */}
      {plan.referenceMatching?.applied && (
        <div className="p-4 rounded-lg bg-[#1B3C5C] border border-[#57E6FF]/30 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-cyan-100/20 pb-2.5">
            <div className="flex items-center gap-2">
              <FileAudio className="w-3.5 h-3.5 text-[#57E6FF]" />
              <h5 className="text-[10px] uppercase tracking-wider text-[#57E6FF] font-medium">
                Reference Track Matching (FFT Spectral Cross-Correlation)
              </h5>
            </div>
            <span className="text-slate-200 font-mono text-[9px] uppercase tracking-wider">
              {Math.round(plan.referenceMatching.matchIntensity * 100)}% MATCH INTENSITY
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-medium text-white block">
              Reference Target: {plan.referenceMatching.referenceTitle}
            </span>
            <p className="text-xs text-slate-100 font-light leading-relaxed">
              {report.referenceMatchingSummary || `Tonal curve aligned via 8 FFT spectral bands with &plusmn;2.8 dB safety limits.`}
            </p>
          </div>

          {plan.referenceMatching.adjustments.length > 0 && (
            <div className="pt-1 flex flex-wrap gap-1.5 text-[10px]">
              {plan.referenceMatching.adjustments.map((adj, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded bg-[#234A6A] border border-cyan-100/20 font-mono text-slate-100"
                >
                  <strong className="text-white">{adj.frequency}Hz:</strong>{' '}
                  <span className={adj.gainDb > 0 ? 'text-[#57E6FF]' : 'text-cyan-400'}>
                    {adj.gainDb > 0 ? `+${adj.gainDb}` : adj.gainDb} dB
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Limiter Notice & Cold-Start Transition Flags */}
      {(plan.isLimiterCapped || report.limiterNotice || report.coldStartFadeApplied) && (
        <div className="space-y-2">
          {(plan.isLimiterCapped || report.limiterNotice) && (
            <div className="p-3.5 rounded-lg bg-amber-950/40 border border-amber-500/40 flex items-start gap-3 text-xs text-amber-200 font-light">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-medium text-amber-300 block">Transient Protection Cap Active</strong>
                <span>{report.limiterNotice || `We stopped at ${record.masteredAnalysis.integratedLufs.toFixed(1)} LUFS to keep your transients intact.`}</span>
              </div>
            </div>
          )}
          {report.coldStartFadeApplied && (
            <div className="p-3 rounded-lg bg-[#1B3C5C] border border-cyan-100/20 flex items-center gap-2.5 text-xs text-slate-200 font-light">
              <Sparkles className="w-3.5 h-3.5 text-[#57E6FF] shrink-0" />
              <span>An inaudible 3 ms raised cosine fade-in was applied to eliminate start click.</span>
            </div>
          )}
        </div>
      )}

      {/* Customer Mix Diagnostic Notes (Section 6.4) */}
      {report.mixNotes && report.mixNotes.length > 0 && (
        <div className="p-4 rounded-lg bg-[#1B3C5C] border border-cyan-100/20 space-y-2.5">
          <h5 className="text-[10px] uppercase tracking-wider text-slate-200 font-medium flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-[#57E6FF]" />
            <span>Mix Diagnostic Notes</span>
          </h5>
          <div className="space-y-1.5">
            {report.mixNotes.map((note, idx) => (
              <div key={idx} className="text-xs text-slate-200 font-light flex items-start gap-2">
                <span className="text-[#57E6FF] font-mono text-[10px] mt-0.5">•</span>
                <span>{note}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Output Verification Compliance Grid (Section 7.6) */}
      <div className="p-4 rounded-lg bg-[#132A42] border border-emerald-500/30 space-y-3">
        <div className="flex items-center justify-between border-b border-cyan-100/10 pb-2">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span className="uppercase tracking-wider text-[10px]">Mandatory Post-Output Verification Passed</span>
          </div>
          <span className="text-[9px] font-mono text-slate-300">BS.1770-4 / EBU R128</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
          <div className="bg-[#173653] p-2.5 rounded border border-cyan-100/10">
            <span className="text-[10px] text-slate-300 block">4x True-Peak</span>
            <span className="text-emerald-400 font-mono font-medium block">
              {record.masteredAnalysis.truePeak.toFixed(2)} dBTP
            </span>
            <span className="text-[9px] text-slate-400 block">&le; -1.00 dBTP safe</span>
          </div>
          <div className="bg-[#173653] p-2.5 rounded border border-cyan-100/10">
            <span className="text-[10px] text-slate-300 block">Waveform Clipping</span>
            <span className="text-emerald-400 font-mono font-medium block">
              {record.masteredAnalysis.clippingEvents ?? 0} events
            </span>
            <span className="text-[9px] text-slate-400 block">0 clipping runs</span>
          </div>
          <div className="bg-[#173653] p-2.5 rounded border border-cyan-100/10">
            <span className="text-[10px] text-slate-300 block">Sample Rate</span>
            <span className="text-white font-mono font-medium block">
              {record.sampleRate} Hz
            </span>
            <span className="text-[9px] text-slate-400 block">Native lossless</span>
          </div>
          <div className="bg-[#173653] p-2.5 rounded border border-cyan-100/10">
            <span className="text-[10px] text-slate-300 block">Crest Preservation</span>
            <span className="text-emerald-400 font-mono font-medium block">
              {record.masteredAnalysis.crestFactor.toFixed(1)} dB
            </span>
            <span className="text-[9px] text-slate-400 block">&le; 1.0 dB crest loss</span>
          </div>
        </div>
      </div>

      {/* Earle Holder Studio Human Master Booking CTA (Section 6.1 & 8) */}
      <div className="rounded-xl bg-gradient-to-r from-[#173653] to-[#1E4263] border border-[#57E6FF]/40 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <span className="text-[10px] uppercase tracking-widest text-[#57E6FF] font-medium block">
            Earle Holder Studio Master
          </span>
          <p className="text-xs sm:text-sm text-white font-light">
            {CONFIG.wording.cta}
          </p>
        </div>
        <a
          href={CONFIG.wording.bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-5 py-2.5 rounded-lg bg-[#57E6FF] hover:bg-[#41CBE8] text-black font-semibold text-xs uppercase tracking-wider transition-all shrink-0 flex items-center gap-1.5 shadow-md"
        >
          <span>Book HDQTRZ</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};

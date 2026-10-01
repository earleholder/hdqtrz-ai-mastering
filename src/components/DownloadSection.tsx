import React, { useState } from 'react';
import {
  Download,
  FileAudio,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  RotateCcw,
  Sliders,
  Disc3,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Lock,
  Headphones
} from 'lucide-react';
import { MasterRecord } from '../types';
import { audioBufferToWavBlob } from '../audio/dspEngine';
import { audioBufferToMp3Blob } from '../audio/mp3Encoder';
import { getAiPreviewFilename, getAiPreviewMp3Filename } from '../audio/config';

interface DownloadSectionProps {
  record: MasterRecord;
  onMasterNew: () => void;
  onRemaster: () => void;
  onOpenHumanStudio: () => void;
  onUnlockMaster?: () => void;
  onAuditionA_B?: () => void;
}

export const DownloadSection: React.FC<DownloadSectionProps> = ({
  record,
  onMasterNew,
  onRemaster,
  onOpenHumanStudio,
  onUnlockMaster,
  onAuditionA_B
}) => {
  const isUnlocked = !!record.isUnlocked;
  const [showAdvancedFormats, setShowAdvancedFormats] = useState(false);
  const [downloadingWav, setDownloadingWav] = useState(false);
  const [downloadingMp3, setDownloadingMp3] = useState(false);

  const downloadWav = () => {
    if (!record.masteredBuffer) return;
    if (!isUnlocked && onUnlockMaster) {
      onUnlockMaster();
      return;
    }
    setDownloadingWav(true);

    try {
      const blob = audioBufferToWavBlob(record.masteredBuffer, 24);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = getAiPreviewFilename(record.title, 24);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setDownloadingWav(false), 500);
    }
  };

  const downloadMp3 = () => {
    if (!record.masteredBuffer) return;
    if (!isUnlocked && onUnlockMaster) {
      onUnlockMaster();
      return;
    }
    setDownloadingMp3(true);

    try {
      const blob = audioBufferToMp3Blob(record.masteredBuffer);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = getAiPreviewMp3Filename(record.title);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setDownloadingMp3(false), 500);
    }
  };

  const download16BitCd = () => {
    if (!record.masteredBuffer) return;
    if (!isUnlocked && onUnlockMaster) {
      onUnlockMaster();
      return;
    }
    const blob = audioBufferToWavBlob(record.masteredBuffer, 16);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getAiPreviewFilename(record.title, 16);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2 pt-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#1E4263] border border-cyan-100/20 text-[10px] uppercase tracking-[0.2em] text-[#57E6FF]">
          {isUnlocked ? (
            <>
              <CheckCircle2 className="w-3 h-3 text-[#57E6FF]" />
              <span>AI Preview Unlocked & Ready</span>
            </>
          ) : (
            <>
              <Lock className="w-3 h-3 text-[#57E6FF]" />
              <span>AI Preview Deliverables</span>
            </>
          )}
        </div>
        <h2 className="text-2xl sm:text-4xl font-light tracking-tight text-white">
          {isUnlocked ? 'Download AI Preview' : 'Unlock AI Preview'}
        </h2>
        <p className="text-slate-200 text-xs sm:text-sm max-w-xl mx-auto font-light">
          {isUnlocked
            ? 'Your AI Preview audio has been processed according to acoustic standards. Download deliverables below.'
            : 'You auditioned the 30-second high-energy hook in the comparison console. Unlock full uncompressed 24-bit AI Preview delivery below.'}
        </p>
      </div>

      {/* Free Audition Banner when not unlocked */}
      {!isUnlocked && (
        <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-[#14120B] via-[#1A170F] to-[#173653] border border-[#57E6FF] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <span className="text-[10px] font-mono text-[#57E6FF] uppercase tracking-wider block">
              Audition Mode Completed
            </span>
            <h4 className="text-sm font-medium text-white">
              Ready to release "{record.title}"?
            </h4>
            <p className="text-xs text-slate-200 font-light">
              Unlock the complete track with uncompressed 24-bit WAV, 320k MP3, and 14 days of free parameter revisions.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onAuditionA_B && (
              <button
                onClick={onAuditionA_B}
                className="w-full sm:w-auto px-4 py-2.5 rounded-md bg-[#264E6D] hover:bg-[#202020] text-slate-100 text-xs uppercase tracking-wider border border-cyan-100/30 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Headphones className="w-3.5 h-3.5" />
                <span>Audition A/B</span>
              </button>
            )}

            {onUnlockMaster && (
              <button
                onClick={onUnlockMaster}
                className="w-full sm:w-auto px-5 py-2.5 rounded-md bg-[#57E6FF] hover:bg-[#41CBE8] text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-lg hover:shadow-[#57E6FF]/20"
              >
                <Lock className="w-3.5 h-3.5 text-black" />
                <span>Unlock AI Preview ($9.99)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Delivery Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 24-Bit WAV Deliverable */}
        <div className="p-6 rounded-xl bg-[#173653] border border-[#57E6FF]/40 flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded bg-[#1E4263] text-[#57E6FF] text-[10px] uppercase tracking-wider border border-[#57E6FF]/30">
                Primary AI Preview
              </span>
              <span className="font-mono text-xs text-slate-200">
                {(record.sampleRate / 1000).toFixed(1)} kHz / 24-Bit
              </span>
            </div>

            <h3 className="text-xl font-light text-white">
              24-Bit WAV AI Preview
            </h3>

            <p className="text-xs text-slate-200 leading-relaxed font-light">
              High-resolution 24-bit PCM WAV audio preview formatted to your selected loudness target.
            </p>

            <div className="space-y-1.5 text-xs text-slate-100 font-mono pt-1">
              <div className="flex justify-between">
                <span className="text-slate-300">Loudness:</span>
                <span className="text-white font-normal">{record.masteredAnalysis.integratedLufs} LUFS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">True Peak Ceiling:</span>
                <span className="text-emerald-400 font-normal">{record.masteredAnalysis.truePeak} dBTP</span>
              </div>
            </div>
          </div>

          <button
            onClick={downloadWav}
            disabled={downloadingWav}
            className="w-full py-3 px-5 rounded-md font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 bg-[#57E6FF] hover:bg-[#41CBE8] text-black transition-colors active:scale-[0.99]"
          >
            {isUnlocked ? (
              <>
                <Download className="w-4 h-4 text-black" />
                <span>{downloadingWav ? 'Preparing WAV...' : 'Download AI Preview'}</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-black" />
                <span>Unlock & Download AI Preview ($9.99)</span>
              </>
            )}
          </button>
        </div>

        {/* 320 kbps MP3 Reference */}
        <div className="p-6 rounded-xl bg-[#173653] border border-cyan-100/30 hover:border-cyan-100/40 flex flex-col justify-between space-y-6 transition-colors">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded bg-[#1E4263] text-slate-100 text-[10px] uppercase tracking-wider border border-cyan-100/20">
                Reference Audio
              </span>
              <span className="font-mono text-xs text-slate-200">
                16-Bit / 44.1kHz
              </span>
            </div>

            <h3 className="text-xl font-light text-white">
              320 kbps MP3 AI Preview
            </h3>

            <p className="text-xs text-slate-200 leading-relaxed font-light">
              High-bitrate compressed audio reference for rapid testing and collaborator auditioning.
            </p>

            <div className="space-y-1.5 text-xs text-slate-100 font-mono pt-1">
              <div className="flex justify-between">
                <span className="text-slate-300">Target Profile:</span>
                <span className="text-white font-normal">{record.genre} ({record.character})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">QC Status:</span>
                <span className="text-emerald-400 font-normal">Passed</span>
              </div>
            </div>
          </div>

          <button
            onClick={downloadMp3}
            disabled={downloadingMp3}
            className="w-full py-3 px-5 rounded-md text-xs uppercase tracking-wider flex items-center justify-center gap-2 bg-[#1E4263] hover:bg-[#1A1A1A] border border-cyan-100/20 text-white transition-colors active:scale-[0.99]"
          >
            {isUnlocked ? (
              <>
                <Download className="w-4 h-4 text-[#57E6FF]" />
                <span>{downloadingMp3 ? 'Encoding MP3...' : 'Download AI Preview (MP3)'}</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-[#57E6FF]" />
                <span>Unlock AI Preview (MP3)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Expandable Future Formats & Stem Workflow Architecture */}
      <div className="rounded-xl bg-[#173653] border border-cyan-100/20 p-4 space-y-3">
        <button
          onClick={() => setShowAdvancedFormats(!showAdvancedFormats)}
          className="w-full flex items-center justify-between text-xs text-slate-200 hover:text-white transition-colors"
        >
          <span className="font-normal flex items-center gap-2">
            <Disc3 className="w-4 h-4 text-[#57E6FF]" />
            <span>Additional Formats & Stems Architecture (16-bit CD, 48kHz Video, Apple Digital Masters)</span>
          </span>
          {showAdvancedFormats ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showAdvancedFormats && (
          <div className="pt-3 border-t border-cyan-100/20 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-3 rounded-lg bg-[#1B3C5C] border border-cyan-100/20 space-y-2">
              <div className="font-normal text-white">16-Bit / 44.1 kHz CD AI Preview</div>
              <p className="text-slate-200 text-[11px] leading-relaxed font-light">
                Standard Red Book audio CD specification with TPDF dither.
              </p>
              <button
                onClick={download16BitCd}
                className="text-[#57E6FF] hover:underline flex items-center gap-1 font-medium text-[11px]"
              >
                <Download className="w-3 h-3" />
                <span>Download AI Preview (16-Bit)</span>
              </button>
            </div>

            <div className="p-3 rounded-lg bg-[#1B3C5C] border border-cyan-100/20 space-y-2">
              <div className="font-normal text-white">48 kHz Video Preview</div>
              <p className="text-slate-200 text-[11px] leading-relaxed font-light">
                Aligned with broadcast television, film sync, and Dolby video specs.
              </p>
              <span className="inline-block px-2 py-0.5 rounded bg-[#1E4263] text-slate-200 text-[10px]">
                Preserves source rate
              </span>
            </div>

            <div className="p-3 rounded-lg bg-[#1B3C5C] border border-cyan-100/20 space-y-2">
              <div className="font-normal text-white">Stem / Vocal Delivery</div>
              <p className="text-slate-200 text-[11px] leading-relaxed font-light">
                Instrumental, Acapella, and Clean radio edit batching workflow.
              </p>
              <span className="inline-block px-2 py-0.5 rounded bg-[#1E4263] text-[#57E6FF] text-[10px]">
                Contact HDQTRZ Studio
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Human Studio Upsell Callout */}
      <div className="p-5 rounded-xl bg-[#173653] border border-[#57E6FF]/30 flex flex-col sm:flex-row items-center justify-between gap-5">
        <div className="space-y-1 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-[#57E6FF]">
            <Sparkles className="w-3.5 h-3.5 text-[#57E6FF]" />
            <span className="text-[10px] uppercase tracking-wider">Need the Human Touch?</span>
          </div>
          <h4 className="text-base sm:text-lg font-light text-white">
            HDQTRZ Mastering Studios (Analog Hybrid)
          </h4>
          <p className="text-xs text-slate-200 max-w-xl leading-relaxed font-light">
            For critical album projects, vinyl lacquers, major label releases, or stem mastering with Earle Holder's legendary 30+ year analog chain, book with HDQTRZ Studios directly.
          </p>
        </div>

        <button
          onClick={onOpenHumanStudio}
          className="shrink-0 px-5 py-2.5 rounded-md bg-[#57E6FF] hover:bg-[#41CBE8] text-black font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-colors"
        >
          <span>Book HDQTRZ Studio</span>
          <ExternalLink className="w-3.5 h-3.5 text-black" />
        </button>
      </div>

      {/* Next Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-cyan-100/20">
        <button
          onClick={onRemaster}
          className="w-full sm:w-auto px-5 py-3 rounded-md bg-[#1E4263] hover:bg-[#1A1A1A] border border-cyan-100/20 text-xs uppercase tracking-wider text-slate-100 transition-colors flex items-center justify-center gap-2"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Remaster This Song</span>
        </button>

        <button
          onClick={onMasterNew}
          className="w-full sm:w-auto px-6 py-3.5 rounded-md font-bold text-xs uppercase tracking-[0.2em] transition-colors flex items-center justify-center gap-2 bg-white hover:bg-gray-200 text-black"
        >
          <RotateCcw className="w-3.5 h-3.5 text-black" />
          <span>Master Another Track</span>
        </button>
      </div>
    </div>
  );
};

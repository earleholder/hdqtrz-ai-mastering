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

  const cleanFilename = record.title.replace(/\.[^/.]+$/, '');

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
      a.download = `${cleanFilename}_HDQTRZ_Master_24bit.wav`;
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
      // 16-bit Broadcast WAV container formatted for quick preview and CD compatibility
      const blob = audioBufferToWavBlob(record.masteredBuffer, 16);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${cleanFilename}_HDQTRZ_Reference_16bit.wav`;
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
    const blob = audioBufferToWavBlob(record.masteredBuffer, 16);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cleanFilename}_HDQTRZ_CD_16bit.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2 pt-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#111111] border border-white/5 text-[10px] uppercase tracking-[0.2em] text-[#D4AF37]">
          {isUnlocked ? (
            <>
              <CheckCircle2 className="w-3 h-3 text-[#D4AF37]" />
              <span>Full Master Unlocked & Ready</span>
            </>
          ) : (
            <>
              <Lock className="w-3 h-3 text-[#D4AF37]" />
              <span>Broadcast Deliverables Locked</span>
            </>
          )}
        </div>
        <h2 className="text-2xl sm:text-4xl font-light tracking-tight text-white">
          {isUnlocked ? 'Download Your Masters' : 'Unlock Broadcast Masters'}
        </h2>
        <p className="text-gray-400 text-xs sm:text-sm max-w-xl mx-auto font-light">
          {isUnlocked
            ? 'Your audio has been mastered according to the HDQTRZ studio standard. Download broadcast-quality deliverables below.'
            : 'You auditioned the 30-second high-energy hook in the comparison console. Unlock full uncompressed 24-bit broadcast delivery below.'}
        </p>
      </div>

      {/* Free Audition Banner when not unlocked */}
      {!isUnlocked && (
        <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-[#14120B] via-[#1A170F] to-[#0A0A0A] border border-[#D4AF37] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <span className="text-[10px] font-mono text-[#D4AF37] uppercase tracking-wider block">
              Audition Mode Completed
            </span>
            <h4 className="text-sm font-medium text-white">
              Ready to release "{record.title}"?
            </h4>
            <p className="text-xs text-gray-400 font-light">
              Unlock the complete track with uncompressed 24-bit WAV, 320k MP3, and 14 days of free parameter revisions.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onAuditionA_B && (
              <button
                onClick={onAuditionA_B}
                className="w-full sm:w-auto px-4 py-2.5 rounded-md bg-[#161616] hover:bg-[#202020] text-gray-300 text-xs uppercase tracking-wider border border-white/10 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Headphones className="w-3.5 h-3.5" />
                <span>Audition A/B</span>
              </button>
            )}

            {onUnlockMaster && (
              <button
                onClick={onUnlockMaster}
                className="w-full sm:w-auto px-5 py-2.5 rounded-md bg-[#D4AF37] hover:bg-[#C19A2E] text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-lg hover:shadow-[#D4AF37]/20"
              >
                <Lock className="w-3.5 h-3.5 text-black" />
                <span>Unlock Master ($9.99)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Delivery Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 24-Bit WAV Master */}
        <div className="p-6 rounded-xl bg-[#0A0A0A] border border-[#D4AF37]/40 flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded bg-[#111111] text-[#D4AF37] text-[10px] uppercase tracking-wider border border-[#D4AF37]/30">
                Primary Release Master
              </span>
              <span className="font-mono text-xs text-gray-400">
                {(record.sampleRate / 1000).toFixed(1)} kHz / 24-Bit
              </span>
            </div>

            <h3 className="text-xl font-light text-white">
              24-Bit WAV Master
            </h3>

            <p className="text-xs text-gray-400 leading-relaxed font-light">
              Uncompressed high-resolution broadcast master for Spotify, Apple Music, Tidal, YouTube Music, and digital distribution.
            </p>

            <div className="space-y-1.5 text-xs text-gray-300 font-mono pt-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Loudness:</span>
                <span className="text-white font-normal">{record.masteredAnalysis.integratedLufs} LUFS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">True Peak Ceiling:</span>
                <span className="text-emerald-400 font-normal">{record.masteredAnalysis.truePeak} dBTP</span>
              </div>
            </div>
          </div>

          <button
            onClick={downloadWav}
            disabled={downloadingWav}
            className="w-full py-3 px-5 rounded-md font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 bg-[#D4AF37] hover:bg-[#C19A2E] text-black transition-colors active:scale-[0.99]"
          >
            {isUnlocked ? (
              <>
                <Download className="w-4 h-4 text-black" />
                <span>{downloadingWav ? 'Preparing WAV...' : 'Download 24-Bit WAV Master'}</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-black" />
                <span>Unlock & Download 24-Bit WAV ($9.99)</span>
              </>
            )}
          </button>
        </div>

        {/* 320 kbps MP3 Reference */}
        <div className="p-6 rounded-xl bg-[#0A0A0A] border border-white/10 hover:border-white/20 flex flex-col justify-between space-y-6 transition-colors">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded bg-[#111111] text-gray-300 text-[10px] uppercase tracking-wider border border-white/5">
                Reference Audio
              </span>
              <span className="font-mono text-xs text-gray-400">
                16-Bit / 44.1kHz
              </span>
            </div>

            <h3 className="text-xl font-light text-white">
              16-Bit Reference WAV
            </h3>

            <p className="text-xs text-gray-400 leading-relaxed font-light">
              Red Book CD-compatible reference file for rapid mobile testing, collaborator feedback, and high-fidelity auditioning.
            </p>

            <div className="space-y-1.5 text-xs text-gray-300 font-mono pt-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Target Profile:</span>
                <span className="text-white font-normal">{record.genre} ({record.character})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">QC Status:</span>
                <span className="text-emerald-400 font-normal">Passed</span>
              </div>
            </div>
          </div>

          <button
            onClick={downloadMp3}
            disabled={downloadingMp3}
            className="w-full py-3 px-5 rounded-md text-xs uppercase tracking-wider flex items-center justify-center gap-2 bg-[#111111] hover:bg-[#1A1A1A] border border-white/5 text-white transition-colors active:scale-[0.99]"
          >
            {isUnlocked ? (
              <>
                <Download className="w-4 h-4 text-[#D4AF37]" />
                <span>{downloadingMp3 ? 'Preparing WAV...' : 'Download 16-Bit Reference WAV'}</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-[#D4AF37]" />
                <span>Unlock Reference WAV</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Expandable Future Formats & Stem Workflow Architecture */}
      <div className="rounded-xl bg-[#0A0A0A] border border-white/5 p-4 space-y-3">
        <button
          onClick={() => setShowAdvancedFormats(!showAdvancedFormats)}
          className="w-full flex items-center justify-between text-xs text-gray-400 hover:text-white transition-colors"
        >
          <span className="font-normal flex items-center gap-2">
            <Disc3 className="w-4 h-4 text-[#D4AF37]" />
            <span>Additional Formats & Stems Architecture (16-bit CD, 48kHz Video, Apple Digital Masters)</span>
          </span>
          {showAdvancedFormats ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showAdvancedFormats && (
          <div className="pt-3 border-t border-white/5 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-3 rounded-lg bg-[#0F0F0F] border border-white/5 space-y-2">
              <div className="font-normal text-white">16-Bit / 44.1 kHz CD Master</div>
              <p className="text-gray-400 text-[11px] leading-relaxed font-light">
                Standard Red Book audio CD specification with TPDF dither.
              </p>
              <button
                onClick={download16BitCd}
                className="text-[#D4AF37] hover:underline flex items-center gap-1 font-medium text-[11px]"
              >
                <Download className="w-3 h-3" />
                <span>Download 16-Bit WAV</span>
              </button>
            </div>

            <div className="p-3 rounded-lg bg-[#0F0F0F] border border-white/5 space-y-2">
              <div className="font-normal text-white">48 kHz Video Master</div>
              <p className="text-gray-400 text-[11px] leading-relaxed font-light">
                Aligned with broadcast television, film sync, and Dolby video specs.
              </p>
              <span className="inline-block px-2 py-0.5 rounded bg-[#111111] text-gray-400 text-[10px]">
                Preserves source rate
              </span>
            </div>

            <div className="p-3 rounded-lg bg-[#0F0F0F] border border-white/5 space-y-2">
              <div className="font-normal text-white">Stem / Vocal Delivery</div>
              <p className="text-gray-400 text-[11px] leading-relaxed font-light">
                Instrumental, Acapella, and Clean radio edit batching workflow.
              </p>
              <span className="inline-block px-2 py-0.5 rounded bg-[#111111] text-[#D4AF37] text-[10px]">
                Available on Pro Tier
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Human Studio Upsell Callout */}
      <div className="p-5 rounded-xl bg-[#0A0A0A] border border-[#D4AF37]/30 flex flex-col sm:flex-row items-center justify-between gap-5">
        <div className="space-y-1 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-[#D4AF37]">
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span className="text-[10px] uppercase tracking-wider">Need the Human Touch?</span>
          </div>
          <h4 className="text-base sm:text-lg font-light text-white">
            HDQTRZ Mastering Studios (Analog Hybrid)
          </h4>
          <p className="text-xs text-gray-400 max-w-xl leading-relaxed font-light">
            For critical album projects, vinyl lacquers, major label releases, or stem mastering with Earle Holder's legendary 30+ year analog chain, book with HDQTRZ Studios directly.
          </p>
        </div>

        <button
          onClick={onOpenHumanStudio}
          className="shrink-0 px-5 py-2.5 rounded-md bg-[#D4AF37] hover:bg-[#C19A2E] text-black font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-colors"
        >
          <span>Book HDQTRZ Studio</span>
          <ExternalLink className="w-3.5 h-3.5 text-black" />
        </button>
      </div>

      {/* Next Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/5">
        <button
          onClick={onRemaster}
          className="w-full sm:w-auto px-5 py-3 rounded-md bg-[#111111] hover:bg-[#1A1A1A] border border-white/5 text-xs uppercase tracking-wider text-gray-300 transition-colors flex items-center justify-center gap-2"
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

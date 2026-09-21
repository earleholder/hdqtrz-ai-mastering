import React, { useState } from 'react';
import {
  Clock,
  Download,
  FileText,
  Play,
  RotateCcw,
  Sliders,
  Trash2,
  Disc3,
  CheckCircle2,
  Sparkles,
  Search,
  ExternalLink,
  Lock
} from 'lucide-react';
import { MasterRecord } from '../types';
import { audioBufferToWavBlob } from '../audio/dspEngine';

interface MasterHistoryProps {
  records: MasterRecord[];
  onSelectRecord: (record: MasterRecord) => void;
  onRemasterRecord: (record: MasterRecord) => void;
  onDeleteRecord: (id: string) => void;
  onNewMaster: () => void;
  onUnlockRecord?: (record: MasterRecord) => void;
}

export const MasterHistory: React.FC<MasterHistoryProps> = ({
  records,
  onSelectRecord,
  onRemasterRecord,
  onDeleteRecord,
  onNewMaster,
  onUnlockRecord
}) => {
  const [search, setSearch] = useState('');

  const filtered = records.filter(r =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.genre.toLowerCase().includes(search.toLowerCase())
  );

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleDownload = (record: MasterRecord) => {
    if (!record.masteredBuffer) return;
    if (!record.isUnlocked && onUnlockRecord) {
      onUnlockRecord(record);
      return;
    }
    const blob = audioBufferToWavBlob(record.masteredBuffer, 24);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${record.title.replace(/\.[^/.]+$/, '')}_HDQTRZ_Master_24bit.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-cyan-100/20">
        <div>
          <h2 className="text-xl sm:text-2xl font-light text-white tracking-tight">
            Mastering Vault & History
          </h2>
          <p className="text-xs text-slate-200 font-light mt-1">
            Access your processed masters, view technical engineering reports, or remaster instantly.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search tracks or genres..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-60 px-3.5 py-2 rounded-md bg-[#173653] border border-cyan-100/30 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#57E6FF]"
          />

          <button
            onClick={onNewMaster}
            className="shrink-0 px-4 py-2 rounded-md bg-[#57E6FF] hover:bg-[#41CBE8] text-black font-bold text-xs uppercase tracking-wider transition-colors"
          >
            + Master New
          </button>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-[#173653] border border-cyan-100/20 space-y-4">
          <div className="w-12 h-12 rounded-md bg-[#1E4263] border border-cyan-100/20 flex items-center justify-center mx-auto text-[#57E6FF]">
            <Disc3 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-white">No Masters Found</h4>
            <p className="text-xs text-slate-200 max-w-md mx-auto font-light">
              You have not mastered any tracks yet, or your search filter didn't match any records.
            </p>
          </div>
          <button
            onClick={onNewMaster}
            className="px-4 py-2 rounded-md bg-[#57E6FF] text-black font-bold text-xs uppercase tracking-wider"
          >
            Upload a Track to Master
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((record) => (
            <div
              key={record.id}
              className="p-4 rounded-xl bg-[#173653] border border-cyan-100/20 hover:border-white/15 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              {/* Track Info */}
              <div className="flex items-center gap-3 min-w-0">
                <div
                  onClick={() => onSelectRecord(record)}
                  className="w-10 h-10 rounded-md bg-[#1E4263] border border-cyan-100/20 hover:border-[#57E6FF] flex items-center justify-center text-[#57E6FF] cursor-pointer shrink-0 transition-colors"
                  title="Audition in player"
                >
                  <Play className="w-4 h-4 fill-[#57E6FF] ml-0.5" />
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3
                      onClick={() => onSelectRecord(record)}
                      className="font-normal text-white text-xs sm:text-sm hover:text-[#57E6FF] transition-colors truncate cursor-pointer"
                    >
                      {record.title}
                    </h3>
                    <span className="px-2 py-0.5 rounded bg-[#1E4263] text-[#57E6FF] text-[10px] font-mono shrink-0 border border-cyan-100/20">
                      {record.genre}
                    </span>
                    {record.isUnlocked ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-400 text-[10px] font-mono shrink-0 border border-emerald-800/40 flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>Unlocked</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-[#57E6FF]/10 text-[#57E6FF] text-[10px] font-mono shrink-0 border border-[#57E6FF]/30 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" />
                        <span>30s Preview</span>
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-200 font-mono">
                    <span className="text-slate-100 font-medium">{record.targetLufs} LUFS</span>
                    <span>•</span>
                    <span>{record.character}</span>
                    <span>•</span>
                    <span>{formatDuration(record.duration)}</span>
                    <span>•</span>
                    <span>{new Date(record.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Status & Actions */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-cyan-100/20">
                <button
                  onClick={() => onSelectRecord(record)}
                  className="px-2.5 py-1.5 rounded-md bg-[#1E4263] hover:bg-[#1A1A1A] border border-cyan-100/20 text-xs text-slate-100 hover:text-white transition-colors flex items-center gap-1.5"
                  title="Compare and view report"
                >
                  <FileText className="w-3.5 h-3.5 text-[#57E6FF]" />
                  <span>Report</span>
                </button>

                <button
                  onClick={() => handleDownload(record)}
                  className={`px-2.5 py-1.5 rounded-md border border-cyan-100/20 text-xs transition-colors flex items-center gap-1.5 ${
                    record.isUnlocked
                      ? 'bg-[#1E4263] hover:bg-[#1A1A1A] text-slate-100 hover:text-white'
                      : 'bg-[#57E6FF]/10 hover:bg-[#57E6FF]/20 text-[#57E6FF] border-[#57E6FF]/30'
                  }`}
                  title={record.isUnlocked ? "Download 24-bit WAV" : "Unlock 24-bit Master"}
                >
                  {record.isUnlocked ? (
                    <>
                      <Download className="w-3.5 h-3.5 text-[#57E6FF]" />
                      <span>WAV</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 text-[#57E6FF]" />
                      <span>Unlock</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => onRemasterRecord(record)}
                  className="px-2.5 py-1.5 rounded-md bg-[#1E4263] hover:bg-[#1A1A1A] border border-cyan-100/20 text-xs text-slate-100 hover:text-white transition-colors flex items-center gap-1.5"
                  title="Remaster without re-uploading"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#57E6FF]" />
                  <span>Remaster</span>
                </button>

                <button
                  onClick={() => onDeleteRecord(record.id)}
                  className="p-1.5 rounded-md hover:bg-red-950/40 text-slate-300 hover:text-red-400 transition-colors"
                  title="Delete from history"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

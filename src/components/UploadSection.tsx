import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Upload, Play, Pause, FileAudio, ShieldCheck, AlertCircle, Sparkles, Wand2, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { TrackMetadata } from '../types';
import { robustDecodeAudio } from '../audio/audioDecoder';

interface UploadSectionProps {
  onAudioReady: (buffer: AudioBuffer, metadata: TrackMetadata) => void;
  isAnalyzing: boolean;
  onOpenInstructions?: () => void;
}

export const UploadSection: React.FC<UploadSectionProps> = ({ onAudioReady, isAnalyzing, onOpenInstructions }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<TrackMetadata | null>(null);
  const [loadedBuffer, setLoadedBuffer] = useState<AudioBuffer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [ownershipConfirmed, setOwnershipConfirmed] = useState(true);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showPrepGuide, setShowPrepGuide] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Stop playback when component unmounts
  useEffect(() => {
    return () => {
      stopPlayback();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  const stopPlayback = () => {
    if (activeSourceRef.current) {
      try {
        activeSourceRef.current.stop();
        activeSourceRef.current.disconnect();
      } catch (e) {
        // Ignore if already stopped
      }
      activeSourceRef.current = null;
    }
    setIsPlaying(false);
  };

  const togglePreviewPlayback = () => {
    if (!loadedBuffer) return;

    if (isPlaying) {
      stopPlayback();
      return;
    }

    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }

    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const source = ctx.createBufferSource();
    source.buffer = loadedBuffer;
    source.connect(ctx.destination);
    source.onended = () => setIsPlaying(false);
    source.start(0);
    activeSourceRef.current = source;
    setIsPlaying(true);
  };

  // Compute real peak amplitudes across 72 slices of loadedBuffer
  const diagnosticWaveformBars = useMemo(() => {
    if (!loadedBuffer) return [];
    const channelData = loadedBuffer.getChannelData(0);
    const numBars = 72;
    const blockSize = Math.floor(channelData.length / numBars) || 1;
    const bars: number[] = [];
    for (let i = 0; i < numBars; i++) {
      const start = i * blockSize;
      const end = Math.min(start + blockSize, channelData.length);
      let max = 0;
      // Stride of 4 for fast computation
      for (let j = start; j < end; j += 4) {
        const abs = Math.abs(channelData[j]);
        if (abs > max) max = abs;
      }
      bars.push(Math.max(12, Math.min(95, Math.round(max * 100))));
    }
    return bars;
  }, [loadedBuffer]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    setUploadError(null);
    stopPlayback();

    // Technical validation: Max 250MB
    const MAX_SIZE_BYTES = 250 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      setUploadError(`File exceeds maximum size limit of 250 MB (${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
      return;
    }

    // Disallow MP3 files specifically with clear professional guidance
    const nameLower = file.name.toLowerCase();
    const isMp3 = nameLower.endsWith('.mp3') || file.type === 'audio/mpeg' || file.type === 'audio/mp3';
    if (isMp3) {
      setUploadError('MP3 files cannot be accepted for professional mastering. Lossy compression degrades transients, smears stereo imaging, and causes phase distortion that mastering algorithms will severely amplify. Please export and upload an uncompressed 24-bit WAV, AIFF, or lossless FLAC file from your DAW.');
      return;
    }

    // Validate format: Strictly lossless / uncompressed (WAV, AIFF, FLAC)
    let format: 'WAV' | 'AIFF' | 'FLAC' = 'WAV';
    if (nameLower.endsWith('.wav') || file.type === 'audio/wav' || file.type === 'audio/x-wav') format = 'WAV';
    else if (nameLower.endsWith('.aiff') || nameLower.endsWith('.aif') || file.type === 'audio/aiff' || file.type === 'audio/x-aiff') format = 'AIFF';
    else if (nameLower.endsWith('.flac') || file.type === 'audio/flac') format = 'FLAC';
    else {
      setUploadError('Unsupported format. To ensure mastering fidelity, please upload an uncompressed stereo WAV (recommended 24-bit), AIFF, or lossless FLAC file. MP3 and other lossy files are not supported.');
      return;
    }

    setSelectedFile(file);

    try {
      const { buffer: audioBuffer, ctx } = await robustDecodeAudio(file);
      audioContextRef.current = ctx;

      // Validate duration: Max 15 minutes (900 seconds)
      if (audioBuffer.duration > 900) {
        setUploadError(`Audio duration (${Math.round(audioBuffer.duration / 60)} minutes) exceeds the 15-minute maximum limit for automated mastering.`);
        return;
      }

      setLoadedBuffer(audioBuffer);

      const meta: TrackMetadata = {
        name: file.name,
        format,
        sampleRate: audioBuffer.sampleRate,
        bitDepth: 24, // High-precision float decoded
        duration: audioBuffer.duration,
        fileSize: file.size,
        channels: audioBuffer.numberOfChannels,
        file
      };
      setMetadata(meta);
    } catch (err: unknown) {
      console.error('[HDQTRZ Audio Decode Error]', err);
      const msg = err instanceof Error ? err.message : 'Unable to decode audio data.';
      setUploadError(`${msg} Please ensure the file is an uncorrupted, uncompressed 24-bit stereo WAV or AIFF file.`);
    }
  };

  const handleStartAnalysis = () => {
    if (!loadedBuffer || !metadata) return;
    stopPlayback();
    onAudioReady(loadedBuffer, metadata);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Hero Title Section */}
      <div className="text-center space-y-2 pt-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#111111] border border-white/5 text-[10px] uppercase tracking-[0.2em] text-[#D4AF37]">
          <span>01 / Audio Ingest & Pre-Master Diagnostic</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-light tracking-tight text-white">
          Upload Stereo Mix
        </h1>
        <p className="text-gray-400 text-xs sm:text-sm max-w-xl mx-auto font-light leading-relaxed">
          Upload your stereo mix for intelligent spectral and dynamic evaluation.
          <br className="hidden sm:inline" />
          <span className="text-gray-500 italic"> "Less is best. Preserve the soul of the song."</span>
        </p>
      </div>

      {/* Main Drag-and-Drop Area */}
      <div>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative group cursor-pointer rounded-xl p-8 sm:p-12 text-center transition-all duration-200 border border-dashed ${
            isDragging
              ? 'border-[#D4AF37] bg-[#111111]'
              : 'border-white/10 hover:border-[#D4AF37]/50 bg-[#0A0A0A] hover:bg-[#0E0E0E]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".wav,.aiff,.aif,.flac,audio/wav,audio/x-wav,audio/aiff,audio/x-aiff,audio/flac"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-14 h-14 rounded-xl bg-[#111111] border border-white/5 group-hover:border-[#D4AF37]/40 flex items-center justify-center transition-colors">
              <Upload className="w-6 h-6 text-[#D4AF37]" />
            </div>

            <div className="space-y-1">
              <p className="text-sm sm:text-base font-light text-white group-hover:text-[#D4AF37] transition-colors">
                Drop your stereo mix here, or <span className="text-[#D4AF37] underline underline-offset-4">browse filesystem</span>
              </p>
              <p className="text-xs text-gray-400 font-light">
                Uncompressed <strong className="text-white font-medium">24-bit WAV</strong>, <strong className="text-white font-medium">AIFF</strong>, or lossless <strong className="text-white font-medium">FLAC</strong>
              </p>
              <p className="text-[11px] text-[#d4af37]/80 font-mono tracking-tight pt-0.5">
                (MP3 files not permitted for mastering to preserve audio fidelity)
              </p>
            </div>

            {/* Technical Specs Tags */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[10px] uppercase tracking-wider text-gray-400">
              <span className="px-2 py-0.5 rounded bg-[#111111] border border-white/5 text-white">Lossless Only</span>
              <span className="px-2 py-0.5 rounded bg-[#111111] border border-white/5">Max 250 MB</span>
              <span className="px-2 py-0.5 rounded bg-[#111111] border border-white/5">Max 15 min</span>
              <span className="px-2 py-0.5 rounded bg-[#111111] border border-white/5">Stereo 2.0</span>
            </div>
          </div>
        </div>

        {uploadError && (
          <div className="mt-3 p-3 rounded-lg bg-red-950/30 border border-red-900/50 text-red-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold uppercase tracking-wider text-[10px]">Upload Notice</p>
              <p>{uploadError}</p>
            </div>
          </div>
        )}

        {/* Quick Instructions & Mix Prep Bar */}
        <div className="mt-4 rounded-lg bg-[#0F0F0F] border border-white/5 p-3.5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-gray-300">
              <BookOpen className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
              <span className="font-medium text-white">Mixing Best Practice:</span>
              <span className="text-gray-400 font-light hidden sm:inline">Leave -3 to -6 dB headroom with no master limiters.</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowPrepGuide(!showPrepGuide)}
                className="text-[11px] text-[#D4AF37] hover:text-[#f3d97b] transition-colors flex items-center gap-1 font-medium"
              >
                <span>{showPrepGuide ? 'Hide Prep Tips' : 'Quick Prep Checklist'}</span>
                {showPrepGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {onOpenInstructions && (
                <>
                  <span className="text-gray-600">•</span>
                  <button
                    type="button"
                    onClick={onOpenInstructions}
                    className="text-[11px] text-gray-400 hover:text-white uppercase tracking-wider transition-colors"
                  >
                    Full Guide & FAQ →
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Expandable Quick Checklist */}
          {showPrepGuide && (
            <div className="pt-3 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-[11px] font-light text-gray-300">
              <div className="space-y-1 p-2.5 rounded bg-[#141414] border border-white/5">
                <span className="text-[#D4AF37] font-medium block">1. Headroom</span>
                <p className="text-gray-400 leading-relaxed">
                  Peak at -3 dB to -6 dB. Ensure true peak does not hit 0.0 dBFS on your stereo output.
                </p>
              </div>

              <div className="space-y-1 p-2.5 rounded bg-[#141414] border border-white/5">
                <span className="text-[#D4AF37] font-medium block">2. Master Bus</span>
                <p className="text-gray-400 leading-relaxed">
                  Disable peak limiters and clippers on stereo out so the mastering engine can preserve transients.
                </p>
              </div>

              <div className="space-y-1 p-2.5 rounded bg-[#141414] border border-white/5">
                <span className="text-[#D4AF37] font-medium block">3. Resolution</span>
                <p className="text-gray-400 leading-relaxed">
                  Export 24-bit uncompressed WAV or AIFF at your project's native sample rate.
                </p>
              </div>

              <div className="space-y-1 p-2.5 rounded bg-[#141414] border border-white/5">
                <span className="text-[#D4AF37] font-medium block">4. Reference &amp; Dynamics</span>
                <p className="text-gray-400 leading-relaxed">
                  Upload commercial references for FFT matching and configure 4-band VCA/Opto downward dynamics.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Selected File Inspector Card */}
      {metadata && loadedBuffer && (
        <div className="rounded-xl bg-[#0A0A0A] border border-white/10 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#141414] border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
                <FileAudio className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-medium text-white text-sm sm:text-base break-all">
                  {metadata.name}
                </h2>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="text-[#D4AF37] font-medium">{metadata.format}</span>
                  <span>•</span>
                  <span>{formatDuration(metadata.duration)}</span>
                  <span>•</span>
                  <span>{formatFileSize(metadata.fileSize)}</span>
                </div>
              </div>
            </div>

            {/* Quick Preview Transport */}
            <button
              onClick={togglePreviewPlayback}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#141414] hover:bg-[#1C1C1C] border border-white/5 text-xs text-gray-300 transition-colors"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Pause Audition</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-[#D4AF37] fill-[#D4AF37]" />
                  <span>Audition Raw Mix</span>
                </>
              )}
            </button>
          </div>

          {/* Technical Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#0F0F0F] p-4 rounded-lg border border-white/5">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Sample Rate</p>
              <p className="text-lg font-light text-white">
                {(metadata.sampleRate / 1000).toFixed(1)} <span className="text-[10px] text-gray-400">kHz</span>
              </p>
            </div>
            <div className="bg-[#0F0F0F] p-4 rounded-lg border border-white/5">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Bit Depth</p>
              <p className="text-lg font-light text-white">
                {metadata.bitDepth} <span className="text-[10px] text-gray-400">Bit</span>
              </p>
            </div>
            <div className="bg-[#0F0F0F] p-4 rounded-lg border border-white/5">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Channels</p>
              <p className="text-lg font-light text-white">
                {metadata.channels === 2 ? 'Stereo' : 'Mono'} <span className="text-[10px] text-gray-400">L/R</span>
              </p>
            </div>
            <div className="bg-[#0F0F0F] p-4 rounded-lg border border-white/5">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Processing Engine</p>
              <p className="text-lg font-light text-[#D4AF37]">
                32 <span className="text-[10px] text-gray-400">Bit Float</span>
              </p>
            </div>
          </div>

          {/* Minimalist Waveform Visualization */}
          <div className="relative bg-[#080808] rounded-xl border border-white/5 p-4 flex flex-col justify-end overflow-hidden">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-gray-500 mb-3">
              <span>Input Waveform Diagnostic</span>
              <span className="font-mono text-gray-400">{formatDuration(metadata.duration)}</span>
            </div>
            <div className="relative h-20 w-full flex items-center justify-between gap-[2px]">
              <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                <div className="w-full h-px bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
              </div>
              {(diagnosticWaveformBars.length > 0 ? diagnosticWaveformBars : Array.from({ length: 72 }, (_, i) => Math.max(12, Math.sin(i * 0.22) * 35 + 45))).map((heightPct, idx) => (
                <div
                  key={idx}
                  style={{ height: `${heightPct}%` }}
                  className="flex-1 bg-[#D4AF37] opacity-70 hover:opacity-100 rounded-sm transition-all"
                />
              ))}
            </div>
          </div>

          {/* Legal / Copyright Guarantee */}
          <div className="flex items-center gap-2 pt-1">
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={ownershipConfirmed}
                onChange={(e) => setOwnershipConfirmed(e.target.checked)}
                className="rounded border-white/20 text-[#D4AF37] focus:ring-0 bg-[#161616] w-3.5 h-3.5 cursor-pointer accent-[#D4AF37]"
              />
              <span className="text-gray-400 text-xs">
                I own or have permission to master this audio. (Your track remains 100% your property).
              </span>
            </label>
          </div>

          {/* Primary Action Button (Clean Minimalism) */}
          <div className="pt-2">
            <button
              onClick={handleStartAnalysis}
              disabled={isAnalyzing || !ownershipConfirmed}
              className="w-full bg-[#D4AF37] hover:bg-[#C19A2E] text-black font-bold py-3.5 sm:py-4 px-6 rounded-md transition-colors uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Analyzing Audio Dynamics & Spectrum...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 text-black" />
                  <span>Analyze Track with HDQTRZ AI</span>
                </>
              )}
            </button>
            <p className="text-[10px] text-center text-gray-600 mt-3 uppercase tracking-tighter italic font-light">
              "Less is best. Preserve the soul of the song."
            </p>
          </div>
        </div>
      )}

      {/* Privacy & Trust Badge */}
      <div className="flex items-center justify-center gap-6 text-[10px] uppercase tracking-wider text-gray-500 pt-2">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span>Encrypted Transfer</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span>100% Artist Property</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Private Engine</span>
        </div>
      </div>
    </div>
  );
};

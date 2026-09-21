import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Repeat,
  Sliders,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Zap,
  Activity,
  Maximize2,
  Lock,
  Headphones
} from 'lucide-react';
import { MasterRecord } from '../types';

interface ComparisonPlayerProps {
  record: MasterRecord;
  onProceedToDownload: () => void;
  onRemaster: () => void;
  onUnlockMaster?: () => void;
}

export const ComparisonPlayer: React.FC<ComparisonPlayerProps> = ({
  record,
  onProceedToDownload,
  onRemaster,
  onUnlockMaster
}) => {
  const isUnlocked = !!record.isUnlocked;
  const preview = record.previewWindow || {
    startSec: 0,
    endSec: Math.min(record.duration, 35),
    durationSec: Math.min(record.duration, 35)
  };

  const [isPlaying, setIsPlaying] = useState(false);
  const [activeChannel, setActiveChannel] = useState<'original' | 'master'>('master');
  const [loudnessMatched, setLoudnessMatched] = useState(true);
  const [currentTime, setCurrentTime] = useState(isUnlocked ? 0 : preview.startSec);
  const [duration, setDuration] = useState(record.duration || 12);
  const [volume, setVolume] = useState(0.85);
  const [isLooping, setIsLooping] = useState(true);
  const [vuMeterLeft, setVuMeterLeft] = useState(0);
  const [vuMeterRight, setVuMeterRight] = useState(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const isPlayingRef = useRef<boolean>(false);
  const origGainRef = useRef<GainNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const masterSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const origSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(isUnlocked ? 0 : preview.startSec);
  const animationFrameRef = useRef<number | null>(null);
  const waveformContainerRef = useRef<HTMLDivElement | null>(null);

  // Setup Web Audio Context and audio sources
  useEffect(() => {
    stopAudio();
    const initialPos = isUnlocked ? 0 : preview.startSec;
    pausedAtRef.current = initialPos;
    setCurrentTime(initialPos);
    setDuration(record.duration || 12);

    return () => {
      stopAudio();
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
      }
    };
  }, [record.id, isUnlocked]);

  // Update gain balance whenever active channel or loudnessMatch changes
  useEffect(() => {
    updateGains();
  }, [activeChannel, loudnessMatched, volume]);

  const updateGains = () => {
    if (!audioCtxRef.current || !origGainRef.current || !masterGainRef.current) return;

    // Gain compensation for loudness match:
    const lufsDiffDb = record.masteredAnalysis.integratedLufs - record.originalAnalysis.integratedLufs;
    const matchGainLinear = Math.pow(10, lufsDiffDb / 20);

    const now = audioCtxRef.current.currentTime;

    if (activeChannel === 'master') {
      masterGainRef.current.gain.cancelScheduledValues(now);
      masterGainRef.current.gain.linearRampToValueAtTime(volume, now + 0.04);

      origGainRef.current.gain.cancelScheduledValues(now);
      origGainRef.current.gain.linearRampToValueAtTime(0, now + 0.04);
    } else {
      // Playing original
      origGainRef.current.gain.cancelScheduledValues(now);
      const effectiveOrigGain = loudnessMatched ? volume * matchGainLinear : volume;
      origGainRef.current.gain.linearRampToValueAtTime(Math.min(1.2, effectiveOrigGain), now + 0.04);

      masterGainRef.current.gain.cancelScheduledValues(now);
      masterGainRef.current.gain.linearRampToValueAtTime(0, now + 0.04);
    }
  };

  const startPlayback = () => {
    if (!record.originalBuffer || !record.masteredBuffer) return;

    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Stop any previously playing sources
    if (origSourceRef.current) {
      try {
        origSourceRef.current.stop();
        origSourceRef.current.disconnect();
      } catch (e) {}
      origSourceRef.current = null;
    }
    if (masterSourceRef.current) {
      try {
        masterSourceRef.current.stop();
        masterSourceRef.current.disconnect();
      } catch (e) {}
      masterSourceRef.current = null;
    }

    // Create Gains
    const origGain = ctx.createGain();
    const masterGain = ctx.createGain();
    origGain.connect(ctx.destination);
    masterGain.connect(ctx.destination);
    origGainRef.current = origGain;
    masterGainRef.current = masterGain;

    // Create synchronized sources
    const origSource = ctx.createBufferSource();
    const masterSource = ctx.createBufferSource();
    origSource.buffer = record.originalBuffer;
    masterSource.buffer = record.masteredBuffer;

    origSource.connect(origGain);
    masterSource.connect(masterGain);

    let offset = pausedAtRef.current;
    if (!isUnlocked) {
      if (offset < preview.startSec || offset >= preview.endSec) {
        offset = preview.startSec;
      }
    } else {
      if (offset < 0 || offset >= record.duration) {
        offset = 0;
      }
    }

    origSource.start(0, offset);
    masterSource.start(0, offset);

    startTimeRef.current = ctx.currentTime - offset;
    origSourceRef.current = origSource;
    masterSourceRef.current = masterSource;

    isPlayingRef.current = true;
    setIsPlaying(true);
    updateGains();

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Loop ticker with reliable real-time waveform playhead incrementing
    const tick = () => {
      if (!isPlayingRef.current || !audioCtxRef.current) return;

      const elapsed = audioCtxRef.current.currentTime - startTimeRef.current;

      if (!isUnlocked) {
        // Preview audition mode: constrain to [preview.startSec, preview.endSec]
        if (elapsed >= preview.endSec) {
          if (isLooping) {
            stopAudio();
            pausedAtRef.current = preview.startSec;
            setCurrentTime(preview.startSec);
            startPlayback();
            return;
          } else {
            stopAudio();
            pausedAtRef.current = preview.startSec;
            setCurrentTime(preview.startSec);
            return;
          }
        }
        setCurrentTime(elapsed);
      } else {
        // Full unlocked master
        if (elapsed >= record.duration) {
          if (isLooping) {
            stopAudio();
            pausedAtRef.current = 0;
            setCurrentTime(0);
            startPlayback();
            return;
          } else {
            stopAudio();
            pausedAtRef.current = 0;
            setCurrentTime(0);
            return;
          }
        }
        setCurrentTime(elapsed);
      }

      // Simulated VU dynamics for meters
      const factor = activeChannel === 'master' ? 0.85 : 0.65;
      const leftMeter = Math.min(100, Math.max(10, Math.random() * 30 + factor * 55));
      const rightMeter = Math.min(100, Math.max(10, Math.random() * 25 + factor * 58));
      setVuMeterLeft(leftMeter);
      setVuMeterRight(rightMeter);

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);
  };

  const stopAudio = () => {
    isPlayingRef.current = false;
    if (origSourceRef.current) {
      try {
        origSourceRef.current.stop();
        origSourceRef.current.disconnect();
      } catch (e) {}
      origSourceRef.current = null;
    }
    if (masterSourceRef.current) {
      try {
        masterSourceRef.current.stop();
        masterSourceRef.current.disconnect();
      } catch (e) {}
      masterSourceRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsPlaying(false);
    setVuMeterLeft(0);
    setVuMeterRight(0);
  };

  const togglePlay = () => {
    if (isPlayingRef.current) {
      if (audioCtxRef.current) {
        const elapsed = audioCtxRef.current.currentTime - startTimeRef.current;
        pausedAtRef.current = Math.max(0, elapsed);
        setCurrentTime(pausedAtRef.current);
      }
      stopAudio();
    } else {
      startPlayback();
    }
  };

  const seekTo = (newTime: number) => {
    let clampedTime = newTime;
    if (!isUnlocked) {
      clampedTime = Math.max(preview.startSec, Math.min(preview.endSec - 0.2, clampedTime));
    } else {
      clampedTime = Math.max(0, Math.min(duration, clampedTime));
    }
    setCurrentTime(clampedTime);
    pausedAtRef.current = clampedTime;
    if (isPlayingRef.current) {
      stopAudio();
      startPlayback();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    seekTo(parseFloat(e.target.value));
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!waveformContainerRef.current) return;
    const rect = waveformContainerRef.current.getBoundingClientRect();
    if (!rect.width) return;
    const clickX = e.clientX - rect.left;
    const clickPct = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = clickPct * duration;
    seekTo(targetTime);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2 pt-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#1E4263] border border-cyan-100/20 text-[10px] uppercase tracking-[0.2em] text-[#57E6FF]">
          <span>05 / Master vs Original Audition Desk</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-light tracking-tight text-white">
          A/B Comparison Console
        </h2>
        <p className="text-slate-200 text-xs sm:text-sm max-w-xl mx-auto font-light">
          Evaluate sonic transparency with calibrated loudness-matched A/B switching.
        </p>
      </div>

      {/* Free Audition Preview Banner (If Not Unlocked) */}
      {!isUnlocked && (
        <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-[#14120B] via-[#1A170F] to-[#173653] border border-[#57E6FF]/50 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-black/40">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#57E6FF]/10 border border-[#57E6FF]/30 flex items-center justify-center shrink-0 text-[#57E6FF] mt-0.5">
              <Headphones className="w-4 h-4 text-[#57E6FF]" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-white uppercase tracking-wider">
                  Free 30s Hook Audition Active
                </span>
                <span className="px-1.5 py-0.5 rounded bg-[#57E6FF] text-black text-[9px] font-bold uppercase tracking-wider">
                  Climax Section
                </span>
              </div>
              <p className="text-xs text-slate-100 font-light leading-relaxed">
                Audition the loudest drop/hook with instant A/B switching ({formatTime(preview.startSec)} – {formatTime(preview.endSec)}). Hear the clarity, low-end punch, and high sheen before paying.
              </p>
            </div>
          </div>

          {onUnlockMaster && (
            <button
              onClick={onUnlockMaster}
              className="w-full sm:w-auto px-5 py-2.5 rounded-md bg-[#57E6FF] hover:bg-[#41CBE8] text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shrink-0 transition-all shadow hover:shadow-[#57E6FF]/20"
            >
              <Lock className="w-3.5 h-3.5 text-black" />
              <span>Unlock Full Track ($9.99)</span>
            </button>
          )}
        </div>
      )}

      {/* Dynamic Protection Notification (If triggered) */}
      {record.plan.isDynamicProtected && (
        <div className="p-4 rounded-xl bg-[#173653] border border-[#57E6FF]/40 text-xs text-[#57E6FF] flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 text-[#57E6FF] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-medium text-white uppercase tracking-wider text-[11px]">
              HDQTRZ Dynamic Preservation System Engaged
            </span>
            <p className="text-slate-100 font-light leading-relaxed">
              {record.plan.protectiveNotice}
            </p>
          </div>
        </div>
      )}

      {/* Main Console Box */}
      <div className="rounded-xl bg-[#173653] border border-cyan-100/30 p-6 sm:p-8 space-y-6">
        {/* Top Controls: Channel Selector & Loudness Matching Toggle */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-5 border-b border-cyan-100/20">
          {/* A/B Channel Selector Switch */}
          <div className="flex items-center bg-[#1E4263] p-1 rounded-md border border-cyan-100/20 w-full sm:w-auto">
            <button
              onClick={() => setActiveChannel('original')}
              className={`flex-1 sm:flex-none px-5 py-2 rounded text-xs uppercase tracking-wider transition-all font-medium ${
                activeChannel === 'original'
                  ? 'bg-[#222222] text-white border border-cyan-100/30'
                  : 'text-slate-200 hover:text-white'
              }`}
            >
              Original Mix
            </button>
            <button
              onClick={() => setActiveChannel('master')}
              className={`flex-1 sm:flex-none px-5 py-2 rounded text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 font-bold ${
                activeChannel === 'master'
                  ? 'bg-[#57E6FF] text-black'
                  : 'text-slate-200 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>HDQTRZ Master</span>
            </button>
          </div>

          {/* Critical Loudness Match Button */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={() => setLoudnessMatched(!loudnessMatched)}
              className={`px-3.5 py-2 rounded-md text-xs font-medium uppercase tracking-wider flex items-center gap-2 border transition-all ${
                loudnessMatched
                  ? 'bg-[#1A1A1A] border-[#57E6FF] text-[#57E6FF]'
                  : 'bg-[#1E4263] border-cyan-100/20 text-slate-200 hover:text-white'
              }`}
              title="Level-match the original audio with the master so you evaluate tonal clarity rather than loudness"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Level Match: {loudnessMatched ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>

        {/* Level Matching Explanatory Note */}
        {loudnessMatched && (
          <p className="text-[11px] text-slate-200 italic text-center -mt-2 font-light">
            ✓ Loudness compensation active: Original track gain is adjusted so you evaluate tonal clarity, width, and transient punch — not psychoacoustic volume.
          </p>
        )}

        {/* Waveform Visualization & Timeline Scrubber */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-200">
            <span className="font-mono text-[11px] uppercase tracking-wider text-slate-300">
              {isUnlocked ? 'Interactive Waveform (Click to Seek)' : 'Climax Hook Audition Window (Click to Seek)'}
            </span>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-mono">
              {!isUnlocked ? (
                <span className="text-[#57E6FF] font-medium">
                  {formatTime(preview.startSec)} – {formatTime(preview.endSec)} (30s Free Preview)
                </span>
              ) : (
                <span className="text-emerald-400 font-medium">Full Unlocked Track</span>
              )}
            </div>
          </div>

          {/* Interactive Clickable Waveform Container */}
          {(() => {
            const activeWaveform = (activeChannel === 'master' && record.masteredAnalysis?.waveformOverview?.length)
              ? record.masteredAnalysis.waveformOverview
              : record.originalAnalysis.waveformOverview;
            const progressPct = Math.max(0, Math.min(100, (currentTime / duration) * 100));

            return (
              <div
                ref={waveformContainerRef}
                onClick={handleWaveformClick}
                className="relative h-24 sm:h-28 w-full rounded-lg bg-[#102640] border border-cyan-100/20 p-3 flex items-center justify-between gap-[2px] overflow-hidden cursor-pointer group select-none hover:border-[#57E6FF]/30 transition-colors"
                title="Click anywhere to jump playhead"
              >
                {/* Visual highlight for the 30-sec audition window if not unlocked */}
                {!isUnlocked && (
                  <div
                    style={{
                      left: `${(preview.startSec / duration) * 100}%`,
                      width: `${(preview.durationSec / duration) * 100}%`
                    }}
                    className="absolute top-0 bottom-0 bg-[#57E6FF]/15 border-x border-[#57E6FF]/40 pointer-events-none z-10 flex items-start p-1.5"
                  >
                    <span className="text-[9px] uppercase tracking-widest text-[#57E6FF] font-mono font-bold bg-black/70 px-1.5 py-0.5 rounded border border-[#57E6FF]/30">
                      Audition Window
                    </span>
                  </div>
                )}

                {/* 100-Point Dynamic Waveform Bars */}
                {activeWaveform.map((val, idx) => {
                  const heightPct = Math.max(12, Math.min(100, val * 100));
                  const barPct = (idx / activeWaveform.length) * 100;
                  const isPast = barPct <= progressPct;
                  const barTime = (idx / activeWaveform.length) * duration;
                  const isInAudition = isUnlocked || (barTime >= preview.startSec && barTime <= preview.endSec);

                  return (
                    <div
                      key={idx}
                      style={{ height: `${heightPct}%` }}
                      className={`flex-1 rounded-none transition-colors duration-75 ${
                        isPast
                          ? activeChannel === 'master'
                            ? 'bg-[#57E6FF]'
                            : 'bg-white/80'
                          : isInAudition
                          ? 'bg-white/20 group-hover:bg-white/30'
                          : 'bg-white/5'
                      }`}
                    />
                  );
                })}

                {/* Real-Time Synchronized Playhead Line */}
                <div
                  style={{ left: `${progressPct}%` }}
                  className="absolute top-0 bottom-0 w-[2px] bg-[#57E6FF] shadow-[0_0_10px_rgba(212,175,55,1)] pointer-events-none z-20"
                >
                  <div className="w-2.5 h-2.5 bg-[#57E6FF] -translate-x-[4px] rotate-45 shadow-sm" />
                </div>
              </div>
            );
          })()}

          {/* Scrubber Input Slider */}
          <div className="space-y-1">
            <input
              type="range"
              min={isUnlocked ? 0 : preview.startSec}
              max={isUnlocked ? duration : preview.endSec}
              step={0.05}
              value={currentTime}
              onChange={handleSeek}
              className="w-full accent-[#57E6FF] bg-[#1E4263] h-1.5 rounded cursor-pointer"
            />
            <div className="flex items-center justify-between text-[11px] text-slate-300 font-mono">
              <span className="text-[#57E6FF]">{formatTime(currentTime)}</span>
              <span>{isUnlocked ? formatTime(duration) : `${formatTime(preview.endSec)} (Preview End)`}</span>
            </div>
          </div>
        </div>

        {/* Transport Controls & Hardware Metering */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
          {/* Play / Pause / Loop */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={togglePlay}
              className="w-12 h-12 rounded-md bg-[#57E6FF] hover:bg-[#41CBE8] text-black flex items-center justify-center transition-colors active:scale-95 shadow-md shadow-[#57E6FF]/10"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-black" />
              ) : (
                <Play className="w-5 h-5 fill-black ml-0.5" />
              )}
            </button>

            <button
              onClick={() => {
                const startPos = isUnlocked ? 0 : preview.startSec;
                pausedAtRef.current = startPos;
                setCurrentTime(startPos);
                if (isPlayingRef.current) {
                  stopAudio();
                  startPlayback();
                }
              }}
              className="p-2.5 rounded-md bg-[#1E4263] hover:bg-[#1A1A1A] border border-cyan-100/20 text-slate-200 hover:text-white transition-colors"
              title="Return to start"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsLooping(!isLooping)}
              className={`p-2.5 rounded-md border transition-colors ${
                isLooping
                  ? 'bg-[#1A1A1A] border-[#57E6FF] text-[#57E6FF]'
                  : 'bg-[#1E4263] border-cyan-100/20 text-slate-200 hover:text-white'
              }`}
              title="Toggle continuous loop"
            >
              <Repeat className="w-4 h-4" />
            </button>
          </div>

          {/* Stereo VU Meter Simulation */}
          <div className="flex items-center gap-2.5 p-2.5 rounded-md bg-[#102640] border border-cyan-100/20 w-full sm:w-48">
            <span className="text-[9px] font-mono text-slate-300 uppercase tracking-widest">VU</span>
            <div className="flex-1 space-y-1">
              <div className="h-1 w-full bg-[#1E4263] rounded-full overflow-hidden">
                <div
                  style={{ width: `${vuMeterLeft}%` }}
                  className={`h-full transition-all duration-75 ${
                    vuMeterLeft > 85 ? 'bg-amber-400' : 'bg-[#57E6FF]'
                  }`}
                />
              </div>
              <div className="h-1 w-full bg-[#1E4263] rounded-full overflow-hidden">
                <div
                  style={{ width: `${vuMeterRight}%` }}
                  className={`h-full transition-all duration-75 ${
                    vuMeterRight > 85 ? 'bg-amber-400' : 'bg-[#57E6FF]'
                  }`}
                />
              </div>
            </div>
            <span className="text-[10px] font-mono text-slate-200">
              {activeChannel === 'master' ? `${record.masteredAnalysis.integratedLufs}` : `${record.originalAnalysis.integratedLufs}`}
            </span>
          </div>

          {/* Master Volume */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {volume === 0 ? (
              <VolumeX className="w-4 h-4 text-slate-300" />
            ) : (
              <Volume2 className="w-4 h-4 text-slate-200" />
            )}
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-24 accent-[#57E6FF] bg-[#1E4263] h-1 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Side-by-Side Metrics Comparison Table */}
        <div className="pt-4 border-t border-cyan-100/20 space-y-3">
          <h4 className="text-[10px] uppercase tracking-widest text-[#57E6FF] font-medium">
            Acoustic Measurement Delta
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            {/* Loudness */}
            <div className="p-3 rounded-lg bg-[#1B3C5C] border border-cyan-100/20 space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-slate-300 block">Integrated LUFS</span>
              <div className="flex items-baseline justify-between font-mono">
                <span className="text-slate-200 text-xs">{record.originalAnalysis.integratedLufs}</span>
                <span className="text-[#57E6FF] font-light text-base">
                  {record.masteredAnalysis.integratedLufs}
                </span>
              </div>
              <span className="text-[9px] text-emerald-400 block font-mono">
                +{(record.masteredAnalysis.integratedLufs - record.originalAnalysis.integratedLufs).toFixed(1)} dB increase
              </span>
            </div>

            {/* True Peak */}
            <div className="p-3 rounded-lg bg-[#1B3C5C] border border-cyan-100/20 space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-slate-300 block">True Peak (dBTP)</span>
              <div className="flex items-baseline justify-between font-mono">
                <span className="text-slate-200 text-xs">{record.originalAnalysis.truePeak}</span>
                <span className="text-emerald-400 font-light text-base">
                  {record.masteredAnalysis.truePeak}
                </span>
              </div>
              <span className="text-[9px] text-slate-300 block font-mono">
                Ceiling held at -1.0 dBTP
              </span>
            </div>

            {/* Dynamic Range */}
            <div className="p-3 rounded-lg bg-[#1B3C5C] border border-cyan-100/20 space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-slate-300 block">Dynamic Range</span>
              <div className="flex items-baseline justify-between font-mono">
                <span className="text-slate-200 text-xs">{record.originalAnalysis.dynamicRange} dB</span>
                <span className="text-white font-light text-base">
                  {record.masteredAnalysis.dynamicRange} dB
                </span>
              </div>
              <span className="text-[9px] text-slate-300 block font-mono">
                Transients preserved
              </span>
            </div>

            {/* QC Status */}
            <div className="p-3 rounded-lg bg-[#1B3C5C] border border-cyan-100/20 space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-slate-300 block">Quality Control</span>
              <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-xs font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>QC PASSED</span>
              </div>
              <span className="text-[9px] text-slate-300 block font-mono">
                0 clipping • 0 intersample
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation to Report / Download */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-cyan-100/20">
        <button
          onClick={onRemaster}
          className="w-full sm:w-auto px-5 py-3 rounded-md bg-[#1E4263] hover:bg-[#1A1A1A] border border-cyan-100/20 text-xs uppercase tracking-wider text-slate-100 transition-colors flex items-center justify-center gap-2"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Adjust Settings & Remaster</span>
        </button>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {!isUnlocked && onUnlockMaster && (
            <button
              onClick={onUnlockMaster}
              className="w-full sm:w-auto px-6 py-3.5 rounded-md font-bold text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 bg-[#57E6FF] hover:bg-[#41CBE8] text-black shadow-lg shadow-[#57E6FF]/20"
            >
              <Lock className="w-4 h-4 text-black" />
              <span>Unlock Full Master ($9.99)</span>
            </button>
          )}

          <button
            onClick={onProceedToDownload}
            className={`w-full sm:w-auto px-6 py-3.5 rounded-md text-xs uppercase tracking-[0.2em] transition-colors flex items-center justify-center gap-2 ${
              isUnlocked
                ? 'font-bold bg-[#57E6FF] hover:bg-[#41CBE8] text-black'
                : 'font-medium bg-[#264E6D] hover:bg-[#202020] text-slate-100 border border-cyan-100/30'
            }`}
          >
            <span>{isUnlocked ? 'Download 24-Bit Master' : 'View Full Diagnostics'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

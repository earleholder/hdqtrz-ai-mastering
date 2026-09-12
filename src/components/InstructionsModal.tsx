import React, { useState } from 'react';
import {
  X,
  BookOpen,
  CheckCircle2,
  Sliders,
  Volume2,
  FileAudio,
  AlertTriangle,
  ArrowRight,
  Shield,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Cpu,
  Sparkles,
  Layers
} from 'lucide-react';

interface InstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstructionsModal: React.FC<InstructionsModalProps> = ({ isOpen, onClose }) => {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  if (!isOpen) return null;

  const faqs = [
    {
      q: 'How does Reference Track Matching work, and can I use MP3 reference files?',
      a: 'Reference Track Matching performs FFT cross-correlation analysis on any uploaded commercial master (WAV, MP3, AIFF, or FLAC). The engine isolates 8 key spectral acoustic zones (Sub, Low-Bass, Low-Mids, Mids, High-Mids, Presence, Brilliance, and Air) and compares your mix’s tonal energy curve against the target. It then synthesizes surgical compensation filters with an adjustable match intensity slider (20% to 100%). A musical safety clamp restricts maximum adjustments to ±2.8 dB, preventing phase distortion while achieving commercial tonal balance.'
    },
    {
      q: 'What is 4-Band Downward Multiband Compression and when should I use VCA vs. Opto?',
      a: 'HDQTRZ employs 4th-order Linkwitz-Riley (LR4, 24 dB/oct) crossover filters to split your audio into 4 phase-aligned zones: Sub (20–140 Hz), Low-Mids (140–1000 Hz), High-Mids (1000–6000 Hz), and Air (6000–20000 Hz). In "Auto" mode, the AI chooses the optimal circuit. Choose "VCA" (feedforward) for rapid transient control, aggressive punch, and tight low-end in modern genres (Hip Hop, Trap, EDM, Pop, Rock). Choose "Opto" (optical photocell modeling with non-linear dual-decay release) for organic, musical smoothing on acoustic, jazz, R&B, and ballad productions.'
    },
    {
      q: 'Why does HDQTRZ use 8x Polyphase Oversampling on Analog Harmonic Saturation?',
      a: 'Non-linear processing like tape hysteresis, triode tube saturation, and console transformer iron generation injects upper-order harmonic multiples. In a standard digital system, harmonics exceeding the Nyquist frequency (half the sample rate) fold back into the audible spectrum as dissonant, harsh intermodulation aliasing. HDQTRZ upsamples audio by 8x (to 352.8 kHz or 384 kHz) with a 64-tap linear-phase Blackman-Harris filter, allowing harmonics to disperse naturally. A steep decimation filter then cuts ultrasonic frequencies with >96 dB stopband rejection before downsampling, guaranteeing pure analog warmth with zero digital grain.'
    },
    {
      q: 'How does Decoupled Mid/Side Dynamic EQ preserve stereo width?',
      a: 'Traditional stereo dynamic EQs process both left and right channels identically, which can cause centered instruments (like kick drums or lead vocals) to inadvertently duck wide ambient sounds (like stereo synths or reverb tails). HDQTRZ decouples Mid (sum) and Side (difference) channels: resonant peaks in the center vocal or bass are suppressed purely in the Mid channel, while harsh sibilance or cymbal splash in the stereo field is treated independently in the Side channel, keeping your stereo image wide, stable, and focused.'
    },
    {
      q: 'How much headroom should my mix have before uploading?',
      a: 'Leave between -3 dB and -6 dB of true peak headroom on your stereo master bus. Ensure no limiters, clippers, or aggressive compressors are sitting on the master stereo bus. Let the HDQTRZ mastering engine handle the dynamic optimization and final loudness.'
    },
    {
      q: 'Which file format gives the highest fidelity result, and can I upload MP3s of my mix?',
      a: 'For your source mix, we strictly require uncompressed 24-bit WAV or AIFF (or lossless FLAC) at your native project sample rate (44.1 kHz, 48 kHz, or 96 kHz). MP3 uploads for source mixes are disabled because lossy compression creates phase smearing, pre-echoes, and an artificial high-frequency shelf cut around 16 kHz. However, commercial reference tracks CAN be uploaded in MP3 because our FFT spectral matcher only analyzes relative spectral envelope density.'
    },
    {
      q: 'What is the HDQTRZ mastering philosophy?',
      a: '"Less is best. Preserve the soul of the song." Unlike aggressive one-size-fits-all algorithms that flatten micro-dynamics and create ear fatigue, HDQTRZ makes surgical, program-adaptive corrections: transparent resonance suppression, phase-aligned multiband contouring, and 8x oversampled analog glue, lifting your master to competitive loudness while respecting original artistic intent.'
    },
    {
      q: 'What does loudness matching do in the A/B comparison player?',
      a: 'Human ears perceive louder audio as inherently "better" sounding (the Fletcher-Munson curve effect). When you enable loudness matching in our comparison player, the engine normalizes the audition levels so you can evaluate EQ balance, stereo depth, and punch without being tricked by volume differences.'
    },
    {
      q: 'Can I remaster or change parameters later?',
      a: 'Yes! Every processed master is stored in your Mastering Vault. You can re-open any track, switch the genre profile, alter the character (Warm Tube, Modern Crisp, Punchy Analog), toggle 4-band VCA/Opto multiband compression, or target a different LUFS ceiling without re-uploading your file.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-4xl rounded-xl bg-[#0A0A0A] border border-white/10 p-6 sm:p-10 space-y-8 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-md bg-[#111111] hover:bg-[#1A1A1A] text-gray-400 hover:text-white border border-white/5 transition-colors"
          title="Close instructions"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#111111] border border-white/5 text-[10px] uppercase tracking-[0.2em] text-[#D4AF37]">
            <BookOpen className="w-3 h-3 text-[#D4AF37]" />
            <span>Mastering Guide & Best Practices</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-light text-white tracking-tight">
            How to Master with HDQTRZ
          </h2>
          <p className="text-xs text-gray-400 font-light max-w-2xl leading-relaxed">
            Follow these professional studio mixing guidelines to achieve optimal dynamic range, stereo clarity, and pristine broadcast loudness.
          </p>
        </div>

        {/* 5-Step Workflow Overview */}
        <div className="space-y-3">
          <h3 className="text-[11px] uppercase tracking-[0.2em] text-[#D4AF37] font-medium">
            The Complete Mastering Workflow
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {[
              {
                step: '01',
                title: 'Upload Mix',
                desc: 'Drop in your 24-bit WAV stereo mix with -3 to -6 dB headroom, or load studio demo stems.'
              },
              {
                step: '02',
                title: 'AI Analysis',
                desc: 'EBU R128 integrated LUFS, crest factor, FFT spectrum, and inter-sample true peaks.'
              },
              {
                step: '03',
                title: 'Directives & Reference',
                desc: 'Configure genre, loudness, 4-band multiband circuit, and upload commercial reference tracks.'
              },
              {
                step: '04',
                title: 'DSP Engine',
                desc: 'Mid/Side Dynamic EQ, 8x oversampled analog saturation, LR4 multiband & true-peak limiter.'
              },
              {
                step: '05',
                title: 'A/B & Export',
                desc: 'Audition with level-matched comparison, review certification report, and export 24-bit WAV.'
              }
            ].map((item) => (
              <div
                key={item.step}
                className="p-4 rounded-lg bg-[#0F0F0F] border border-white/5 space-y-2 relative"
              >
                <span className="text-[10px] font-mono text-[#D4AF37] tracking-widest block">
                  STEP {item.step}
                </span>
                <h4 className="text-xs font-normal text-white">{item.title}</h4>
                <p className="text-[11px] text-gray-400 font-light leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* NEW: Advanced DSP & Mastering Modules Guide */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#D4AF37]" />
            <h3 className="text-[11px] uppercase tracking-[0.2em] text-[#D4AF37] font-medium">
              Advanced Mastering Directives & DSP Architecture
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* 4-Band Multiband Dynamics */}
            <div className="p-4 rounded-xl bg-[#0E0E0E] border border-white/5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-white font-medium flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>4-Band Downward Multiband Dynamics</span>
                </span>
                <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/5 text-[#D4AF37]">
                  Linkwitz-Riley LR4
                </span>
              </div>
              <p className="text-gray-400 text-[11px] font-light leading-relaxed">
                Uses 24 dB/oct phase-aligned crossovers at 140 Hz, 1 kHz, and 6 kHz to split audio into 4 distinct frequency zones (Sub, Low-Mids, High-Mids, Air).
              </p>
              <div className="pt-2 border-t border-white/5 grid grid-cols-2 gap-2 text-[10px]">
                <div className="bg-[#121212] p-2 rounded border border-white/5">
                  <span className="text-white font-medium block">VCA Circuit Mode</span>
                  <span className="text-gray-400 block font-light mt-0.5">
                    Fast feedforward attack. Tightens 140Hz sub-bass and clamps stray transients for Hip Hop, Trap, and EDM.
                  </span>
                </div>
                <div className="bg-[#121212] p-2 rounded border border-white/5">
                  <span className="text-white font-medium block">Opto Circuit Mode</span>
                  <span className="text-gray-400 block font-light mt-0.5">
                    Dual-decay optical photocell response. Musical, non-linear release for warm glue on R&amp;B, Jazz, and Ballads.
                  </span>
                </div>
              </div>
            </div>

            {/* Polyphase 8x Anti-Aliasing Oversampling */}
            <div className="p-4 rounded-xl bg-[#0E0E0E] border border-white/5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-white font-medium flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Polyphase 8x Oversampling Saturation</span>
                </span>
                <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/5 text-emerald-400">
                  &lt; -96 dB Aliasing Rejection
                </span>
              </div>
              <p className="text-gray-400 text-[11px] font-light leading-relaxed">
                When Tape, Tube, or Class-A Console saturation is applied, internal audio is upsampled 8x (to 352.8 kHz / 384 kHz) through a 64-tap linear-phase Blackman-Harris FIR filter.
              </p>
              <div className="pt-2 border-t border-white/5 bg-[#121212] p-2.5 rounded border border-white/5 text-[10px] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">Why it matters:</span>
                  <span className="text-[#D4AF37] font-mono">Zero Digital Harshness</span>
                </div>
                <p className="text-gray-400 font-light leading-relaxed">
                  Eliminates harmonic foldback intermodulation distortion in the audible 10 kHz–20 kHz region, preserving silky air and analog depth.
                </p>
              </div>
            </div>

            {/* Reference Track Matching */}
            <div className="p-4 rounded-xl bg-[#0E0E0E] border border-white/5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-white font-medium flex items-center gap-1.5">
                  <FileAudio className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Reference Track Spectral Matching</span>
                </span>
                <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/5 text-[#D4AF37]">
                  FFT Cross-Correlation
                </span>
              </div>
              <p className="text-gray-400 text-[11px] font-light leading-relaxed">
                Upload any commercial master (WAV, MP3, AIFF). HDQTRZ calculates its 8-band spectral envelope, loudness, and crest factor.
              </p>
              <div className="pt-2 border-t border-white/5 bg-[#121212] p-2.5 rounded border border-white/5 text-[10px] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">Musical Safety Clamping:</span>
                  <span className="text-emerald-400 font-mono">±2.8 dB Limit</span>
                </div>
                <p className="text-gray-400 font-light leading-relaxed">
                  Adjust match intensity from 20% to 100%. The AI engine aligns your mix to match commercial frequency balance without compromising original mix character.
                </p>
              </div>
            </div>

            {/* Decoupled Mid/Side Dynamic EQ */}
            <div className="p-4 rounded-xl bg-[#0E0E0E] border border-white/5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-white font-medium flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Decoupled Mid/Side Dynamic EQ</span>
                </span>
                <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/5 text-[#D4AF37]">
                  Stereo Independence
                </span>
              </div>
              <p className="text-gray-400 text-[11px] font-light leading-relaxed">
                Separates center channel information from side stereo width before tracking narrow-band resonant peaks.
              </p>
              <div className="pt-2 border-t border-white/5 bg-[#121212] p-2.5 rounded border border-white/5 text-[10px] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">Targeted Correction:</span>
                  <span className="text-white font-mono">Center Lead vs Stereo Space</span>
                </div>
                <p className="text-gray-400 font-light leading-relaxed">
                  Lead vocal and kick resonances in the center are attenuated without dulling stereo guitars or reverbs, maintaining a spacious, unclouded stereo field.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pre-Mastering Preparation Checklist */}
        <div className="p-5 rounded-xl bg-[#0E0E0E] border border-white/5 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
            <h3 className="text-xs uppercase tracking-wider text-white font-medium">
              Pre-Master Mix Preparation Checklist (Do's & Don'ts)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-light">
            {/* DO's */}
            <div className="space-y-2.5 p-4 rounded-lg bg-[#121212] border border-white/5">
              <span className="text-[10px] font-medium text-emerald-400 uppercase tracking-wider block">
                Recommended (Do This)
              </span>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 text-sm font-bold">✓</span>
                  <span><strong>Maintain -3 dB to -6 dB headroom:</strong> Peak transients should never touch or exceed 0.0 dBFS.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 text-sm font-bold">✓</span>
                  <span><strong>Export at source resolution:</strong> 24-bit WAV or AIFF at 44.1 kHz, 48 kHz, or 96 kHz.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 text-sm font-bold">✓</span>
                  <span><strong>Check mono compatibility:</strong> Confirm that the kick and lead vocal stay solid and do not cancel out in mono.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 text-sm font-bold">✓</span>
                  <span><strong>Leave clean tails:</strong> Allow reverb and delay decays to naturally fade out without sudden cuts.</span>
                </li>
              </ul>
            </div>

            {/* DON'Ts */}
            <div className="space-y-2.5 p-4 rounded-lg bg-[#121212] border border-white/5">
              <span className="text-[10px] font-medium text-red-400 uppercase tracking-wider block">
                Avoid (Don't Do This)
              </span>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-red-400 text-sm font-bold">✕</span>
                  <span><strong>No master bus brickwall limiters:</strong> Turn off peak limiters or clippers on your output channel before export.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 text-sm font-bold">✕</span>
                  <span><strong>No lossy MP3 or AAC uploads:</strong> MP3 files are blocked to prevent lossy distortion. Always upload uncompressed 24-bit WAV, AIFF, or FLAC.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 text-sm font-bold">✕</span>
                  <span><strong>Avoid oversaturated sub-bass:</strong> Uncontrolled low rumble below 25 Hz steals limiter headroom.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 text-sm font-bold">✕</span>
                  <span><strong>Avoid extreme stereo widening on bass:</strong> Keep frequencies under 120 Hz centered in mono.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Streaming Platform Loudness Quick Reference */}
        <div className="space-y-3">
          <h3 className="text-[11px] uppercase tracking-[0.2em] text-[#D4AF37] font-medium">
            Platform Loudness Targets & Delivery Specs
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-lg bg-[#0F0F0F] border border-white/5 space-y-1">
              <span className="text-gray-400 text-[10px] uppercase block">Streaming Platforms</span>
              <span className="text-white font-medium block">Spotify & YouTube</span>
              <span className="text-[#D4AF37] font-mono text-sm block font-light">-14 to -12 LUFS</span>
              <p className="text-[10px] text-gray-500 font-light">Max dynamic range, zero normalization penalty.</p>
            </div>

            <div className="p-3.5 rounded-lg bg-[#0F0F0F] border border-white/5 space-y-1">
              <span className="text-gray-400 text-[10px] uppercase block">Apple Music</span>
              <span className="text-white font-medium block">Sound Check Standard</span>
              <span className="text-[#D4AF37] font-mono text-sm block font-light">-16 to -14 LUFS</span>
              <p className="text-[10px] text-gray-500 font-light">Requires -1.0 dBTP true-peak ceiling.</p>
            </div>

            <div className="p-3.5 rounded-lg bg-[#0F0F0F] border border-white/5 space-y-1">
              <span className="text-gray-400 text-[10px] uppercase block">Club & Commercial</span>
              <span className="text-white font-medium block">Hip Hop, EDM & Trap</span>
              <span className="text-[#D4AF37] font-mono text-sm block font-light">-11 to -9 LUFS</span>
              <p className="text-[10px] text-gray-500 font-light">Loud, punchy, competitive playback.</p>
            </div>

            <div className="p-3.5 rounded-lg bg-[#0F0F0F] border border-white/5 space-y-1">
              <span className="text-gray-400 text-[10px] uppercase block">CD & Soundtracks</span>
              <span className="text-white font-medium block">Acoustic & Classical</span>
              <span className="text-[#D4AF37] font-mono text-sm block font-light">-14 to -16 LUFS</span>
              <p className="text-[10px] text-gray-500 font-light">Natural transients and micro-dynamics.</p>
            </div>
          </div>
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-3.5 h-3.5 text-[#D4AF37]" />
            <h3 className="text-[11px] uppercase tracking-[0.2em] text-[#D4AF37] font-medium">
              Frequently Asked Questions
            </h3>
          </div>

          <div className="space-y-2">
            {faqs.map((faq, index) => {
              const isOpen = expandedFaq === index;
              return (
                <div
                  key={index}
                  className="rounded-lg bg-[#0F0F0F] border border-white/5 overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setExpandedFaq(isOpen ? null : index)}
                    className="w-full p-3.5 flex items-center justify-between text-left text-xs text-white hover:text-[#D4AF37] transition-colors"
                  >
                    <span className="font-medium pr-4">{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-3.5 pb-3.5 text-xs text-gray-400 font-light leading-relaxed border-t border-white/5 pt-2.5">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/5">
          <div className="flex items-center gap-2 text-[11px] text-gray-500 font-light">
            <Shield className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Questions about analog hardware? Visit our Human Suite for hybrid mastering.</span>
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-md bg-[#D4AF37] hover:bg-[#C19A2E] text-black font-bold text-xs uppercase tracking-wider transition-colors"
          >
            Got It, Back to Studio
          </button>
        </div>
      </div>
    </div>
  );
};

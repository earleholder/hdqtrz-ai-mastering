import React, { useState, useRef } from 'react';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Disc3,
  Flame,
  HelpCircle,
  Info,
  Layers,
  Radio,
  ShieldCheck,
  Sliders,
  Sparkles,
  Volume2,
  Wand2,
  Waves,
  UploadCloud,
  Check,
  X,
  SlidersHorizontal,
  Cpu,
  FileAudio
} from 'lucide-react';
import {
  DynamicEQMode,
  Genre,
  LoudnessTarget,
  MasteringCharacter,
  MultibandMode,
  ReferenceTrackProfile,
  SaturationFlavor,
  SaturationIntensity
} from '../types';
import { robustDecodeAudio } from '../audio/audioDecoder';
import { analyzeReferenceTrack } from '../audio/analyzer';

interface PreferencesViewProps {
  initialGenre?: Genre;
  initialLufs?: LoudnessTarget;
  initialCharacter?: MasteringCharacter;
  initialDynamicEQMode?: DynamicEQMode;
  initialSaturationFlavor?: SaturationFlavor;
  initialSaturationIntensity?: SaturationIntensity;
  initialMultibandMode?: MultibandMode;
  onStartMastering: (
    genre: Genre,
    targetLufs: LoudnessTarget,
    character: MasteringCharacter,
    directives?: {
      dynamicEQMode: DynamicEQMode;
      saturationFlavor: SaturationFlavor;
      saturationIntensity: SaturationIntensity;
      multibandMode?: MultibandMode;
      referenceProfile?: ReferenceTrackProfile;
      referenceMatchIntensity?: number;
    }
  ) => void;
  onBack: () => void;
}

const ALL_GENRES: { genre: Genre; tag: string }[] = [
  { genre: 'Hip Hop / Rap', tag: 'Deep sub, punchy transients, tight presence' },
  { genre: 'Trap', tag: 'Heavy 808 control, crisp top end, aggressive limiting' },
  { genre: 'R&B / Soul', tag: 'Warm low mids, silky vocal presence, organic groove' },
  { genre: 'Pop', tag: 'Polished commercial translation, upfront vocals, balanced air' },
  { genre: 'Rock', tag: 'Dynamic live kit punch, stereo guitar width, edge preservation' },
  { genre: 'Alternative', tag: 'Textured dynamics, natural acoustic space, raw character' },
  { genre: 'Electronic', tag: 'High-energy spectral balance, synthetic transient snap' },
  { genre: 'EDM', tag: 'Massive club dynamics, club mono sub, maximized density' },
  { genre: 'House', tag: 'Driving 4/4 low-end punch, open hats, club translation' },
  { genre: 'Dance', tag: 'Rhythmic forward bass, vibrant top-end shine' },
  { genre: 'Indie', tag: 'Dynamic integrity, minimal coloration, organic timbre' },
  { genre: 'Singer / Songwriter', tag: 'Intimate vocal articulation, pristine acoustic instruments' },
  { genre: 'Country', tag: 'Natural acoustic guitars, clean vocal center, vocal intelligibility' },
  { genre: 'Jazz', tag: 'Ultra-high dynamic preservation, authentic room acoustics' },
  { genre: 'Classical', tag: 'Pristine wide crest factor, zero compression coloration' },
  { genre: 'Gospel', tag: 'Wide choral dynamics, rich organ fundamentals, powerful peaks' },
  { genre: 'Funk', tag: 'Snappy slap bass transients, punchy brass, tight rhythm' },
  { genre: 'Blues', tag: 'Warm analog harmonic texture, natural guitar dynamics' },
  { genre: 'Latin', tag: 'Complex percussion transients, lively stereo separation' },
  { genre: 'Reggae', tag: 'Heavy sub-bass anchor, snappy rimshots, dub spatial depth' },
  { genre: 'Heavy Metal', tag: 'Dense wall of guitars, kick clarity, controlled 3kHz fatigue' },
  { genre: 'World Music', tag: 'Diverse acoustic frequency spectrum, preserved natural transients' },
  { genre: 'Other', tag: 'Adaptive statistical acoustic balance' }
];

const LOUDNESS_OPTIONS: { lufs: LoudnessTarget; title: string; desc: string; isDefault?: boolean }[] = [
  {
    lufs: -9,
    title: '-9 LUFS',
    desc: 'Loud and energetic. High density for competitive club, trap, and heavy modern commercial genres.'
  },
  {
    lufs: -10,
    title: '-10 LUFS',
    desc: 'Modern and powerful. Sits right at the forefront of contemporary pop and hip hop releases.'
  },
  {
    lufs: -11,
    title: '-11 LUFS',
    desc: 'Balanced modern master. Recommended standard for optimal translation across all playback systems.',
    isDefault: true
  },
  {
    lufs: -12,
    title: '-12 LUFS',
    desc: 'Dynamic and polished. Healthy transient headroom for rock, electronic, and dynamic pop.'
  },
  {
    lufs: -13,
    title: '-13 LUFS',
    desc: 'More dynamic. Preserves greater micro-dynamics, breathing room, and snare snap.'
  },
  {
    lufs: -14,
    title: '-14 LUFS',
    desc: 'Streaming-friendly dynamic master. Closest to standard digital distribution normalization targets.'
  }
];

const CHARACTER_OPTIONS: { character: MasteringCharacter; title: string; desc: string; isDefault?: boolean }[] = [
  {
    character: 'transparent',
    title: 'Transparent',
    desc: 'Minimal coloration and maximum mix preservation. HDQTRZ "less is best" purity.',
    isDefault: true
  },
  {
    character: 'warm',
    title: 'Warm',
    desc: 'Slightly fuller low mids and smoother highs. Evokes classic analog transformer roundness.'
  },
  {
    character: 'modern',
    title: 'Modern',
    desc: 'Controlled low end, detailed presence, and clean competitive clarity.'
  },
  {
    character: 'punchy',
    title: 'Punchy',
    desc: 'Preserves and accentuates transient snap on drums, bass, and rhythmic attacks.'
  },
  {
    character: 'open',
    title: 'Open',
    desc: 'Greater perceived clarity, air extension, and three-dimensional spatial depth.'
  },
  {
    character: 'smooth',
    title: 'Smooth',
    desc: 'Reduces upper-midrange harshness and sibilance while maintaining musical articulation.'
  }
];

export const PreferencesView: React.FC<PreferencesViewProps> = ({
  initialGenre = 'Hip Hop / Rap',
  initialLufs = -11,
  initialCharacter = 'transparent',
  initialDynamicEQMode = 'auto',
  initialSaturationFlavor = 'none',
  initialSaturationIntensity = 'subtle',
  initialMultibandMode = 'auto',
  onStartMastering,
  onBack
}) => {
  const [selectedGenre, setSelectedGenre] = useState<Genre>(initialGenre);
  const [selectedLufs, setSelectedLufs] = useState<LoudnessTarget>(initialLufs);
  const [selectedCharacter, setSelectedCharacter] = useState<MasteringCharacter>(initialCharacter);
  const [selectedDynamicEQMode, setSelectedDynamicEQMode] = useState<DynamicEQMode>(initialDynamicEQMode);
  const [selectedSaturationFlavor, setSelectedSaturationFlavor] = useState<SaturationFlavor>(initialSaturationFlavor);
  const [selectedSaturationIntensity, setSelectedSaturationIntensity] = useState<SaturationIntensity>(initialSaturationIntensity);
  const [selectedMultibandMode, setSelectedMultibandMode] = useState<MultibandMode>(initialMultibandMode);
  const [referenceProfile, setReferenceProfile] = useState<ReferenceTrackProfile | null>(null);
  const [referenceMatchIntensity, setReferenceMatchIntensity] = useState<number>(0.65);
  const [isAnalyzingRef, setIsAnalyzingRef] = useState<boolean>(false);
  const [refError, setRefError] = useState<string | null>(null);
  const [genreSearch, setGenreSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReferenceFileSelected = async (file: File) => {
    setRefError(null);
    setIsAnalyzingRef(true);
    try {
      const { buffer, ctx } = await robustDecodeAudio(file);
      const profile = analyzeReferenceTrack(buffer, file.name.replace(/\.[^/.]+$/, ''), referenceMatchIntensity);
      setReferenceProfile(profile);
      ctx.close().catch(() => {});
    } catch (err) {
      console.error('Failed to analyze reference track:', err);
      setRefError('Unable to analyze reference track. Please provide an uncorrupted WAV, MP3, or AIFF file.');
    } finally {
      setIsAnalyzingRef(false);
    }
  };

  const filteredGenres = ALL_GENRES.filter(g =>
    g.genre.toLowerCase().includes(genreSearch.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2 pt-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#1E4263] border border-cyan-100/20 text-[10px] uppercase tracking-[0.2em] text-[#57E6FF]">
          <span>03 / Mastering Directives & Sonic Target</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-light tracking-tight text-white">
          Mastering Directives
        </h2>
        <p className="text-slate-200 text-xs sm:text-sm max-w-xl mx-auto font-light">
          Set acoustic intent. The HDQTRZ engine shapes signal dynamics while preserving original nuance.
        </p>
      </div>

      {/* STEP 1: Genre Selection */}
      <div className="rounded-xl bg-[#173653] border border-cyan-100/30 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-cyan-100/20 pb-3">
          <div>
            <h3 className="text-xs uppercase tracking-widest text-[#57E6FF] font-medium">
              1. Genre & Acoustic Context
            </h3>
            <p className="text-xs text-slate-300 font-light mt-0.5">
              Contextual guidance only — no static presets or heavy-handed coloring.
            </p>
          </div>

          <input
            type="text"
            placeholder="Search genre..."
            value={genreSearch}
            onChange={(e) => setGenreSearch(e.target.value)}
            className="w-full sm:w-48 px-3 py-1.5 rounded bg-[#1E4263] border border-cyan-100/30 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#57E6FF]"
          />
        </div>

        {/* Genre Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1">
          {filteredGenres.map(({ genre, tag }) => {
            const isSelected = selectedGenre === genre;
            return (
              <button
                key={genre}
                type="button"
                onClick={() => setSelectedGenre(genre)}
                className={`p-3 rounded text-left transition-all border ${
                  isSelected
                    ? 'bg-[#1A1A1A] border-[#57E6FF] text-white'
                    : 'bg-[#1E4263] border-cyan-100/20 hover:border-cyan-100/40 text-slate-200 hover:text-white'
                }`}
              >
                <div className="text-xs font-medium truncate">{genre}</div>
                <div className="text-[10px] text-slate-300 mt-0.5 truncate">{tag}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 2: Target Loudness */}
      <div className="rounded-xl bg-[#173653] border border-cyan-100/30 p-6 space-y-4">
        <div className="border-b border-cyan-100/20 pb-3">
          <h3 className="text-xs uppercase tracking-widest text-[#57E6FF] font-medium">
            2. Integrated Loudness Target
          </h3>
          <p className="text-xs text-slate-300 font-light mt-0.5">
            Calibrated for broadcast translation across major streaming codecs and analog systems.
          </p>
        </div>

        {/* Loudness Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {LOUDNESS_OPTIONS.map((opt) => {
            const isSelected = selectedLufs === opt.lufs;
            return (
              <button
                key={opt.lufs}
                type="button"
                onClick={() => setSelectedLufs(opt.lufs)}
                className={`p-4 rounded-lg text-left transition-all border relative flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#1A1A1A] border-[#57E6FF] text-white'
                    : 'bg-[#1E4263] border-cyan-100/20 hover:border-cyan-100/40 text-slate-200 hover:text-white'
                }`}
              >
                {opt.isDefault && (
                  <span className="absolute top-2.5 right-2.5 px-1.5 py-0.5 rounded text-[8px] font-medium uppercase tracking-widest bg-[#1A1A1A] text-[#57E6FF] border border-[#57E6FF]/50">
                    Recommended
                  </span>
                )}
                <div>
                  <div className="font-mono text-xl font-light text-white">{opt.title}</div>
                  <p className="text-xs text-slate-200 mt-2 font-light leading-relaxed">{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Dynamic Protection Guarantee Notice */}
        <div className="p-3 rounded-lg bg-[#1E4263] border border-cyan-100/20 flex items-start gap-2.5 text-xs text-slate-200">
          <ShieldCheck className="w-4 h-4 text-[#57E6FF] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-medium text-white text-[11px] uppercase tracking-wider">Dynamic Integrity Guardrail</span>
            <p className="text-slate-200 text-xs font-light leading-relaxed">
              If your mix features high crest factor or acoustic dynamics, the engine protects transients from harsh clipping or pumping.
            </p>
          </div>
        </div>
      </div>

      {/* STEP 3: Mastering Character */}
      <div className="rounded-xl bg-[#173653] border border-cyan-100/30 p-6 space-y-4">
        <div className="border-b border-cyan-100/20 pb-3">
          <h3 className="text-xs uppercase tracking-widest text-[#57E6FF] font-medium">
            3. Mastering Character & Tone
          </h3>
          <p className="text-xs text-slate-300 font-light mt-0.5">
            Steers the harmonic saturation, dynamic envelope curve, and air presence.
          </p>
        </div>

        {/* Character Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {CHARACTER_OPTIONS.map((char) => {
            const isSelected = selectedCharacter === char.character;
            return (
              <button
                key={char.character}
                type="button"
                onClick={() => setSelectedCharacter(char.character)}
                className={`p-4 rounded-lg text-left transition-all border relative flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#1A1A1A] border-[#57E6FF] text-white'
                    : 'bg-[#1E4263] border-cyan-100/20 hover:border-cyan-100/40 text-slate-200 hover:text-white'
                }`}
              >
                {char.isDefault && (
                  <span className="absolute top-2.5 right-2.5 px-1.5 py-0.5 rounded text-[8px] font-medium uppercase tracking-widest bg-[#1A1A1A] text-[#57E6FF] border border-[#57E6FF]/50">
                    Default
                  </span>
                )}
                <div>
                  <div className="text-sm uppercase tracking-wider font-medium text-white">{char.title}</div>
                  <p className="text-xs text-slate-200 mt-2 font-light leading-relaxed">{char.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 4: Multi-Band Dynamic EQ & Harsh Resonance Suppression */}
      <div className="rounded-xl bg-[#173653] border border-cyan-100/30 p-6 space-y-4">
        <div className="border-b border-cyan-100/20 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs uppercase tracking-widest text-[#57E6FF] font-medium flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-[#57E6FF]" />
              <span>4. Multi-Band Dynamic EQ & Mid/Side Resonance Control</span>
            </h3>
            <p className="text-xs text-slate-300 font-light mt-0.5">
              Decoupled Mid/Side dynamic EQ: Isolates center lead vocals & snare crack independently from wide stereo cymbals & reverb splash with zero cross-channel phase smear.
            </p>
          </div>
          <span className="text-[10px] text-slate-200 bg-[#234A6A] px-2.5 py-1 rounded border border-cyan-100/20 uppercase tracking-wider self-start sm:self-auto">
            Mid/Side Decoupled • Zero Phase Smear
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              id: 'auto' as DynamicEQMode,
              title: 'Auto Mid/Side',
              tag: 'Recommended',
              desc: 'Analyzes stereo spectrum and intelligently deploys decoupled Mid (vocals/snare) and Side (cymbals/reverb) dynamic suppression.'
            },
            {
              id: 'mid-side' as DynamicEQMode,
              title: 'Decoupled M/S',
              tag: 'Console Standard',
              desc: 'Decouples Center de-essing (3.4 kHz Mid) from wide stereo edge taming (7.2 kHz Side) with zero compromise to vocal air.'
            },
            {
              id: 'surgical' as DynamicEQMode,
              title: 'Surgical Control',
              tag: 'Tame Harsh Mixes',
              desc: 'Tightens dynamic threshold across 3.4 kHz Mid, 7.2 kHz Side, 320 Hz boxiness, and 65 Hz sub boom for aggressive cleanup.'
            },
            {
              id: 'bypassed' as DynamicEQMode,
              title: 'Bypassed',
              tag: 'Pure Passthrough',
              desc: 'Leaves all frequency bands untouched by dynamic filters. Ideal for already pristine, pre-de-essed mixing studio tracks.'
            }
          ].map((opt) => {
            const isSelected = selectedDynamicEQMode === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedDynamicEQMode(opt.id)}
                className={`p-4 rounded-lg text-left transition-all border relative flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#1A1A1A] border-[#57E6FF] text-white'
                    : 'bg-[#1E4263] border-cyan-100/20 hover:border-cyan-100/40 text-slate-200 hover:text-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm uppercase tracking-wider font-medium text-white">{opt.title}</div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider ${
                      isSelected ? 'bg-[#57E6FF]/20 text-[#57E6FF] border border-[#57E6FF]/30' : 'bg-white/5 text-slate-200'
                    }`}>
                      {opt.tag}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 mt-2 font-light leading-relaxed">{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 5: True Analog Harmonic Saturation */}
      <div className="rounded-xl bg-[#173653] border border-cyan-100/30 p-6 space-y-4">
        <div className="border-b border-cyan-100/20 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs uppercase tracking-widest text-[#57E6FF] font-medium flex items-center gap-2">
              <Flame className="w-3.5 h-3.5 text-[#57E6FF]" />
              <span>5. Analog Harmonic Saturation & Excitation</span>
            </h3>
            <p className="text-xs text-slate-300 font-light mt-0.5">
              Physical modeling of analog transformers, magnetic tape hysteresis (odd harmonics), and Class-A tubes (even harmonics).
            </p>
          </div>
          {selectedSaturationFlavor !== 'none' && (
            <div className="flex items-center gap-1.5 bg-[#234A6A] p-1 rounded border border-cyan-100/20">
              {(['subtle', 'moderate'] as SaturationIntensity[]).map((intensity) => (
                <button
                  key={intensity}
                  type="button"
                  onClick={() => setSelectedSaturationIntensity(intensity)}
                  className={`text-[10px] px-2.5 py-1 rounded uppercase tracking-wider transition-colors ${
                    selectedSaturationIntensity === intensity
                      ? 'bg-[#57E6FF] text-black font-semibold'
                      : 'text-slate-200 hover:text-white'
                  }`}
                >
                  {intensity === 'subtle' ? 'Subtle (Mastering)' : 'Moderate (Vibe)'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Anti-Aliasing Oversampling Protection Badge */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-[#0D0D0D] border border-cyan-100/20 text-[11px]">
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-[#57E6FF]" />
            <span className="text-slate-100 font-medium">Polyphase 8x Anti-Aliasing Oversampling</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-[10px] text-emerald-400">
              Active • Linear-Phase Filter &lt; -96 dB foldback suppression
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              id: 'none' as SaturationFlavor,
              title: 'Pristine Digital',
              harmonic: '0.0% THD',
              desc: 'Pure digital transparency without harmonic coloration. Preserves clinically pristine mix balance.'
            },
            {
              id: 'tape' as SaturationFlavor,
              title: 'Vintage Tape',
              harmonic: '3rd Odd Harmonics',
              desc: 'Studer/ATR magnetic tape hysteresis emulation. Rounds transient spikes and glues rhythm foundations.'
            },
            {
              id: 'tube' as SaturationFlavor,
              title: 'Warm Tube',
              harmonic: '2nd Even Harmonics',
              desc: 'Class-A triode vacuum valve overtone modeling. Generates octave warmth, vocal body, and silky depth.'
            },
            {
              id: 'console' as SaturationFlavor,
              title: 'Class-A Console',
              harmonic: 'Balanced Harmonics',
              desc: 'Discrete console transformer core modeling. Brings upfront punch, solid midrange focus, and analog presence.'
            }
          ].map((sat) => {
            const isSelected = selectedSaturationFlavor === sat.id;
            return (
              <button
                key={sat.id}
                type="button"
                onClick={() => setSelectedSaturationFlavor(sat.id)}
                className={`p-4 rounded-lg text-left transition-all border relative flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#1A1A1A] border-[#57E6FF] text-white'
                    : 'bg-[#1E4263] border-cyan-100/20 hover:border-cyan-100/40 text-slate-200 hover:text-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm uppercase tracking-wider font-medium text-white">{sat.title}</div>
                  </div>
                  <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider bg-white/5 text-[#57E6FF]">
                    {sat.harmonic}
                  </span>
                  <p className="text-xs text-slate-200 mt-2 font-light leading-relaxed">{sat.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 6: Full 4-Band Downward Multiband Dynamics */}
      <div className="rounded-xl bg-[#173653] border border-cyan-100/30 p-6 space-y-4">
        <div className="border-b border-cyan-100/20 pb-3">
          <h3 className="text-xs uppercase tracking-widest text-[#57E6FF] font-medium flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#57E6FF]" />
            <span>6. 4-Band Downward Multiband Dynamics (VCA / Opto)</span>
          </h3>
          <p className="text-xs text-slate-300 font-light mt-0.5">
            Splits audio into 4 Linkwitz-Riley crossover zones (Sub 140Hz, Low-Mid 1kHz, High-Mid 6kHz, Air 20kHz) for independent macro-dynamic contouring.
          </p>
        </div>

        {/* Multiband Mode Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              id: 'auto' as MultibandMode,
              title: 'Auto (Program-Adaptive)',
              badge: 'Smart Engine',
              desc: 'AI chooses VCA punch for rhythmic/modern genres or Opto leveling for acoustic/warm genres.'
            },
            {
              id: 'vca' as MultibandMode,
              title: 'VCA Downward Punch',
              badge: 'Fast Attack',
              desc: 'Feedforward VCA emulation (SSL/API style). Tightens 140Hz sub-bass and clamps stray transient peaks.'
            },
            {
              id: 'opto' as MultibandMode,
              title: 'Opto Musical Leveling',
              badge: 'Dual Decay',
              desc: 'Optical photocell modeling (LA-2A/Tube-Tech style). Non-linear release for silky musical glue.'
            },
            {
              id: 'bypassed' as MultibandMode,
              title: 'Bypassed',
              badge: 'Linear',
              desc: 'Preserves raw multiband dynamics without multi-stage downward compression.'
            }
          ].map((mode) => {
            const isSelected = selectedMultibandMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setSelectedMultibandMode(mode.id)}
                className={`p-4 rounded-lg text-left transition-all border relative flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#1A1A1A] border-[#57E6FF] text-white'
                    : 'bg-[#1E4263] border-cyan-100/20 hover:border-cyan-100/40 text-slate-200 hover:text-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm uppercase tracking-wider font-medium text-white">{mode.title}</div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider ${
                      isSelected ? 'bg-[#57E6FF]/20 text-[#57E6FF] border border-[#57E6FF]/30' : 'bg-white/5 text-slate-200'
                    }`}>
                      {mode.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 mt-2 font-light leading-relaxed">{mode.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Multiband Band Breakdown Preview */}
        {selectedMultibandMode !== 'bypassed' && (
          <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <div className="bg-[#121212] p-2.5 rounded border border-cyan-100/20 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-white font-medium">Band 1: Sub</span>
                <span className="text-[#57E6FF] font-mono text-[10px]">20–140 Hz</span>
              </div>
              <p className="text-[10px] text-slate-200 font-light">Sub-bass weight &amp; kick fundamental stabilization</p>
            </div>
            <div className="bg-[#121212] p-2.5 rounded border border-cyan-100/20 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-white font-medium">Band 2: Low-Mid</span>
                <span className="text-[#57E6FF] font-mono text-[10px]">140–1000 Hz</span>
              </div>
              <p className="text-[10px] text-slate-200 font-light">Bass warmth &amp; vocal chest body contouring</p>
            </div>
            <div className="bg-[#121212] p-2.5 rounded border border-cyan-100/20 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-white font-medium">Band 3: High-Mid</span>
                <span className="text-[#57E6FF] font-mono text-[10px]">1000–6000 Hz</span>
              </div>
              <p className="text-[10px] text-slate-200 font-light">Snare crack, vocal presence &amp; guitar articulation</p>
            </div>
            <div className="bg-[#121212] p-2.5 rounded border border-cyan-100/20 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-white font-medium">Band 4: Air</span>
                <span className="text-[#57E6FF] font-mono text-[10px]">6000–20 kHz</span>
              </div>
              <p className="text-[10px] text-slate-200 font-light">Cymbal sheen, vocal sibilance control &amp; top air</p>
            </div>
          </div>
        )}
      </div>

      {/* STEP 7: Reference Track Matching via FFT Cross-Correlation */}
      <div className="rounded-xl bg-[#173653] border border-cyan-100/30 p-6 space-y-4">
        <div className="border-b border-cyan-100/20 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs uppercase tracking-widest text-[#57E6FF] font-medium flex items-center gap-2">
              <FileAudio className="w-3.5 h-3.5 text-[#57E6FF]" />
              <span>7. Reference Track Matching (FFT Spectral Cross-Correlation)</span>
            </h3>
            <p className="text-xs text-slate-300 font-light mt-0.5">
              Upload a commercial master to analyze its spectral density and morph the mastering EQ profile to mirror the target tonal envelope.
            </p>
          </div>
          {referenceProfile && (
            <button
              type="button"
              onClick={() => setReferenceProfile(null)}
              className="text-[10px] uppercase tracking-wider text-rose-400 hover:text-rose-300 flex items-center gap-1 self-start sm:self-auto"
            >
              <X className="w-3 h-3" />
              <span>Clear Reference</span>
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/wav,audio/mp3,audio/mpeg,audio/flac,audio/x-m4a,audio/aac,audio/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleReferenceFileSelected(file);
          }}
        />

        {!referenceProfile ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) handleReferenceFileSelected(file);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              isAnalyzingRef
                ? 'border-[#57E6FF] bg-[#234A6A]'
                : 'border-cyan-100/30 hover:border-white/30 bg-[#1B3C5C]'
            }`}
          >
            {isAnalyzingRef ? (
              <div className="space-y-2">
                <div className="w-6 h-6 border-2 border-[#57E6FF] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-[#57E6FF] font-medium">
                  Decoding &amp; Calculating Reference FFT Spectral Envelope...
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <UploadCloud className="w-6 h-6 text-slate-300 mx-auto" />
                <div>
                  <p className="text-xs text-slate-100 font-medium">
                    Upload Commercial Reference Track (WAV, MP3, AIFF)
                  </p>
                  <p className="text-[10px] text-slate-300 font-light mt-0.5">
                    Drag and drop file here, or click to browse reference master
                  </p>
                </div>
              </div>
            )}
            {refError && <p className="text-xs text-rose-400 mt-2 font-light">{refError}</p>}
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-[#1E4263] border border-[#57E6FF]/40 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cyan-100/20 pb-3">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#57E6FF] font-medium block">
                  Reference Master Analyzed
                </span>
                <span className="text-sm font-medium text-white block">{referenceProfile.title}</span>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-300 block uppercase">Target LUFS</span>
                  <span className="text-[#57E6FF]">{referenceProfile.integratedLufs} LUFS</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-300 block uppercase">Dynamic Range</span>
                  <span className="text-white">{referenceProfile.dynamicRange} dB</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-300 block uppercase">True Peak</span>
                  <span className="text-emerald-400">{referenceProfile.truePeak} dBTP</span>
                </div>
              </div>
            </div>

            {/* Match Intensity Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-100 font-medium">FFT Spectral Match Intensity</span>
                <span className="text-[#57E6FF] font-mono font-medium">
                  {Math.round(referenceMatchIntensity * 100)}% Match
                </span>
              </div>
              <input
                type="range"
                min="0.2"
                max="1.0"
                step="0.05"
                value={referenceMatchIntensity}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setReferenceMatchIntensity(val);
                  setReferenceProfile(prev => prev ? { ...prev, matchIntensity: val } : null);
                }}
                className="w-full accent-[#57E6FF] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-300 font-light">
                <span>Subtle Correction (20%)</span>
                <span>Balanced Mastering Alignment (65%)</span>
                <span>Full Envelope Match (100%)</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-200 font-light leading-relaxed">
              HDQTRZ AI will derive 8 surgical filter bands across sub-bass, midrange, presence, and air to morph your track's tonal balance toward &ldquo;{referenceProfile.title}&rdquo; while mathematically clamping gain within &plusmn;2.8 dB to preserve mix authenticity.
            </p>
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-cyan-100/20">
        <button
          onClick={onBack}
          className="w-full sm:w-auto px-5 py-3 rounded-md bg-[#1E4263] hover:bg-[#1A1A1A] border border-cyan-100/20 text-xs uppercase tracking-wider text-slate-100 transition-colors flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Analysis</span>
        </button>

        <button
          onClick={() =>
            onStartMastering(selectedGenre, selectedLufs, selectedCharacter, {
              dynamicEQMode: selectedDynamicEQMode,
              saturationFlavor: selectedSaturationFlavor,
              saturationIntensity: selectedSaturationIntensity,
              multibandMode: selectedMultibandMode,
              referenceProfile: referenceProfile || undefined,
              referenceMatchIntensity
            })
          }
          className="w-full sm:w-auto px-8 py-3.5 rounded-md font-bold text-xs uppercase tracking-[0.2em] transition-colors flex items-center justify-center gap-2 bg-[#57E6FF] hover:bg-[#41CBE8] text-black"
        >
          <Wand2 className="w-4 h-4 text-black" />
          <span>Render Master with HDQTRZ AI</span>
        </button>
      </div>
    </div>
  );
};

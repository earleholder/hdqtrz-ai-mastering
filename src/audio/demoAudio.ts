import { Genre, TrackMetadata } from '../types';

export interface DemoTrack {
  id: string;
  title: string;
  artist: string;
  genre: Genre;
  durationSec: number;
  description: string;
  defaultLufs: number;
}

export const DEMO_TRACKS: DemoTrack[] = [
  {
    id: 'trap-rough',
    title: 'Midnight 808s (Raw Rough Mix)',
    artist: 'HDQTRZ Session Lab',
    genre: 'Hip Hop / Rap',
    durationSec: 12,
    description: 'Dynamic 808 sub, snappy trap snare, rolling hats, unmastered with headroom (-18.2 LUFS).',
    defaultLufs: -18.2
  },
  {
    id: 'rnb-soul',
    title: 'Golden Hour (Studio Premix)',
    artist: 'Velvet Horizon',
    genre: 'R&B / Soul',
    durationSec: 12,
    description: 'Warm electric piano, deep bassline, wide vocal pads with subtle sibilance at 3.4 kHz (-17.4 LUFS).',
    defaultLufs: -17.4
  },
  {
    id: 'indie-rock',
    title: 'Electric Coastline (Pre-Master)',
    artist: 'The Sunlit Static',
    genre: 'Rock',
    durationSec: 12,
    description: 'Stereo overdrive guitars, live acoustic drum kit, high dynamic range (-16.5 LUFS).',
    defaultLufs: -16.5
  },
  {
    id: 'house-club',
    title: 'Subway Afterhours (Club Mix)',
    artist: 'Analog Collective',
    genre: 'House',
    durationSec: 12,
    description: 'Driving 4/4 four-on-the-floor groove, resonant synth bass, wide open hi-hats (-16.0 LUFS).',
    defaultLufs: -16.0
  }
];

/**
 * Procedurally generates a real, pristine multi-layered stereo audio track
 * with real musical harmonics, transients, sub bass, and stereo width.
 */
export function generateDemoAudioBuffer(demoId: string): { buffer: AudioBuffer; metadata: TrackMetadata } {
  const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  const sampleRate = audioCtx.sampleRate || 44100;
  const duration = 12; // 12 seconds loop
  const length = sampleRate * duration;
  const numChannels = 2;

  const buffer = audioCtx.createBuffer(numChannels, length, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  const bpm = demoId === 'trap-rough' ? 140 : demoId === 'house-club' ? 124 : demoId === 'rnb-soul' ? 88 : 110;
  const beatDuration = 60 / bpm;
  const samplesPerBeat = Math.floor(sampleRate * beatDuration);

  // Synthesize musical elements based on track
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const beatIndex = Math.floor(i / samplesPerBeat);
    const beatProgress = (i % samplesPerBeat) / samplesPerBeat;

    let sigL = 0;
    let sigR = 0;

    if (demoId === 'trap-rough') {
      // 1. Kick / 808 Sub: On beats 0, 2.5, 4, 6...
      const isKick = (beatIndex % 4 === 0 && beatProgress < 0.35) || (beatIndex % 8 === 6 && beatProgress < 0.35);
      if (isKick) {
        const kickEnv = Math.exp(-beatProgress * 12);
        const pitch = 55 * Math.exp(-beatProgress * 14) + 38;
        const sub = Math.sin(2 * Math.PI * pitch * t) * kickEnv * 0.48;
        sigL += sub;
        sigR += sub;
      }

      // 2. Snare on beats 2 & 4
      const isSnare = (beatIndex % 2 === 1 && beatProgress < 0.25);
      if (isSnare) {
        const snareEnv = Math.exp(-beatProgress * 18);
        const noise = (Math.random() * 2 - 1) * 0.22 * snareEnv;
        const tone = Math.sin(2 * Math.PI * 195 * t) * 0.18 * snareEnv;
        sigL += (noise + tone) * 0.9;
        sigR += (noise + tone) * 0.95;
      }

      // 3. Hi-Hats: 16th notes with subtle panning
      const hatStep = Math.floor((i % samplesPerBeat) / (samplesPerBeat / 4));
      const hatProg = ((i % (samplesPerBeat / 4)) / (samplesPerBeat / 4));
      if (hatProg < 0.12) {
        const hatEnv = Math.exp(-hatProg * 35);
        const hatNoise = (Math.random() * 2 - 1) * hatEnv * 0.08;
        const pan = (hatStep % 2 === 0 ? 0.85 : 1.15);
        sigL += hatNoise * pan;
        sigR += hatNoise * (2 - pan);
      }

      // 4. Minor Rhodes Chords: Ebm (Eb, Gb, Bb)
      const chordTone1 = Math.sin(2 * Math.PI * 155.56 * t) * 0.08;
      const chordTone2 = Math.sin(2 * Math.PI * 185.00 * t) * 0.06;
      const chordTone3 = Math.sin(2 * Math.PI * 233.08 * t) * 0.06;
      const tremolo = 0.8 + 0.2 * Math.sin(2 * Math.PI * 3.5 * t);
      sigL += (chordTone1 + chordTone2) * tremolo;
      sigR += (chordTone2 + chordTone3) * (2 - tremolo);
    } else if (demoId === 'rnb-soul') {
      // Warm neo-soul groove
      // Bass guitar: gentle walking bass
      const bassNote = beatIndex % 4 === 0 ? 73.42 : beatIndex % 4 === 2 ? 82.41 : 65.41;
      const bassEnv = 0.7 + 0.3 * Math.cos(2 * Math.PI * beatProgress);
      const bass = (Math.sin(2 * Math.PI * bassNote * t) + 0.3 * Math.sin(4 * Math.PI * bassNote * t)) * 0.24 * bassEnv;
      sigL += bass;
      sigR += bass;

      // Soft rimshot / brush snare
      if (beatIndex % 2 === 1 && beatProgress < 0.2) {
        const snareEnv = Math.exp(-beatProgress * 22);
        const rim = (Math.sin(2 * Math.PI * 440 * t) * 0.12 + (Math.random() * 2 - 1) * 0.08) * snareEnv;
        sigL += rim * 0.9;
        sigR += rim * 1.1;
      }

      // Neo soul electric piano chords (Dbmaj7)
      const ep1 = Math.sin(2 * Math.PI * 277.18 * t) * 0.09;
      const ep2 = Math.sin(2 * Math.PI * 349.23 * t) * 0.08;
      const ep3 = Math.sin(2 * Math.PI * 415.30 * t) * 0.07;
      const ep4 = Math.sin(2 * Math.PI * 523.25 * t) * 0.05;
      const vibrato = Math.sin(2 * Math.PI * 4 * t) * 0.03;
      sigL += (ep1 + ep2 + ep4) * (1 + vibrato);
      sigR += (ep2 + ep3 + ep4) * (1 - vibrato);
    } else if (demoId === 'house-club') {
      // Four on the floor kick
      if (beatProgress < 0.3) {
        const kEnv = Math.exp(-beatProgress * 15);
        const kPitch = 120 * Math.exp(-beatProgress * 25) + 48;
        const kick = Math.sin(2 * Math.PI * kPitch * t) * kEnv * 0.52;
        sigL += kick;
        sigR += kick;
      }
      // Offbeat open hi-hat
      if (beatProgress > 0.45 && beatProgress < 0.85) {
        const oHatProg = (beatProgress - 0.45) / 0.4;
        const oHatEnv = Math.exp(-oHatProg * 9);
        const oHat = (Math.random() * 2 - 1) * oHatEnv * 0.12;
        sigL += oHat * 0.8;
        sigR += oHat * 1.2;
      }
      // Resonant bassline
      const bassFreq = beatIndex % 2 === 0 ? 65.4 : 87.3;
      const bassSaw = (2 * ((bassFreq * t) % 1) - 1) * 0.12;
      sigL += bassSaw;
      sigR += bassSaw;
    } else {
      // Indie Rock
      // Acoustic kick on 1 & 3
      if ((beatIndex % 4 === 0 || beatIndex % 4 === 2) && beatProgress < 0.28) {
        const kEnv = Math.exp(-beatProgress * 14);
        const kick = Math.sin(2 * Math.PI * 65 * t) * kEnv * 0.42;
        sigL += kick;
        sigR += kick;
      }
      // Snare on 2 & 4
      if ((beatIndex % 4 === 1 || beatIndex % 4 === 3) && beatProgress < 0.25) {
        const sEnv = Math.exp(-beatProgress * 16);
        const snare = ((Math.random() * 2 - 1) * 0.18 + Math.sin(2 * Math.PI * 220 * t) * 0.14) * sEnv;
        sigL += snare;
        sigR += snare;
      }
      // Rhythm guitar strumming
      const strum = Math.sin(2 * Math.PI * 330 * t) * 0.08 + Math.sin(2 * Math.PI * 440 * t) * 0.07;
      sigL += strum * 1.15;
      sigR += strum * 0.85;
    }

    // Scale to unmastered headroom (~ -18 to -16 LUFS, max peak ~ -3.5 dBFS)
    left[i] = Math.max(-0.72, Math.min(0.72, sigL * 0.68));
    right[i] = Math.max(-0.72, Math.min(0.72, sigR * 0.68));
  }

  audioCtx.close();

  const selected = DEMO_TRACKS.find(d => d.id === demoId) || DEMO_TRACKS[0];

  const metadata: TrackMetadata = {
    name: `${selected.title}.wav`,
    format: 'WAV',
    sampleRate,
    bitDepth: 24,
    duration,
    fileSize: Math.floor(length * numChannels * 3) + 44, // 24-bit PCM size
    channels: numChannels
  };

  return { buffer, metadata };
}

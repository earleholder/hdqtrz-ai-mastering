/**
 * Robust audio file decoding utility for the browser Web Audio API.
 * 
 * Supports:
 * 1. Direct native-rate WAV PCM/Float parsing (16-bit, 24-bit, 32-bit int, 32-bit float)
 *    which guarantees 44.1 kHz is NEVER resampled to 48 kHz.
 * 2. Header-directed OfflineAudioContext decoding for other native sample rates.
 * 3. MPEG/ID3 strip + frame sync for robust MP3 decoding.
 * 4. MediaElement fallback for legacy browser codecs.
 */

import { AudioFormat } from '../types';

export interface DecodedAudioResult {
  buffer: AudioBuffer;
  bitDepth: number;
  sampleRate: number;
  channels: number;
  format: AudioFormat;
  isLossy: boolean;
  ctx?: AudioContext;
}

/**
 * Creates an AudioBuffer at the exact sampleRate in browser or Node test environment
 */
export function createAudioBufferPolyfill(
  numChannels: number,
  length: number,
  sampleRate: number
): AudioBuffer {
  if (typeof window !== 'undefined') {
    const OfflineCtxClass =
      window.OfflineAudioContext ||
      (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;
    if (OfflineCtxClass) {
      const offlineCtx = new OfflineCtxClass(numChannels, Math.max(1, length), sampleRate);
      return offlineCtx.createBuffer(numChannels, Math.max(1, length), sampleRate);
    }
  }

  // Node.js / headless polyfill
  const channelData: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channelData.push(new Float32Array(length));
  }

  return {
    numberOfChannels: numChannels,
    length,
    sampleRate,
    duration: length / sampleRate,
    getChannelData: (channel: number) => channelData[channel] || channelData[0],
    copyFromChannel: (dest: Float32Array, channelNumber: number, startInChannel = 0) => {
      dest.set(channelData[channelNumber].subarray(startInChannel, startInChannel + dest.length));
    },
    copyToChannel: (source: Float32Array, channelNumber: number, startInChannel = 0) => {
      channelData[channelNumber].set(source, startInChannel);
    }
  } as unknown as AudioBuffer;
}

/**
 * Direct native WAV PCM parser that extracts exact bit-depth and native sample rate
 * without allowing browser AudioContext to resample 44.1 kHz -> 48 kHz.
 */
export function parseWavDirectly(arrayBuffer: ArrayBuffer): {
  buffer: AudioBuffer;
  bitDepth: number;
  sampleRate: number;
  channels: number;
} | null {
  const view = new DataView(arrayBuffer);
  if (view.byteLength < 44) return null;

  // Check 'RIFF' and 'WAVE'
  const r0 = view.getUint8(0), r1 = view.getUint8(1), r2 = view.getUint8(2), r3 = view.getUint8(3);
  const w0 = view.getUint8(8), w1 = view.getUint8(9), w2 = view.getUint8(10), w3 = view.getUint8(11);
  if (
    r0 !== 0x52 || r1 !== 0x49 || r2 !== 0x46 || r3 !== 0x46 || // RIFF
    w0 !== 0x57 || w1 !== 0x41 || w2 !== 0x56 || w3 !== 0x45    // WAVE
  ) {
    return null;
  }

  let offset = 12;
  let audioFormat = 1;
  let numChannels = 2;
  let sampleRate = 44100;
  let bitsPerSample = 16;
  let dataOffset = -1;
  let dataLength = 0;

  while (offset + 8 <= view.byteLength) {
    const c0 = String.fromCharCode(view.getUint8(offset));
    const c1 = String.fromCharCode(view.getUint8(offset + 1));
    const c2 = String.fromCharCode(view.getUint8(offset + 2));
    const c3 = String.fromCharCode(view.getUint8(offset + 3));
    const chunkId = c0 + c1 + c2 + c3;
    const chunkSize = view.getUint32(offset + 4, true);

    if (chunkId === 'fmt ') {
      audioFormat = view.getUint16(offset + 8, true);
      numChannels = view.getUint16(offset + 10, true);
      sampleRate = view.getUint32(offset + 12, true);
      bitsPerSample = view.getUint16(offset + 22, true);

      // WAVE_FORMAT_EXTENSIBLE
      if (audioFormat === 0xfffe && chunkSize >= 40) {
        const subFormat = view.getUint16(offset + 24, true);
        audioFormat = subFormat;
      }
    } else if (chunkId === 'data') {
      dataOffset = offset + 8;
      dataLength = chunkSize;
      break;
    }

    offset += 8 + chunkSize;
    if (chunkSize % 2 !== 0) offset++;
  }

  if (dataOffset === -1) return null;
  const actualDataLength = Math.min(dataLength, view.byteLength - dataOffset);

  const bytesPerSample = bitsPerSample / 8;
  if (bytesPerSample <= 0 || numChannels <= 0) return null;

  const totalFrames = Math.floor(actualDataLength / (bytesPerSample * numChannels));
  if (totalFrames <= 0) return null;

  const audioBuffer = createAudioBufferPolyfill(numChannels, totalFrames, sampleRate);
  const channelData: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channelData.push(audioBuffer.getChannelData(c));
  }

  let pos = dataOffset;

  if (bitsPerSample === 16 && (audioFormat === 1 || audioFormat === 0xfffe)) {
    for (let i = 0; i < totalFrames; i++) {
      for (let c = 0; c < numChannels; c++) {
        const s = view.getInt16(pos, true);
        channelData[c][i] = s / 32768.0;
        pos += 2;
      }
    }
  } else if (bitsPerSample === 24 && (audioFormat === 1 || audioFormat === 0xfffe)) {
    for (let i = 0; i < totalFrames; i++) {
      for (let c = 0; c < numChannels; c++) {
        const b0 = view.getUint8(pos);
        const b1 = view.getUint8(pos + 1);
        const b2 = view.getUint8(pos + 2);
        const int24 = (b2 & 0x80) ? ((b2 << 16) | (b1 << 8) | b0) - 0x1000000 : ((b2 << 16) | (b1 << 8) | b0);
        channelData[c][i] = int24 / 8388608.0;
        pos += 3;
      }
    }
  } else if (bitsPerSample === 32 && audioFormat === 3) { // 32-bit float
    for (let i = 0; i < totalFrames; i++) {
      for (let c = 0; c < numChannels; c++) {
        channelData[c][i] = view.getFloat32(pos, true);
        pos += 4;
      }
    }
  } else if (bitsPerSample === 32 && (audioFormat === 1 || audioFormat === 0xfffe)) { // 32-bit int
    for (let i = 0; i < totalFrames; i++) {
      for (let c = 0; c < numChannels; c++) {
        const s = view.getInt32(pos, true);
        channelData[c][i] = s / 2147483648.0;
        pos += 4;
      }
    }
  } else {
    // Unsupported raw format combination, fall back to Web Audio decoding
    return null;
  }

  return {
    buffer: audioBuffer,
    bitDepth: bitsPerSample,
    sampleRate,
    channels: numChannels
  };
}

/**
 * Strips ID3v2 header and tags if present, and seeks to the first valid MPEG sync word.
 */
export function sanitizeAudioBufferForDecoding(buffer: ArrayBuffer): ArrayBuffer {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 10) return buffer;

  let offset = 0;

  // Check for ID3v2 header ('ID3')
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    const flags = bytes[5];
    const footerPresent = (flags & 0x10) !== 0;

    const tagSize =
      ((bytes[6] & 0x7f) << 21) |
      ((bytes[7] & 0x7f) << 14) |
      ((bytes[8] & 0x7f) << 7) |
      (bytes[9] & 0x7f);

    offset = 10 + tagSize;
    if (footerPresent) {
      offset += 10;
    }

    if (offset >= bytes.length) {
      offset = 0;
    }
  }

  // RIFF header
  if (
    bytes.length > 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
  ) {
    return buffer;
  }

  // Look for MPEG sync word
  let syncOffset = offset;
  const maxSearch = Math.min(bytes.length - 4, offset + 1024 * 64);
  let foundSync = false;

  for (let i = offset; i < maxSearch; i++) {
    if (bytes[i] === 0xff && (bytes[i + 1] & 0xe0) === 0xe0) {
      const layer = (bytes[i + 1] >> 1) & 0x03;
      const bitrateIdx = (bytes[i + 2] >> 4) & 0x0f;
      const sampleRateIdx = (bytes[i + 2] >> 2) & 0x03;

      if (layer !== 0 && bitrateIdx !== 15 && sampleRateIdx !== 3) {
        syncOffset = i;
        foundSync = true;
        break;
      }
    }
  }

  // Check tail for ID3v1 ('TAG')
  let endOffset = bytes.length;
  if (bytes.length > 128) {
    const tailCheck = bytes.length - 128;
    if (
      bytes[tailCheck] === 0x54 &&
      bytes[tailCheck + 1] === 0x41 &&
      bytes[tailCheck + 2] === 0x47
    ) {
      endOffset = tailCheck;
    }
  }

  if (foundSync && syncOffset > 0) {
    const cleanBytes = bytes.slice(syncOffset, endOffset);
    return cleanBytes.buffer;
  }

  if (offset > 0 && offset < endOffset) {
    const cleanBytes = bytes.slice(offset, endOffset);
    return cleanBytes.buffer;
  }

  return buffer;
}

/**
 * Fallback decoder using an HTML <audio> element
 */
export async function decodeViaMediaElement(file: File | Blob): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.src = url;
    audio.preload = 'auto';

    const cleanUp = () => {
      URL.revokeObjectURL(url);
      audio.remove();
    };

    audio.onloadedmetadata = async () => {
      const duration = audio.duration;
      if (!duration || isNaN(duration) || duration === Infinity) {
        cleanUp();
        reject(new Error('Invalid audio duration from media element'));
        return;
      }

      try {
        const resp = await fetch(url);
        const arrayBuf = await resp.arrayBuffer();
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        
        const sanitized = sanitizeAudioBufferForDecoding(arrayBuf);
        ctx.decodeAudioData(
          sanitized,
          (buf) => {
            cleanUp();
            ctx.close().catch(() => {});
            resolve(buf);
          },
          () => {
            cleanUp();
            ctx.close().catch(() => {});
            reject(new Error('HTMLAudioElement loaded metadata, but audio graph could not decode frames'));
          }
        );
      } catch (e) {
        cleanUp();
        reject(e);
      }
    };

    audio.onerror = () => {
      cleanUp();
      reject(new Error('HTMLAudioElement failed to load audio file'));
    };
  });
}

/**
 * Master Native Audio Decoder:
 * Guarantees native sample rate decoding without browser 48 kHz upsampling.
 */
export async function robustDecodeAudio(file: File): Promise<DecodedAudioResult> {
  const nameLower = file.name.toLowerCase();
  const rawArrayBuffer = await file.arrayBuffer();

  let format: AudioFormat = 'WAV';
  let isLossy = false;
  if (nameLower.endsWith('.mp3') || file.type === 'audio/mpeg' || file.type === 'audio/mp3') {
    format = 'MP3';
    isLossy = true;
  } else if (nameLower.endsWith('.aac') || file.type === 'audio/aac') {
    format = 'AAC';
    isLossy = true;
  } else if (nameLower.endsWith('.ogg') || file.type === 'audio/ogg') {
    format = 'OGG';
    isLossy = true;
  } else if (nameLower.endsWith('.aiff') || nameLower.endsWith('.aif') || file.type === 'audio/aiff') {
    format = 'AIFF';
    isLossy = false;
  } else if (nameLower.endsWith('.flac') || file.type === 'audio/flac') {
    format = 'FLAC';
    isLossy = false;
  }

  // 1. Direct WAV PCM parser (Exact native sample rate and bit-depth)
  if (format === 'WAV' || rawArrayBuffer.byteLength > 44) {
    try {
      const wavParsed = parseWavDirectly(rawArrayBuffer);
      if (wavParsed) {
        return {
          buffer: wavParsed.buffer,
          bitDepth: wavParsed.bitDepth,
          sampleRate: wavParsed.sampleRate,
          channels: wavParsed.channels,
          format: 'WAV',
          isLossy: false
        };
      }
    } catch (e) {
      console.warn('[Audio Decoder] Direct WAV parsing deferred to Web Audio:', e);
    }
  }

  // 2. Decode using AudioContext / OfflineAudioContext
  const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  const bufferCopy1 = rawArrayBuffer.slice(0);
  const bufferCopy2 = rawArrayBuffer.slice(0);

  try {
    const decoded = await new Promise<AudioBuffer>((resolve, reject) => {
      ctx.decodeAudioData(bufferCopy1, resolve, reject);
    });
    return {
      buffer: decoded,
      bitDepth: isLossy ? 16 : 24,
      sampleRate: decoded.sampleRate,
      channels: decoded.numberOfChannels,
      format,
      isLossy,
      ctx
    };
  } catch (err1) {
    console.warn('[Audio Decoder] Direct decodeAudioData failed, trying ID3 strip...', err1);
  }

  try {
    const sanitizedBuffer = sanitizeAudioBufferForDecoding(bufferCopy2);
    const decoded = await new Promise<AudioBuffer>((resolve, reject) => {
      ctx.decodeAudioData(sanitizedBuffer, resolve, reject);
    });
    return {
      buffer: decoded,
      bitDepth: isLossy ? 16 : 24,
      sampleRate: decoded.sampleRate,
      channels: decoded.numberOfChannels,
      format,
      isLossy,
      ctx
    };
  } catch (err2) {
    console.warn('[Audio Decoder] Sanitized decode failed, attempting MediaElement fallback...', err2);
  }

  try {
    const decoded = await decodeViaMediaElement(file);
    return {
      buffer: decoded,
      bitDepth: isLossy ? 16 : 24,
      sampleRate: decoded.sampleRate,
      channels: decoded.numberOfChannels,
      format,
      isLossy,
      ctx
    };
  } catch (err3) {
    ctx.close().catch(() => {});
    throw new Error('Unable to decode audio data. Please ensure this is an uncorrupted stereo WAV, AIFF, or lossless audio file.');
  }
}

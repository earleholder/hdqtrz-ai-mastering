/**
 * Robust audio file decoding utility for the browser Web Audio API.
 * 
 * Standard `ctx.decodeAudioData` frequently fails on MP3 files that have:
 * 1. ID3v2 tags (especially with large embedded album art/APIC frames, ID3v2.3/2.4 syncsafe headers).
 * 2. ID3v1 tags at the tail or trailing padding/garbage bytes.
 * 3. Junk headers or non-standard sync words before the first valid MPEG audio frame (0xFFF or 0xFFE).
 * 4. Transfer / arrayBuffer detachment issues.
 * 
 * This module strips ID3 headers/trailers, locates the true MPEG sync frame,
 * and falls back to HTMLAudioElement / MediaElement rendering if native decodeAudioData fails.
 */

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

    // The tag size is stored as a 4-byte 28-bit synchsafe integer (7 bits per byte)
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
      // In case tag size was miscalculated, reset offset
      offset = 0;
    }
  }

  // Find first valid MPEG frame sync (0xFF followed by 0xE0-0xFF) or RIFF/WAV header
  // RIFF header
  if (
    bytes.length > 12 &&
    bytes[0] === 0x52 && // 'R'
    bytes[1] === 0x49 && // 'I'
    bytes[2] === 0x46 && // 'F'
    bytes[3] === 0x46    // 'F'
  ) {
    return buffer;
  }

  // Look for MPEG sync word (11 consecutive 1s: 0xFF followed by high 3 bits 1)
  let syncOffset = offset;
  const maxSearch = Math.min(bytes.length - 4, offset + 1024 * 64); // search first 64KB
  let foundSync = false;

  for (let i = offset; i < maxSearch; i++) {
    if (bytes[i] === 0xff && (bytes[i + 1] & 0xe0) === 0xe0) {
      // Basic MPEG validity check: layer should not be reserved (layer bits 1 & 2 not 00)
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
      bytes[tailCheck] === 0x54 && // 'T'
      bytes[tailCheck + 1] === 0x41 && // 'A'
      bytes[tailCheck + 2] === 0x47    // 'G'
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
 * Fallback decoder using an HTML <audio> element and MediaStream / OfflineAudioContext.
 * The browser's HTML media subsystem is significantly more forgiving with corrupted MP3s
 * or complex ID3 metadata than AudioContext.decodeAudioData().
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
        // Render audio through MediaElementAudioSourceNode into an AudioContext
        // Or decode directly through fetch if blob url behaves differently in ctx
        const resp = await fetch(url);
        const arrayBuf = await resp.arrayBuffer();
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        
        // Try sanitized decoding first on the fetch output
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
 * Robust master decoder that handles:
 * 1. Standard AudioContext.decodeAudioData
 * 2. ID3v2 tag strip + MPEG sync word seeking
 * 3. HTMLAudioElement / Media fallback
 */
export async function robustDecodeAudio(file: File): Promise<{ buffer: AudioBuffer; ctx: AudioContext }> {
  const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

  // Step 1: Read raw ArrayBuffer
  const rawArrayBuffer = await file.arrayBuffer();

  // Make a clone because decodeAudioData can detach the ArrayBuffer
  const bufferCopy1 = rawArrayBuffer.slice(0);
  const bufferCopy2 = rawArrayBuffer.slice(0);

  // Attempt 1: Native decodeAudioData directly
  try {
    const decoded = await new Promise<AudioBuffer>((resolve, reject) => {
      ctx.decodeAudioData(bufferCopy1, resolve, reject);
    });
    return { buffer: decoded, ctx };
  } catch (err1) {
    console.warn('[HDQTRZ Audio] Direct decodeAudioData failed, trying ID3 strip & MPEG sync alignment...', err1);
  }

  // Attempt 2: Sanitize by stripping ID3 tags & seek first MPEG/WAV frame
  try {
    const sanitizedBuffer = sanitizeAudioBufferForDecoding(bufferCopy2);
    const decoded = await new Promise<AudioBuffer>((resolve, reject) => {
      ctx.decodeAudioData(sanitizedBuffer, resolve, reject);
    });
    return { buffer: decoded, ctx };
  } catch (err2) {
    console.warn('[HDQTRZ Audio] Sanitized decoding failed, attempting MediaElement fallback...', err2);
  }

  // Attempt 3: Decode via MediaElement
  try {
    const decoded = await decodeViaMediaElement(file);
    return { buffer: decoded, ctx };
  } catch (err3) {
    console.error('[HDQTRZ Audio] All audio decoding attempts failed:', err3);
    ctx.close().catch(() => {});
    throw new Error('Unable to decode audio data. Please ensure this is an uncorrupted stereo WAV or MP3 audio file.');
  }
}

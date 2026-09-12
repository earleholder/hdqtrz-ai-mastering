import { Mp3Encoder } from '@breezystack/lamejs';

const MP3_BITRATE_KBPS = 320;
const BLOCK_SIZE = 1152;

function floatToPcm16(channel: Float32Array): Int16Array {
  const pcm = new Int16Array(channel.length);
  for (let i = 0; i < channel.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, channel[i]));
    pcm[i] = sample < 0 ? Math.round(sample * 32768) : Math.round(sample * 32767);
  }
  return pcm;
}

export function audioBufferToMp3Blob(buffer: AudioBuffer): Blob {
  const channels = Math.min(2, buffer.numberOfChannels);
  const left = floatToPcm16(buffer.getChannelData(0));
  const right = channels === 2 ? floatToPcm16(buffer.getChannelData(1)) : left;
  const encoder = new Mp3Encoder(channels, buffer.sampleRate, MP3_BITRATE_KBPS);
  const chunks: Int8Array[] = [];

  for (let offset = 0; offset < left.length; offset += BLOCK_SIZE) {
    const encoded = channels === 2
      ? encoder.encodeBuffer(left.subarray(offset, offset + BLOCK_SIZE), right.subarray(offset, offset + BLOCK_SIZE))
      : encoder.encodeBuffer(left.subarray(offset, offset + BLOCK_SIZE));
    if (encoded.length) chunks.push(new Int8Array(encoded));
  }
  const tail = encoder.flush();
  if (tail.length) chunks.push(new Int8Array(tail));
  return new Blob(chunks, { type: 'audio/mpeg' });
}

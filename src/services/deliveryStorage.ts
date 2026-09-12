import { getBlob, ref, uploadBytes } from 'firebase/storage';
import { audioBufferToWavBlob } from '../audio/dspEngine';
import { audioBufferToMp3Blob } from '../audio/mp3Encoder';
import { firebaseStorage } from './firebaseClient';

export interface StoredDelivery {
  orderId: string;
  title: string;
  trackId: string;
  wavPath: string;
  mp3Path: string;
  createdAt?: string | null;
}

function safeBaseName(title: string): string {
  return title.replace(/\.[^/.]+$/, '').replace(/[^a-z0-9 _-]/gi, '').trim().slice(0, 80) || 'HDQTRZ_Master';
}

export async function uploadPaidDelivery(uid: string, orderId: string, title: string, buffer: AudioBuffer) {
  const baseName = safeBaseName(title);
  const directory = `masters/${uid}/${orderId}`;
  const wavPath = `${directory}/${baseName}_HDQTRZ_Master_24bit.wav`;
  const mp3Path = `${directory}/${baseName}_HDQTRZ_Master_320kbps.mp3`;
  const [wavBlob, mp3Blob] = [audioBufferToWavBlob(buffer, 24), audioBufferToMp3Blob(buffer)];

  await Promise.all([
    uploadBytes(ref(firebaseStorage, wavPath), wavBlob, { contentType: 'audio/wav' }),
    uploadBytes(ref(firebaseStorage, mp3Path), mp3Blob, { contentType: 'audio/mpeg' }),
  ]);
  return { wavPath, mp3Path };
}

export async function downloadStoredFile(path: string, filename: string) {
  const blob = await getBlob(ref(firebaseStorage, path));
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

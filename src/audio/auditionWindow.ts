/**
 * Utility to detect the most dynamic / energetic section of an audio track
 * (e.g. chorus, drop, or hook) for a focused 30-45s free audition preview window.
 */
export function findAuditionWindow(
  buffer: AudioBuffer,
  requestedDurationSec = 35
): { startSec: number; endSec: number; durationSec: number } {
  const totalDuration = buffer.duration;

  // If track is short (under 40s), audition the entire track
  if (totalDuration <= requestedDurationSec + 5) {
    return {
      startSec: 0,
      endSec: totalDuration,
      durationSec: totalDuration
    };
  }

  const sampleRate = buffer.sampleRate;
  const channelData = buffer.getChannelData(0);
  const windowSamples = Math.floor(requestedDurationSec * sampleRate);

  // Search window steps: calculate RMS energy across 3-second blocks
  const stepSec = 2;
  const stepSamples = Math.floor(stepSec * sampleRate);

  // Skip the first 10% of the track (usually quiet intro) and last 10% (fade out)
  const minStartSec = Math.max(5, totalDuration * 0.12);
  const maxStartSec = Math.max(minStartSec, totalDuration - requestedDurationSec - Math.max(5, totalDuration * 0.1));

  const minStartSample = Math.floor(minStartSec * sampleRate);
  const maxStartSample = Math.floor(maxStartSec * sampleRate);

  let bestStartSample = minStartSample;
  let maxEnergy = -1;

  for (let s = minStartSample; s <= maxStartSample; s += stepSamples) {
    // Sample energy across this candidate window (sample every 128th value for fast calculation)
    let sumSq = 0;
    let count = 0;
    const end = Math.min(channelData.length, s + windowSamples);

    for (let i = s; i < end; i += 128) {
      const val = channelData[i];
      sumSq += val * val;
      count++;
    }

    const rms = count > 0 ? sumSq / count : 0;
    if (rms > maxEnergy) {
      maxEnergy = rms;
      bestStartSample = s;
    }
  }

  const startSec = Math.round(bestStartSample / sampleRate);
  const endSec = Math.min(totalDuration, startSec + requestedDurationSec);

  return {
    startSec,
    endSec,
    durationSec: Number((endSec - startSec).toFixed(1))
  };
}

import type { AudioSettings } from '@/types';

function bitrateToBits(bitrate: string): number {
  const match = /(\d+)\s*k?b?/.exec(bitrate || '');
  const kbps = match ? parseInt(match[1], 10) : 192;
  return kbps * 1000;
}

export function estimateClipSize(
  format: AudioSettings['format'],
  durationSec: number,
  settings: Pick<AudioSettings, 'bitrate' | 'sampleRate' | 'channels'>
): number {
  if (durationSec <= 0 || !isFinite(durationSec)) return 0;

  const sampleRateOf = (value: AudioSettings['sampleRate']): number => {
    const n = parseInt(String(value), 10);
    return isFinite(n) && n > 0 ? n : 44100;
  };

  switch (format) {
    case 'wav': {
      const sr = sampleRateOf(settings.sampleRate);
      const ch = settings.channels === 'mono' ? 1 : 2;
      return sr * ch * 2 * durationSec / 1024 / 1024;
    }
    case 'flac':
      return (44100 * 2 * 2 * durationSec * 0.65) / 1024 / 1024;
    default: {
      const bytesPerSec = bitrateToBits(settings.bitrate) / 8;
      return (bytesPerSec * durationSec) / 1024 / 1024;
    }
  }
}

export function bitrateLabel(bitrate: string): string {
  const match = /(\d+)\s*k?b?/.exec(bitrate || '');
  return match ? `${match[1]} kbps` : bitrate;
}
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import type { AudioSettings } from '@/types';

let ffmpegP: Promise<FFmpeg> | null = null;
let progressCb: ((ratio: number) => void) | null = null;

export function loadFFmpeg(): Promise<FFmpeg> {
  if (!ffmpegP) {
    ffmpegP = (async () => {
      const ffmpeg = new FFmpeg();
      ffmpeg.on('progress', ({ progress }) => progressCb?.(progress));
      const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
      await ffmpeg.load({
        coreURL: `${origin}/ffmpeg/ffmpeg-core.js`,
        wasmURL: `${origin}/ffmpeg/ffmpeg-core.wasm`,
        classWorkerURL: `${origin}/ffmpeg/worker.js`,
      });
      return ffmpeg;
    })();
  }
  return ffmpegP;
}

export async function probeVideoSource(src: string): Promise<{ duration: number; hasAudio: boolean }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      const av = video as HTMLVideoElement & { webkitAudioDecodedByteCount?: number; mozHasAudio?: boolean };
      const hasAudio =
        typeof av.webkitAudioDecodedByteCount === 'number'
          ? av.webkitAudioDecodedByteCount > 0
          : !!av.mozHasAudio;
      const duration = isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
      video.removeAttribute('src');
      video.load();
      resolve({ duration, hasAudio });
    };
    video.onerror = () => {
      if (settled) return;
      settled = true;
      reject(new Error('Could not read this video’s metadata. Is it a valid, supported video file?'));
    };
    video.onloadedmetadata = () => {
      try {
        video.currentTime = Math.min(0.1, isFinite(video.duration) ? video.duration : 0.1);
      } catch {
        /* ignore */
      }
      setTimeout(finish, 500);
    };
    video.src = src;
    video.load();
  });
}

export { probeVideoSource as probeVideo };

function formatTs(seconds: number): string {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s - h * 3600 - m * 60;
  return `${h}:${String(m).padStart(2, '0')}:${sec.toFixed(3)}`;
}

function extFor(input: Blob): string {
  if (input.type.includes('webm')) return 'webm';
  if (input.type.includes('ogg')) return 'ogv';
  if (input.type.includes('quicktime')) return 'mov';
  if (input.type.includes('matroska')) return 'mkv';
  return 'mp4';
}

function mimeFor(format: string): string {
  const map: Record<string, string> = {
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    m4a: 'audio/mp4',
    ogg: 'audio/ogg',
    flac: 'audio/flac',
  };
  return map[format] || 'application/octet-stream';
}

export interface ConvertOptions {
  startTime: number;
  endTime: number;
  settings: AudioSettings;
  onProgress?: (ratio: number) => void;
}

export async function convertAudio(input: Blob, opts: ConvertOptions): Promise<{ blob: Blob; size: number }> {
  const ffmpeg = await loadFFmpeg();
  progressCb = opts.onProgress || null;

  const inName = `input.${extFor(input)}`;
  const outName = `output.${opts.settings.format}`;
  const duration = Math.max(0, opts.endTime - opts.startTime);

  try {
    await ffmpeg.writeFile(inName, await fetchFile(input));

    const args: string[] = ['-y'];
    if (opts.startTime > 0) args.push('-ss', formatTs(opts.startTime));
    args.push('-i', inName);
    args.push('-t', formatTs(duration));
    args.push('-vn');

    const af: string[] = [];
    if (opts.settings.normalize) af.push('loudnorm=I=-16:TP=-1.5:LRA=11');
    if (opts.settings.fadeIn > 0) af.push(`afade=t=in:d=${opts.settings.fadeIn}`);
    if (opts.settings.fadeOut > 0) {
      const st = Math.max(0, duration - opts.settings.fadeOut);
      af.push(`afade=t=out:st=${st}:d=${opts.settings.fadeOut}`);
    }
    if (opts.settings.volume !== 0) af.push(`volume=${100 + opts.settings.volume}%`);
    if (af.length > 0) args.push('-af', af.join(','));

    if (opts.settings.sampleRate !== 'original') args.push('-ar', opts.settings.sampleRate);
    if (opts.settings.channels === 'mono') args.push('-ac', '1');
    if (opts.settings.channels === 'stereo') args.push('-ac', '2');

    switch (opts.settings.format) {
      case 'mp3':
        args.push('-c:a', 'libmp3lame');
        if (opts.settings.bitrate) args.push('-b:a', opts.settings.bitrate);
        break;
      case 'wav':
        args.push('-c:a', 'pcm_s16le');
        break;
      case 'm4a':
        args.push('-c:a', 'aac');
        if (opts.settings.bitrate) args.push('-b:a', opts.settings.bitrate);
        args.push('-f', 'ipod');
        break;
      case 'ogg':
        args.push('-c:a', 'libvorbis');
        if (opts.settings.bitrate) args.push('-b:a', opts.settings.bitrate);
        break;
      case 'flac':
        args.push('-c:a', 'flac');
        break;
    }

    args.push(outName);
    await ffmpeg.exec(args);

    const data = (await ffmpeg.readFile(outName)) as Uint8Array;
    const buf = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
    const blob = new Blob([buf], { type: mimeFor(opts.settings.format) });
    await ffmpeg.deleteFile(inName).catch(() => {});
    await ffmpeg.deleteFile(outName).catch(() => {});
    return { blob, size: data.length };
  } finally {
    progressCb = null;
  }
}
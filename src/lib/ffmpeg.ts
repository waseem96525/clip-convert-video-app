import { CONFIG } from './config';
import { execFile } from 'child_process';
const ffmpeg = require('fluent-ffmpeg');

function ffprobeJson(filepath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    execFile('ffprobe', ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', filepath], (err, stdout) => {
      if (err) return reject(err);
      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        reject(e);
      }
    });
  });
}

export function getVideoMetadata(filepath: string): Promise<any> {
  return ffprobeJson(filepath).then((metadata: any) => {
    const videoStream = metadata.streams?.find((s: any) => s.codec_type === 'video');
    const audioStream = metadata.streams?.find((s: any) => s.codec_type === 'audio');
    return {
      duration: Number(videoStream?.duration || audioStream?.duration || metadata.format?.duration || 0),
      format: metadata.format?.format_name || 'unknown',
      size: metadata.format?.size || 0,
      videoCodec: videoStream?.codec_name || 'unknown',
      audioCodec: audioStream?.codec_name || 'none',
      audioSampleRate: audioStream?.sample_rate || '44100',
      audioChannels: audioStream?.channels || 2,
      width: videoStream?.width || 0,
      height: videoStream?.height || 0,
    };
  });
}

export function probeVideo(filepath: string): Promise<any> {
  return getVideoMetadata(filepath);
}

export function extractAudio(
  inputPath: string,
  outputPath: string,
  startTime: number,
  endTime: number,
  settings: {
    format: string;
    bitrate: string;
    sampleRate: string;
    channels: string;
    volume: number;
    fadeIn: number;
    fadeOut: number;
    normalize: boolean;
    duration: number;
  }
): Promise<void> {
  return new Promise((resolve, reject) => {
    const duration = settings.duration;
    const codec = settings.format === 'wav' ? 'pcm_s16le' : settings.format === 'flac' ? 'flac' : 'libmp3lame';
    const ext = settings.format;

    let command = ffmpeg(inputPath)
      .setStartTime(startTime)
      .duration(duration)
      .audioCodec(codec);

    switch (settings.format) {
      case 'mp3':
        command = command.audioBitrate(settings.bitrate);
        break;
      case 'wav':
        command = command.audioChannels(settings.channels === 'mono' ? 1 : 2);
        break;
      case 'm4a':
        command = command.audioCodec('aac').audioBitrate(settings.bitrate).audioChannels(settings.channels === 'mono' ? 1 : 2);
        break;
      case 'ogg':
        command = command.audioCodec('libvorbis').audioBitrate(settings.bitrate);
        break;
      case 'flac':
        command = command.audioCodec('flac');
        break;
    }

    if (settings.sampleRate && settings.sampleRate !== 'original') {
      command = command.audioFrequency(parseInt(settings.sampleRate));
    }

    if (settings.channels && settings.channels !== 'original') {
      command = command.audioChannels(settings.channels === 'mono' ? 1 : 2);
    }

    if (settings.volume && settings.volume !== 0) {
      const vol = settings.volume > 0 ? 1 + settings.volume / 100 : 1 + settings.volume / 100;
      command = command.audioFilter(`volume=${vol.toFixed(2)}`);
    }

    if (settings.fadeIn > 0) {
      command = command.audioFilter(`afade=t=in:st=0:d=${Math.min(settings.fadeIn, duration)}`);
    }

    if (settings.fadeOut > 0) {
      command = command.audioFilter(`afade=t=out:st=${Math.max(0, duration - settings.fadeOut)}:d=${Math.min(settings.fadeOut, duration)}`);
    }

    if (settings.normalize) {
      command = command.audioFilter('dynaudnorm');
    }

    command
      .toFormat(ext)
      .on('start', (cmdline: string) => {
        console.log('FFmpeg command:', cmdline);
      })
      .on('progress', (progress: any) => {
        if (progress.timing && progress.duration) {
          const pct = Math.min(95, Math.round((progress.timemark ? parseFloat(progress.timemark) : 0) / duration * 100));
          progress.percent = pct;
        }
      })
      .on('end', () => {
        resolve();
      })
      .on('error', (err: any) => {
        reject(err);
      })
      .save(outputPath);
  });
}

export function extractAudioProgress(
  inputPath: string,
  outputPath: string,
  startTime: number,
  endTime: number,
  settings: any,
  onProgress: (percent: number, message: string) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const duration = endTime - startTime;
    const codec = settings.format === 'wav' ? 'pcm_s16le' : settings.format === 'flac' ? 'flac' : 'libmp3lame';

    let command = ffmpeg(inputPath)
      .setStartTime(startTime)
      .duration(duration)
      .audioCodec(codec);

    if (settings.format === 'mp3') command = command.audioBitrate(settings.bitrate);
    if (settings.format === 'm4a') {
      command = command.audioCodec('aac').audioBitrate(settings.bitrate);
    }
    if (settings.format === 'ogg') command = command.audioCodec('libvorbis').audioBitrate(settings.bitrate);

    if (settings.sampleRate && settings.sampleRate !== 'original') {
      command = command.audioFrequency(parseInt(settings.sampleRate));
    }
    if (settings.channels && settings.channels !== 'original') {
      command = command.audioChannels(settings.channels === 'mono' ? 1 : 2);
    }
    if (settings.volume && settings.volume !== 0) {
      const vol = settings.volume > 0 ? 1 + settings.volume / 100 : 1 + settings.volume / 100;
      command = command.audioFilter(`volume=${vol.toFixed(2)}`);
    }
    if (settings.fadeIn > 0) {
      command = command.audioFilter(`afade=t=in:st=0:d=${Math.min(settings.fadeIn, duration)}`);
    }
    if (settings.fadeOut > 0) {
      command = command.audioFilter(`afade=t=out:st=${Math.max(0, duration - settings.fadeOut)}:d=${Math.min(settings.fadeOut, duration)}`);
    }
    if (settings.normalize) {
      command = command.audioFilter('dynaudnorm');
    }

    command
      .toFormat(settings.format)
      .on('progress', (progress: any) => {
        const pct = Math.min(95, progress.percent || Math.round(progress.timemark / duration * 100));
        onProgress(pct, 'Encoding audio...');
      })
      .on('end', () => {
        onProgress(100, 'Finalizing...');
        resolve();
      })
      .on('error', (err: any) => {
        reject(err);
      })
      .save(outputPath);
  });
}

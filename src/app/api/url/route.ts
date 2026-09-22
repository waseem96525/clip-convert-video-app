import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getVideoMetadata } from '@/lib/ffmpeg';
import { validateUrl } from '@/lib/validators';
import { CONFIG } from '@/lib/config';
import { generateId } from '@/lib/config';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { Readable, Transform } from 'stream';
import { pipeline } from 'stream/promises';

export const runtime = 'nodejs';

const UPLOAD_DIR = CONFIG.uploadDir;
const OUTPUT_DIR = CONFIG.outputDir;
const MAX_SIZE = CONFIG.maxUploadSize;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const DOWNLOAD_TIMEOUT_MS = 120_000;
const YTDLP_TIMEOUT_MS = 600_000;

class VideoUrlError extends Error {
  kind: string;
  constructor(message: string, kind: string) {
    super(message);
    this.kind = kind;
  }
}

function safeUnlink(p: string) {
  try {
    fs.unlinkSync(p);
  } catch {
    /* ignore */
  }
}

function looksLikeVideo(url: string, contentType: string): boolean {
  const ct = contentType || '';
  if (/video\/|octet-stream|binary|mpeg|matroska|quicktime|webm|audio\//.test(ct)) return true;
  if (/\.(mp4|webm|mov|m4v|mkv|avi|flv|wmv|mpeg|mpg)([?#].*)?$/i.test(url)) return true;
  return false;
}

type DownloadOutcome = { via: 'direct' | 'ytdlp'; filepath: string };

async function downloadToFile(url: string, destPath: string): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': BROWSER_UA, Accept: 'video/*,audio/*,application/octet-stream,*/*' },
      redirect: 'follow',
      signal: controller.signal,
    });

    if (res.status === 403) throw new VideoUrlError('Source refused the download (HTTP 403).', 'FORBIDDEN');
    if (!res.ok) throw new VideoUrlError(`HTTP ${res.status}`, 'HTTP');

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (!looksLikeVideo(url, contentType)) {
      throw new VideoUrlError('Link does not point directly to a video file.', 'NOT_VIDEO');
    }

    const contentLength = Number(res.headers.get('content-length') || 0);
    if (contentLength > MAX_SIZE) {
      throw new VideoUrlError(`Video exceeds the maximum size of ${Math.round(MAX_SIZE / 1024 / 1024)} MB.`, 'TOO_BIG');
    }

    if (!res.body) throw new VideoUrlError('Empty response body.', 'EMPTY');

    class SizeGuard extends Transform {
      private bytes = 0;
      _transform(chunk: Buffer, _enc: string, cb: (err?: any, data?: Buffer) => void) {
        this.bytes += chunk.length;
        if (this.bytes > MAX_SIZE) cb(new VideoUrlError(`Video exceeds the maximum size of ${Math.round(MAX_SIZE / 1024 / 1024)} MB.`, 'TOO_BIG'));
        else cb(null, chunk);
      }
    }

    await pipeline(
      Readable.fromWeb(res.body as any),
      new SizeGuard(),
      fs.createWriteStream(destPath)
    );
  } catch (err: any) {
    if (err?.name === 'AbortError' || err?.name === 'TimeoutError') {
      throw new VideoUrlError('Download timed out.', 'TIMEOUT');
    }
    if (err instanceof VideoUrlError) throw err;
    throw new VideoUrlError(err?.message || 'Download failed.', 'NET');
  } finally {
    clearTimeout(timer);
  }
}

function ytdlpToFile(url: string, destDir: string, baseName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const template = path.join(destDir, `${baseName}.%(ext)s`);
    const maxMb = Math.max(1, Math.floor(MAX_SIZE / 1024 / 1024));
    const args = [
      '-q',
      '--no-warnings',
      '--no-playlist',
      '-f', 'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/bv*+ba/b',
      '--socket-timeout', '20',
      '--retries', '1',
      '--max-filesize', `${maxMb}M`,
      '--impersonate', 'chrome',
      '-o', template,
      url,
    ];

    const proc = spawn('python', ['-m', 'yt_dlp', ...args]);
    let stderr = '';
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
    proc.stdout.on('data', () => {});

    const timer = setTimeout(() => {
      try { proc.kill(); } catch { /* ignore */ }
      reject(new VideoUrlError('Download from link timed out.', 'TIMEOUT'));
    }, YTDLP_TIMEOUT_MS);

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(new VideoUrlError('yt-dlp could not be started.', 'YTDLP'));
    });

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        const msg = summarizeYtdlpError(stderr);
        reject(new VideoUrlError(msg, 'YTDLP'));
        return;
      }

      const candidates = fs
        .readdirSync(destDir)
        .filter((f) => f.startsWith(baseName + '.') && !f.endsWith('.part'))
        .sort((a, b) => fs.statSync(path.join(destDir, b)).size - fs.statSync(path.join(destDir, a)).size);

      if (candidates.length === 0) {
        reject(new VideoUrlError('Download produced no output file.', 'YTDLP'));
        return;
      }

      fs.readdirSync(destDir)
        .filter((f) => f.startsWith(baseName + '.') && f.endsWith('.part'))
        .forEach((f) => safeUnlink(path.join(destDir, f)));

      resolve(path.join(destDir, candidates[0]));
    });
  });
}

function summarizeYtdlpError(stderr: string): string {
  const s = stderr || '';
  if (/Private video|Sign in to confirm|Sign in required|login/i.test(s)) return 'This video is private or requires signing in.';
  if (/Unsupported URL|not supported/i.test(s)) return 'The link could not be resolved to a video (it may not be a video page, or the video may have been removed).';
  if (/removed|unavailable|unavailable by the uploader/i.test(s)) return 'The video is unavailable or has been removed.';
  if (/Playback on other websites|embedded|embedding disabled/i.test(s)) return 'The site blocks downloading this video.';
  if (/filesize limit|Requested format is not available|format.*not available/i.test(s)) return 'No downloadable video format was found within the size limit.';
  return s.trim().split('\n').pop()?.slice(0, 300) || 'No downloadable video found at this link.';
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'No URL provided.' }, { status: 400 });
    }

    const validation = validateUrl(url);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const videoId = generateId();
    let outcome: DownloadOutcome | null = null;
    const directPath = path.join(UPLOAD_DIR, `${videoId}.mp4`);

    try {
      await downloadToFile(url, directPath);
      outcome = { via: 'direct', filepath: directPath };
    } catch (err: any) {
      safeUnlink(directPath);
      console.error('Direct download failed, trying yt-dlp:', err?.message);
      try {
        const filepath = await ytdlpToFile(url, UPLOAD_DIR, videoId);
        outcome = { via: 'ytdlp', filepath };
      } catch (fallbackErr: any) {
        throw fallbackErr;
      }
    }

    const filepath = outcome.filepath;
    const metadata = await getVideoMetadata(filepath);
    const duration = metadata.duration;

    if (duration > CONFIG.maxVideoDuration) {
      safeUnlink(filepath);
      return NextResponse.json({ error: `Video duration exceeds maximum of ${CONFIG.maxVideoDuration / 3600} hours.` }, { status: 413 });
    }

    const db = getDb();
    const expiresAt = new Date(Date.now() + CONFIG.fileCleanupDays * 24 * 60 * 60 * 1000).toISOString();
    const filename = path.basename(filepath);

    db.prepare(`
      INSERT INTO videos (id, user_id, original_filename, filename, filepath, size, duration, format, expires_at)
      VALUES (?, 'guest', ?, ?, ?, ?, ?, ?, ?)
    `).run(videoId, url.split('/').pop() || 'video', filename, filepath, 0, duration, metadata.format || 'mp4', expiresAt);

    return NextResponse.json({
      success: true,
      source: outcome.via,
      video: {
        id: videoId,
        filename,
        originalName: url.split('/').pop() || 'video',
        filepath,
        size: 0,
        duration,
        format: metadata.format || 'mp4',
        hasAudio: metadata.hasAudio,
        audioCodec: metadata.audioCodec,
        uploadedAt: new Date().toISOString(),
        expiresAt,
      },
    });
  } catch (error: any) {
    console.error('URL processing error:', error);
    switch (error?.kind) {
      case 'FORBIDDEN':
        return NextResponse.json({ error: 'Source refused the download (HTTP 403). It may require a browser session or allow-listed access.' }, { status: 403 });
      case 'NOT_VIDEO':
        return NextResponse.json({ error: 'This link is not a direct video file. Paste a direct .mp4/.webm/.mov URL or a supported video page (YouTube, Pexels, Pixabay, etc.).' }, { status: 422 });
      case 'TOO_BIG':
        return NextResponse.json({ error: `Video is larger than the ${Math.round(MAX_SIZE / 1024 / 1024)} MB limit.` }, { status: 413 });
      case 'TIMEOUT':
        return NextResponse.json({ error: 'Download timed out. The link may be slow or the server unreachable.' }, { status: 504 });
      case 'YTDLP':
        return NextResponse.json({ error: `Could not extract a video from this link. ${error.message}` }, { status: 422 });
      case 'HTTP':
        return NextResponse.json({ error: `Could not access the link (${error.message}).` }, { status: 502 });
      default:
        return NextResponse.json({ error: 'Failed to process video URL. Please verify the link is a public, directly-downloadable video.' }, { status: 500 });
    }
  }
}
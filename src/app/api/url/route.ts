import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getVideoMetadata, probeVideo } from '@/lib/ffmpeg';
import { validateUrl } from '@/lib/validators';
import { CONFIG } from '@/lib/config';
import { generateId, sanitizeFilename } from '@/lib/config';
import fs from 'fs';
import path from 'path';
import { request } from 'https';

const UPLOAD_DIR = CONFIG.uploadDir;
const OUTPUT_DIR = CONFIG.outputDir;

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

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
    const filename = `${videoId}.mp4`;
    const filepath = path.join(UPLOAD_DIR, filename);

    await downloadUrl(url, filepath);

    const metadata = await getVideoMetadata(filepath);
    const duration = metadata.duration;

    if (duration > CONFIG.maxVideoDuration) {
      fs.unlinkSync(filepath);
      return NextResponse.json({ error: `Video duration exceeds maximum of ${CONFIG.maxVideoDuration / 3600} hours.` }, { status: 413 });
    }

    const db = getDb();
    const expiresAt = new Date(Date.now() + CONFIG.fileCleanupDays * 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO videos (id, user_id, original_filename, filename, filepath, size, duration, format, expires_at)
      VALUES (?, 'guest', ?, ?, ?, ?, ?, ?, ?)
    `).run(videoId, url.split('/').pop() || 'video', filename, filepath, 0, duration, metadata.format || 'mp4', expiresAt);

    return NextResponse.json({
      success: true,
      video: {
        id: videoId,
        filename,
        originalName: url.split('/').pop() || 'video',
        filepath,
        size: 0,
        duration,
        format: metadata.format || 'mp4',
        uploadedAt: new Date().toISOString(),
        expiresAt,
      },
    });
  } catch (error: any) {
    console.error('URL processing error:', error);
    if (error.message?.includes('EACCES') || error.message?.includes('private')) {
      return NextResponse.json({ error: 'Source does not permit downloading.' }, { status: 403 });
    }
    if (error.message?.includes('ENOTFOUND') || error.message?.includes('ECONNREFUSED')) {
      return NextResponse.json({ error: 'We couldn\'t access this video URL.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to process video URL.' }, { status: 500 });
  }
}

function downloadUrl(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? require('https') : require('http');

    const req = protocol.get(url, { timeout: 30000 }, (res: any) => {
      const statusCode = res.statusCode;
      if (statusCode && statusCode >= 300 && statusCode < 400 && res.headers?.location) {
        return downloadUrl(res.headers.location, destPath).then(resolve).catch(reject);
      }
      if (statusCode && statusCode >= 400) {
        fs.unlinkSync(destPath);
        return reject(new Error(`HTTP ${statusCode}`));
      }

      const contentType = res.headers?.['content-type'] || '';
      if (!contentType.includes('video') && !contentType.includes('audio') && !contentType.includes('octet-stream')) {
        fs.unlinkSync(destPath);
        return reject(new Error('Unsupported content type: ' + contentType));
      }

      const writeStream = fs.createWriteStream(destPath);
      res.pipe(writeStream);
      writeStream.on('finish', () => resolve());
      writeStream.on('error', (err: any) => { fs.unlinkSync(destPath); reject(err); });
    });

    req.on('error', (err: any) => { fs.unlinkSync(destPath); reject(err); });
    req.on('timeout', () => { req.destroy(); fs.unlinkSync(destPath); reject(new Error('Download timeout')); });
  });
}

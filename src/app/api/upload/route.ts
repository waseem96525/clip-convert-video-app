import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getVideoMetadata } from '@/lib/ffmpeg';
import { CONFIG } from '@/lib/config';
import { generateId, sanitizeFilename } from '@/lib/config';
import fs from 'fs';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const OUTPUT_DIR = path.join(process.cwd(), 'output');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const userId = (formData.get('userId') as string) || 'guest';

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const byteLength = file.size;
    if (byteLength > CONFIG.maxUploadSize) {
      return NextResponse.json({ error: `File exceeds maximum size of ${(CONFIG.maxUploadSize / 1024 / 1024).toFixed(0)} MB.` }, { status: 413 });
    }

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const supportedFormats = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v', '.flv', '.wmv'];
    if (!supportedFormats.includes(ext)) {
      return NextResponse.json({ error: `Unsupported format: ${ext}` }, { status: 400 });
    }

    const filename = `${generateId()}${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);
    const buffer = Buffer.from(bytes);
    fs.writeFileSync(filepath, buffer);

    const metadata = await getVideoMetadata(filepath);
    const duration = metadata.duration;

    if (duration > CONFIG.maxVideoDuration) {
      fs.unlinkSync(filepath);
      return NextResponse.json({ error: `Video duration exceeds maximum of ${CONFIG.maxVideoDuration / 3600} hours.` }, { status: 413 });
    }

    const videoId = generateId();
    const db = getDb();
    const expiresAt = new Date(Date.now() + CONFIG.fileCleanupDays * 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO videos (id, user_id, original_filename, filename, filepath, size, duration, format, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(videoId, userId, file.name, filename, filepath, byteLength, duration, ext.slice(1), expiresAt);

    return NextResponse.json({
      success: true,
      video: {
        id: videoId,
        filename,
        originalName: file.name,
        filepath,
        size: byteLength,
        duration,
        format: ext.slice(1),
        uploadedAt: new Date().toISOString(),
        expiresAt,
      },
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload video.' }, { status: 500 });
  }
}

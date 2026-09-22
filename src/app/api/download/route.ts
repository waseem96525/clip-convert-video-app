import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import fs from 'fs';
import path from 'path';
import { CONFIG } from '@/lib/config';

const OUTPUT_DIR = CONFIG.outputDir;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clipId = searchParams.get('id');
  const clipName = searchParams.get('name') || 'clip';

  if (!clipId) return NextResponse.json({ error: 'Missing clipId.' }, { status: 400 });

  const db = getDb();
  const clip = db.prepare('SELECT * FROM clips WHERE id = ?').get(clipId) as any;
  if (!clip) return NextResponse.json({ error: 'Clip not found.' }, { status: 404 });
  if (clip.status !== 'completed') {
    return NextResponse.json({
      error: clip.status === 'failed' ? 'Clip processing failed. Please try again.' : 'Clip is still processing. Please wait.',
    }, { status: 409 });
  }
  if (!fs.existsSync(clip.filepath)) return NextResponse.json({ error: 'File not found.' }, { status: 404 });

  const ext = path.extname(clip.filepath);
  const filename = `${sanitizeFileName(clipName)}${ext}`;

  const fileStream = fs.createReadStream(clip.filepath);
  const buffer = fs.readFileSync(clip.filepath);

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': getContentType(ext),
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.length),
    },
  });
}

function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._ \-]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 100)
    .trim();
}

function getContentType(ext: string): string {
  const types: Record<string, string> = {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.m4a': 'audio/mp4',
    '.ogg': 'audio/ogg',
    '.flac': 'audio/flac',
  };
  return types[ext] || 'audio/mpeg';
}

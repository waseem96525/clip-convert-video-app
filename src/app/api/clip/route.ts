import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import fs from 'fs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');
  const clipId = searchParams.get('id');

  const db = getDb();

  if (clipId) {
    const clip = db.prepare('SELECT * FROM clips WHERE id = ?').get(clipId) as any;
    if (!clip) return NextResponse.json({ error: 'Clip not found.' }, { status: 404 });
    return NextResponse.json({ clip });
  }

  if (videoId) {
    const clips = db.prepare('SELECT * FROM clips WHERE video_id = ? ORDER BY created_at DESC').all(videoId) as any[];
    return NextResponse.json({ clips });
  }

  return NextResponse.json({ error: 'Provide videoId or id.' }, { status: 400 });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clipId = searchParams.get('id');

  if (!clipId) return NextResponse.json({ error: 'Missing clipId.' }, { status: 400 });

  const db = getDb();
  const clip = db.prepare('SELECT * FROM clips WHERE id = ?').get(clipId) as any;
  if (!clip) return NextResponse.json({ error: 'Clip not found.' }, { status: 404 });

  if (clip.filepath && fs.existsSync(clip.filepath)) {
    fs.unlinkSync(clip.filepath);
  }

  db.prepare('DELETE FROM clips WHERE id = ?').run(clipId);
  db.prepare("DELETE FROM processing_jobs WHERE clip_id = ?").run(clipId);

  return NextResponse.json({ success: true });
}

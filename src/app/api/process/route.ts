import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { extractAudio, getVideoMetadata } from '@/lib/ffmpeg';
import { validateClipTimes } from '@/lib/validators';
import { CONFIG } from '@/lib/config';
import { generateId, sanitizeFilename, formatTime } from '@/lib/config';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = CONFIG.outputDir;

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId, name, startTime, endTime, audioSettings } = body;

    if (!videoId) return NextResponse.json({ error: 'Missing videoId.' }, { status: 400 });
    if (!name) return NextResponse.json({ error: 'Missing clip name.' }, { status: 400 });
    if (startTime == null || endTime == null) return NextResponse.json({ error: 'Missing start or end time.' }, { status: 400 });

    const validation = validateClipTimes(startTime, endTime);
    if (validation) return NextResponse.json({ error: validation }, { status: 400 });

    const db = getDb();
    const video = db.prepare('SELECT * FROM videos WHERE id = ?').get(videoId) as any;
    if (!video) return NextResponse.json({ error: 'Video not found.' }, { status: 404 });
    if (!fs.existsSync(video.filepath)) return NextResponse.json({ error: 'Video file not found on server.' }, { status: 404 });

    const meta = await getVideoMetadata(video.filepath);
    if (!meta.hasAudio) {
      return NextResponse.json({ error: 'This video has no audio track, so no audio can be extracted.' }, { status: 400 });
    }

    const duration = endTime - startTime;
    const clipId = generateId();
    const outputFilename = `${sanitizeFilename(name)}_${clipId}.${audioSettings.format}`;
    const outputPath = path.join(OUTPUT_DIR, outputFilename);
    const expiresAt = new Date(Date.now() + CONFIG.fileCleanupDays * 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO clips (id, video_id, video_filename, name, start_time, end_time, duration, format, bitrate, sample_rate, channels, volume, fade_in, fade_out, normalize, status, progress, filepath, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', 0, ?, ?)
    `).run(clipId, videoId, video.original_filename, name, startTime, endTime, duration,
      audioSettings.format, audioSettings.bitrate, audioSettings.sampleRate, audioSettings.channels,
      audioSettings.volume, audioSettings.fadeIn, audioSettings.fadeOut, audioSettings.normalize ? 1 : 0,
      outputPath, expiresAt);

    const jobId = generateId();
    db.prepare(`
      INSERT INTO processing_jobs (id, video_id, clip_id, status, progress, progress_message, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(jobId, videoId, clipId, 'queued', 0, 'Preparing...');

    setTimeout(async () => {
      await processClip(clipId, jobId, video.filepath, outputPath, startTime, endTime, audioSettings);
    }, 100);

    return NextResponse.json({
      success: true,
      clipId,
      jobId,
      message: 'Clip processing started.',
    });
  } catch (error: any) {
    console.error('Process error:', error);
    return NextResponse.json({ error: `Failed to start clip processing: ${error.message}` }, { status: 500 });
  }
}

async function processClip(clipId: string, jobId: string, inputPath: string, outputPath: string, startTime: number, endTime: number, settings: any) {
  const db = getDb();
  try {
    db.prepare('UPDATE processing_jobs SET status = ?, progress = ?, progress_message = ? WHERE id = ?').run('processing', 5, 'Extracting audio...', jobId);
    db.prepare('UPDATE clips SET status = ?, progress = ? WHERE id = ?').run('processing', 5, clipId);

    await extractAudio(inputPath, outputPath, startTime, endTime, {
      ...settings,
      duration: endTime - startTime,
    });

    const stats = fs.statSync(outputPath);
    db.prepare('UPDATE processing_jobs SET status = ?, progress = ?, progress_message = ?, completed_at = ? WHERE id = ?').run('completed', 100, 'Complete!', new Date().toISOString(), jobId);
    db.prepare('UPDATE clips SET status = ?, progress = ?, file_size = ?, filepath = ? WHERE id = ?').run('completed', 100, stats.size, outputPath, clipId);
  } catch (error: any) {
    console.error('Processing failed:', error);
    db.prepare('UPDATE processing_jobs SET status = ?, error = ?, completed_at = ? WHERE id = ?').run('failed', error.message || 'Processing failed', new Date().toISOString(), jobId);
    db.prepare('UPDATE clips SET status = ?, error = ? WHERE id = ?').run('failed', error.message || 'Processing failed', clipId);
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clipId = searchParams.get('id');
  const jobId = searchParams.get('jobId');

  if (clipId) {
    const db = getDb();
    const clip = db.prepare('SELECT * FROM clips WHERE id = ?').get(clipId) as any;
    if (!clip) return NextResponse.json({ error: 'Clip not found.' }, { status: 404 });
    return NextResponse.json({ clip });
  }

  if (jobId) {
    const db = getDb();
    const job = db.prepare('SELECT * FROM processing_jobs WHERE id = ?').get(jobId) as any;
    if (!job) return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
    return NextResponse.json({ job });
  }

  return NextResponse.json({ error: 'Provide clipId or jobId.' }, { status: 400 });
}

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import fs from 'fs';
import { CONFIG } from '@/lib/config';

export async function GET() {
  try {
    const ffmpegAvailable = await new Promise<boolean>((resolve) => {
      try {
        const cp = require('child_process');
        cp.exec('ffmpeg -version', (err: any) => {
          resolve(!err);
        });
      } catch {
        resolve(false);
      }
    });

    const db = getDb();
    const stats = {
      totalUsers: (db.prepare('SELECT COUNT(*) as c FROM users').get() as any).c,
      totalConversions: (db.prepare('SELECT COUNT(*) as c FROM clips').get() as any).c,
      activeJobs: (db.prepare("SELECT COUNT(*) as c FROM processing_jobs WHERE status IN ('queued', 'processing', 'downloading', 'probing')").get() as any).c,
      failedJobs: (db.prepare("SELECT COUNT(*) as c FROM processing_jobs WHERE status = 'failed'").get() as any).c,
      storageUsed: (db.prepare('SELECT COALESCE(SUM(file_size), 0) as t FROM clips').get() as any).t,
      totalVideos: (db.prepare('SELECT COUNT(*) as c FROM videos').get() as any).c,
    };

    return NextResponse.json({
      status: 'ok',
      ffmpeg: ffmpegAvailable,
      uptime: process.uptime(),
      stats,
    });
  } catch (error) {
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}

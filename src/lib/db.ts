import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { CONFIG } from './config';

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance;

  const dbPath = CONFIG.dbPath;
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  dbInstance = new Database(dbPath);
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');

  initializeTables();
  return dbInstance;
}

function initializeTables() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS videos (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      original_filename TEXT NOT NULL,
      filename TEXT NOT NULL,
      filepath TEXT NOT NULL,
      size INTEGER NOT NULL,
      duration REAL NOT NULL,
      format TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS clips (
      id TEXT PRIMARY KEY,
      video_id TEXT NOT NULL,
      video_filename TEXT NOT NULL,
      name TEXT NOT NULL,
      start_time REAL NOT NULL,
      end_time REAL NOT NULL,
      duration REAL NOT NULL,
      format TEXT NOT NULL,
      bitrate TEXT DEFAULT '128k',
      sample_rate TEXT DEFAULT '44100',
      channels TEXT DEFAULT 'stereo',
      volume INTEGER DEFAULT 0,
      fade_in REAL DEFAULT 0,
      fade_out REAL DEFAULT 0,
      normalize INTEGER DEFAULT 0,
      file_size INTEGER DEFAULT 0,
      filepath TEXT,
      status TEXT DEFAULT 'queued',
      progress INTEGER DEFAULT 0,
      error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      FOREIGN KEY (video_id) REFERENCES videos(id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS processing_jobs (
      id TEXT PRIMARY KEY,
      video_id TEXT NOT NULL,
      clip_id TEXT,
      status TEXT DEFAULT 'queued',
      progress INTEGER DEFAULT 0,
      progress_message TEXT,
      error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (video_id) REFERENCES videos(id),
      FOREIGN KEY (clip_id) REFERENCES clips(id)
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_videos_user ON videos(user_id);
    CREATE INDEX IF NOT EXISTS idx_clips_video ON clips(video_id);
    CREATE INDEX IF NOT EXISTS idx_jobs_video ON processing_jobs(video_id);
    CREATE INDEX IF NOT EXISTS idx_jobs_status ON processing_jobs(status);
  `);

  db.prepare(
    'INSERT OR IGNORE INTO users (id, email, name) VALUES (?, ?, ?)'
  ).run('guest', 'guest@clipconvert.local', 'Guest');
}

export function cleanupExpiredFiles() {
  const db = getDb();
  const now = Date.now();
  const cleanupMs = CONFIG.fileCleanupDays * 24 * 60 * 60 * 1000;

  const expiredVideos = db.prepare(
    "SELECT filepath FROM videos WHERE expires_at < datetime('now')"
  ).all() as { filepath: string }[];

  for (const v of expiredVideos) {
    try {
      if (fs.existsSync(v.filepath)) fs.unlinkSync(v.filepath);
    } catch {}
  }

  const expiredClips = db.prepare(
    "SELECT filepath FROM clips WHERE expires_at < datetime('now') AND filepath IS NOT NULL"
  ).all() as { filepath: string }[];

  for (const c of expiredClips) {
    try {
      if (fs.existsSync(c.filepath)) fs.unlinkSync(c.filepath);
    } catch {}
  }

  db.prepare("DELETE FROM videos WHERE expires_at < datetime('now')").run();
  db.prepare("DELETE FROM clips WHERE expires_at < datetime('now')").run();
  db.prepare("DELETE FROM processing_jobs WHERE created_at < datetime('now', '-7 days')").run();
}

export function getVideoById(id: string) {
  return getDb().prepare('SELECT * FROM videos WHERE id = ?').get(id) as any;
}

export function getClipsByVideoId(videoId: string) {
  return getDb().prepare('SELECT * FROM clips WHERE video_id = ? ORDER BY created_at DESC').all(videoId) as any[];
}

export function getClipById(id: string) {
  return getDb().prepare('SELECT * FROM clips WHERE id = ?').get(id) as any;
}

export function getStats() {
  const db = getDb();
  return {
    totalUsers: (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count,
    totalConversions: (db.prepare('SELECT COUNT(*) as count FROM clips').get() as any).count,
    activeJobs: (db.prepare("SELECT COUNT(*) as count FROM processing_jobs WHERE status IN ('queued', 'processing', 'downloading', 'probing')").get() as any).count,
    failedJobs: (db.prepare("SELECT COUNT(*) as count FROM processing_jobs WHERE status = 'failed'").get() as any).count,
    storageUsed: (db.prepare('SELECT COALESCE(SUM(file_size), 0) as total FROM clips').get() as any).total,
  };
}

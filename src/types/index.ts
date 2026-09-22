export interface VideoFile {
  id: string;
  filename: string;
  originalName: string;
  path: string;
  size: number;
  duration: number;
  format: string;
  uploadedAt: Date;
  expiresAt: Date;
}

export interface Clip {
  id: string;
  videoId: string;
  videoFilename: string;
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  format: string;
  bitrate: string;
  sampleRate: string;
  channels: string;
  volume: number;
  fadeIn: number;
  fadeOut: number;
  normalize: boolean;
  fileSize: number;
  filePath: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  error: string | null;
  createdAt: Date;
  expiresAt: Date;
}

export interface ProcessingJob {
  id: string;
  videoId: string;
  clipId: string | null;
  status: 'queued' | 'downloading' | 'probing' | 'processing' | 'encoding' | 'completed' | 'failed' | 'expired';
  progress: number;
  progressMessage: string;
  error: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

export interface AudioSettings {
  format: 'mp3' | 'wav' | 'm4a' | 'ogg' | 'flac';
  bitrate: string;
  sampleRate: string;
  channels: string;
  normalize: boolean;
  fadeIn: number;
  fadeOut: number;
  volume: number;
}

export interface ClipCreateRequest {
  videoId: string;
  name: string;
  startTime: number;
  endTime: number;
  audioSettings: AudioSettings;
}

export interface UrlProcessRequest {
  url: string;
}

export interface UploadResponse {
  success: boolean;
  video: VideoFile;
}

export interface ProcessResponse {
  success: boolean;
  clip: Clip;
  job: ProcessingJob;
}

export interface DownloadResponse {
  success: boolean;
  filename: string;
  path: string;
}

export interface HealthCheck {
  status: string;
  ffmpeg: boolean;
  uptime: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

export interface ClipStats {
  totalConversions: number;
  totalClips: number;
  activeJobs: number;
  storageUsed: number;
}

export interface ValidationError {
  field: string;
  message: string;
}

export const SUPPORTED_VIDEO_FORMATS = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v', '.flv', '.wmv'];
export const SUPPORTED_AUDIO_FORMATS = ['mp3', 'wav', 'm4a', 'ogg', 'flac'];
export const MAX_UPLOAD_SIZE = 500 * 1024 * 1024;
export const MAX_VIDEO_DURATION = 2 * 60 * 60;
export const MAX_CLIP_DURATION = 30 * 60;
export const MAX_CONCURRENT_JOBS = 2;
export const GUEST_CLIPS_PER_DAY = 3;
export const FILE_CLEANUP_DAYS = 1;

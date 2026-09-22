import { CONFIG } from './config';

const SUPPORTED_VIDEO_FORMATS = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v', '.flv', '.wmv'];

const PRIVATE_RANGES = [
  ['10.0.0.0', '10.255.255.255'],
  ['172.16.0.0', '172.31.255.255'],
  ['192.168.0.0', '192.168.255.255'],
  ['127.0.0.0', '127.255.255.255'],
  ['169.254.0.0', '169.254.255.255'],
  ['fc00::', 'fdff::'],
  ['fe80::', 'febf::'],
];

export function isPrivateIp(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;
    const ip = hostname.replace(/^\[/, '').replace(/\]$/, '');

    for (const range of PRIVATE_RANGES) {
      if (hostname === range[0].split('.')[0] || ip.startsWith(range[0].split('.')[0]) || ip.startsWith(range[0].split(':')[0])) {
        return true;
      }
    }

    if (/^127\.|^0\.|^169\.254\.|^10\.|^172\.(1[6-9]|2\d|3[01])\.|^192\.168\.|^fc|^fd|^fe80/.test(ip)) {
      return true;
    }

    if (hostname === 'localhost' || hostname === 'localhost.localdomain') {
      return true;
    }

    return false;
  } catch {
    return true;
  }
}

export function validateUrl(url: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'Only HTTP and HTTPS URLs are supported.' };
    }
    if (isPrivateIp(url)) {
      return { valid: false, error: 'Private network URLs are not allowed.' };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format.' };
  }
}

export function validateFile(file: { name: string; size: number }): { valid: boolean; error?: string } {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!SUPPORTED_VIDEO_FORMATS.includes(ext)) {
    return { valid: false, error: `Unsupported file format: ${ext}. Supported: ${SUPPORTED_VIDEO_FORMATS.join(', ')}` };
  }
  if (file.size > CONFIG.maxUploadSize) {
    return { valid: false, error: `File exceeds maximum size of ${(CONFIG.maxUploadSize / 1024 / 1024).toFixed(0)} MB.` };
  }
  return { valid: true };
}

export function validateClipTimes(startTime: number, endTime: number): string | null {
  if (isNaN(startTime) || isNaN(endTime)) return 'Invalid timestamp values.';
  if (startTime < 0) return 'Start time must be >= 0.';
  if (endTime <= startTime) return 'End time must be greater than start time.';
  if (endTime - startTime > CONFIG.maxClipDuration) return `Maximum clip duration is ${CONFIG.maxClipDuration / 60} minutes.`;
  return null;
}

export function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._ \-]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 100)
    .trim();
}

export function getSupportedFormats(): string[] {
  return SUPPORTED_VIDEO_FORMATS.map(f => f.toUpperCase());
}

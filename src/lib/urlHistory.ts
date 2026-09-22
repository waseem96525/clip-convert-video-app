const KEY = 'clipconvert:recent-urls';
const MAX = 6;

export function getRecentUrls(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(parsed) ? parsed.filter((u) => typeof u === 'string') : [];
  } catch {
    return [];
  }
}

export function addRecentUrl(url: string): string[] {
  const next = [url, ...getRecentUrls().filter((u) => u !== url)].slice(0, MAX);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage full/blocked */
    }
  }
  return next;
}

export function clearRecentUrls(): string[] {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }
  return [];
}

export const SAMPLE_VIDEO_URL = 'https://download.samplelib.com/mp4/sample-5s.mp4';
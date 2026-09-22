export interface StoredClip {
  id: string;
  name: string;
  url: string;
  format: string;
  bitrate: string;
  size: number;
  startTime: number;
  endTime: number;
  duration: number;
  createdAt: string;
}

const KEY = 'clipconvert:clips';
const EMPTY: StoredClip[] = [];

const listeners = new Set<() => void>();
let cache: StoredClip[] | undefined;
let listening = false;

function notify() {
  listeners.forEach((l) => l());
}

function ensureStorageListener() {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      cache = undefined;
      notify();
    }
  });
}

function loadClips(): StoredClip[] {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as StoredClip[]) : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache;
}

export function getStoredClips(): StoredClip[] {
  return cache ?? loadClips();
}

export function subscribeClips(listener: () => void): () => void {
  listeners.add(listener);
  ensureStorageListener();
  return () => {
    listeners.delete(listener);
  };
}

export function saveStoredClip(clip: StoredClip): StoredClip[] {
  const clips = [clip, ...getStoredClips().slice(0, 99)];
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(clips));
    } catch {
      /* storage full/blocked */
    }
  }
  cache = clips;
  notify();
  return clips;
}

export function removeStoredClip(id: string): StoredClip[] {
  const clips = getStoredClips().filter((c) => c.id !== id);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(clips));
    } catch {
      /* ignore */
    }
  }
  cache = clips;
  notify();
  return clips;
}
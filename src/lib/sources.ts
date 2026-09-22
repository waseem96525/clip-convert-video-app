const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

export class UrlError extends Error {
  kind: string;
  constructor(message: string, kind: string) {
    super(message);
    this.kind = kind;
  }
}

export type Source =
  | { kind: 'direct' }
  | { kind: 'youtube'; videoId: string }
  | { kind: 'instagram'; postId: string };

const YOUTUBE_RE = /(?:youtube\.com\/(?:watch\?[^#]*v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i;
const INSTAGRAM_RE = /instagram\.com\/(?:p|reel|tv|reels)\/([\w-]+)/i;

export function classifySource(rawUrl: string): Source {
  const url = rawUrl.trim();
  const yt = url.match(YOUTUBE_RE);
  if (yt) return { kind: 'youtube', videoId: yt[1] };
  const ig = url.match(INSTAGRAM_RE);
  if (ig) return { kind: 'instagram', postId: ig[1] };
  return { kind: 'direct' };
}

async function fetchPageText(input: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(input, {
      headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': 'en-US,en;q=0.9', Accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
      signal: controller.signal,
    });
    if (res.status === 403 || res.status === 429) {
      throw new UrlError('The source blocked this request (HTTP ' + res.status + '). Try again later.', 'FORBIDDEN');
    }
    if (!res.ok) throw new UrlError('HTTP ' + res.status, 'HTTP');
    return await res.text();
  } catch (err: unknown) {
    if (err instanceof UrlError) throw err;
    const aborted = err instanceof Error && err.name === 'AbortError';
    if (aborted) throw new UrlError('The source timed out.', 'TIMEOUT');
    throw new UrlError(err instanceof Error ? err.message : 'Download failed.', 'NET');
  } finally {
    clearTimeout(timer);
  }
}

function scanJsonObject(html: string, marker: string): string {
  const startIdx = html.indexOf(marker);
  if (startIdx < 0) return '';
  const braceIdx = html.indexOf('{', startIdx + marker.length);
  if (braceIdx < 0) return '';
  let depth = 0;
  let inString = false;
  let quote = '';
  for (let i = braceIdx; i < html.length; i++) {
    const c = html[i];
    if (inString) {
      if (c === '\\') i += 1;
      else if (c === quote) inString = false;
    } else if (c === '"') {
      inString = true;
      quote = '"';
    } else if (c === '{') depth += 1;
    else if (c === '}') {
      depth -= 1;
      if (depth === 0) return html.slice(braceIdx, i + 1);
    }
  }
  return '';
}

interface PlayerFormat {
  itag?: number;
  url?: string;
  mimeType?: string;
  contentLength?: number;
}

interface PlayerResponse {
  playabilityStatus?: { status?: string; reason?: string };
  streamingData?: { formats?: PlayerFormat[]; adaptiveFormats?: PlayerFormat[] };
  videoDetails?: { title?: string; lengthSeconds?: string };
}

function pickYoutubeFormat(data: PlayerResponse | undefined): { url: string; itag?: number; contentLength?: number } | null {
  const all: PlayerFormat[] = [
    ...(data?.streamingData?.formats ?? []),
    ...(data?.streamingData?.adaptiveFormats ?? []),
  ];
  const candidates = all.filter(
    (f) => typeof f.url === 'string' && f.url.includes('googlevideo.com') && (f.mimeType ?? '').startsWith('video/mp4')
  );
  if (candidates.length === 0) return null;
  const preferred = [18, 22, 37].map((itag) => candidates.find((c) => c.itag === itag)).find((c) => !!c);
  const pick = preferred ?? candidates[0];
  return { url: pick.url!, itag: pick.itag, contentLength: Number(pick.contentLength || 0) };
}

export async function resolveYoutube(videoId: string): Promise<{ url: string; name: string; duration: number }> {
  const html = await fetchPageText(`https://www.youtube.com/watch?v=${videoId}`, 25_000);
  const json = scanJsonObject(html, 'var ytInitialPlayerResponse = ');
  if (!json) throw new UrlError('YouTube playback data could not be found for this video.', 'UNSUPPORTED');

  let data: PlayerResponse | undefined;
  try {
    data = JSON.parse(json) as PlayerResponse;
  } catch {
    throw new UrlError('YouTube playback data could not be parsed for this video.', 'UNSUPPORTED');
  }

  const status = data?.playabilityStatus?.status;
  if (status === 'LOGIN_REQUIRED') throw new UrlError('This YouTube video requires sign-in to watch.', 'UNSUPPORTED');
  if (status && status !== 'OK') {
    throw new UrlError(`YouTube cannot play this video (${data.playabilityStatus?.reason ?? status}).`, 'UNSUPPORTED');
  }

  const fmt = pickYoutubeFormat(data);
  if (!fmt) throw new UrlError('YouTube did not expose a direct MP4 stream for this video.', 'UNSUPPORTED');

  const title = typeof data?.videoDetails?.title === 'string' ? data.videoDetails.title.slice(0, 80) : '';
  return {
    url: fmt.url,
    name: title ? `${title}.mp4` : `youtube-${videoId}.mp4`,
    duration: Number(data?.videoDetails?.lengthSeconds || 0),
  };
}

export async function resolveInstagram(postId: string): Promise<{ url: string; name: string }> {
  let html: string;
  try {
    html = await fetchPageText(`https://www.instagram.com/p/${postId}/embed/`, 25_000);
  } catch {
    html = await fetchPageText(`https://www.instagram.com/p/${postId}/`, 25_000);
  }

  let match = html.match(/<meta[^>]+property=["']og:video["'][^>]+content=["']([^"']+)["']/i);
  if (!match) match = html.match(/<meta[^>]+property=["']og:video:secure_url["'][^>]+content=["']([^"']+)["']/i);
  if (!match) {
    match = html.match(/"video_versions":\[[^]]*?"url":"([^"]+?)\.mp4[^"]*"/i);
  }
  if (!match) throw new UrlError('Could not find a video on this Instagram post.', 'UNSUPPORTED');

  let url = match[1];
  if (url.startsWith('\\u002F')) url = 'https:' + url;
  if (url.includes('\\u')) {
    try {
      url = JSON.parse(`"${url}"`);
    } catch {
      throw new UrlError('Could not decode the Instagram video URL.', 'UNSUPPORTED');
    }
  }
  return { url, name: `instagram-${postId}.mp4` };
}
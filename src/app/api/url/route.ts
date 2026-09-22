import { NextRequest, NextResponse } from 'next/server';
import { validateUrl } from '@/lib/validators';
import { CONFIG } from '@/lib/config';
import { storeBlob, deleteBlob, blobEnabled } from '@/lib/storage';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_SIZE = CONFIG.maxUploadSize;
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

class UrlError extends Error {
  kind: string;
  constructor(message: string, kind: string) {
    super(message);
    this.kind = kind;
  }
}

function looksLikeVideo(url: string, contentType: string): boolean {
  const ct = contentType || '';
  if (/video\/|octet-stream|binary|mpeg|matroska|quicktime|webm/.test(ct)) return true;
  if (/\.(mp4|webm|mov|m4v|mkv|avi|flv|wmv|mpeg|mpg)([?#].*)?$/i.test(url)) return true;
  return false;
}

async function resolveToStream(url: string): Promise<{ body: ReadableStream | null; contentType: string; contentLength: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': BROWSER_UA, Accept: 'video/*,audio/*,application/octet-stream,*/*' },
      redirect: 'follow',
      signal: controller.signal,
    });
    if (res.status === 403) throw new UrlError('The source refused the download (HTTP 403).', 'FORBIDDEN');
    if (!res.ok) throw new UrlError(`HTTP ${res.status}`, 'HTTP');

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (!looksLikeVideo(url, contentType)) {
      throw new UrlError(
        'This link is not a direct video file. On this (serverless) build, please paste a direct .mp4/.webm/.mov URL — video pages such as YouTube/Pexels are not supported.',
        'NOT_VIDEO'
      );
    }
    const contentLength = Number(res.headers.get('content-length') || 0);
    if (contentLength > MAX_SIZE) {
      throw new UrlError(`Video exceeds the maximum size of ${Math.round(MAX_SIZE / 1024 / 1024)} MB.`, 'TOO_BIG');
    }
    return { body: res.body, contentType, contentLength };
  } catch (err: unknown) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    if (aborted) throw new UrlError('Download timed out (45s).', 'TIMEOUT');
    if (err instanceof UrlError) throw err;
    throw new UrlError(err instanceof Error ? err.message : 'Download failed.', 'NET');
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!blobEnabled()) {
      return NextResponse.json({ error: 'Storage is not configured. Set BLOB_READ_WRITE_TOKEN.' }, { status: 503 });
    }

    const { url } = await request.json();
    if (!url) return NextResponse.json({ error: 'No URL provided.' }, { status: 400 });

    const validation = validateUrl(url);
    if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 400 });

    const { body, contentType } = await resolveToStream(url);
    if (!body) throw new UrlError('Empty response body.', 'EMPTY');

    const name = url.split('/').pop()?.split('?')[0]?.slice(0, 100) || 'video';
    const ext = name.includes('.') ? name.split('.').pop()?.toLowerCase() || 'mp4' : 'mp4';
    const filename = `video-${Date.now()}.${ext}`;

    const stored = await storeBlob(body, filename, contentType || 'application/octet-stream');

    return NextResponse.json({
      success: true,
      video: {
        id: String(Date.now()),
        url: stored.url,
        name,
        size: stored.size,
        duration: 0,
      },
    });
  } catch (error: unknown) {
    console.error('URL error:', error);
    const kind = error instanceof UrlError ? error.kind : undefined;
    const msg = error instanceof Error ? error.message : 'Unknown error';
    switch (kind) {
      case 'FORBIDDEN':
        return NextResponse.json({ error: 'The source refused the download (HTTP 403).' }, { status: 403 });
      case 'NOT_VIDEO':
        return NextResponse.json({ error: msg }, { status: 422 });
      case 'TOO_BIG':
        return NextResponse.json({ error: msg }, { status: 413 });
      case 'TIMEOUT':
        return NextResponse.json({ error: msg }, { status: 504 });
      case 'HTTP':
        return NextResponse.json({ error: `Could not access the link (${msg}).` }, { status: 502 });
      case 'STORAGE':
        return NextResponse.json({ error: 'Storage is not configured. Set BLOB_READ_WRITE_TOKEN.' }, { status: 503 });
      default:
        return NextResponse.json({ error: 'Failed to fetch the video from this link.' }, { status: 500 });
    }
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (!url) return NextResponse.json({ error: 'No URL provided.' }, { status: 400 });
    await deleteBlob(url);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete file.' }, { status: 500 });
  }
}
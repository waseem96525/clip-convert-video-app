import { put, del, type PutBlobResult } from '@vercel/blob';

const BLOB_PREFIX = 'clipconvert/';
const isBlobConfigured = typeof process.env.BLOB_READ_WRITE_TOKEN === 'string' && process.env.BLOB_READ_WRITE_TOKEN.length > 0;

export function blobEnabled(): boolean {
  return isBlobConfigured;
}

export async function storeBlob(
  body: BodyInit,
  filename: string,
  contentType: string,
  knownSize?: number
): Promise<{ url: string; size: number }> {
  if (!isBlobConfigured) {
    throw Object.assign(new Error('Vercel Blob storage is not configured (missing BLOB_READ_WRITE_TOKEN).'), { kind: 'STORAGE' });
  }
  const result: PutBlobResult & { size?: number } = await put(
    `${BLOB_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 9)}/${filename}`,
    body as Parameters<typeof put>[1],
    {
      access: 'public',
      contentType,
      addRandomSuffix: true,
    }
  );
  return { url: result.url, size: knownSize ?? result.size ?? 0 };
}

export async function deleteBlob(url: string): Promise<void> {
  if (!isBlobConfigured) return;
  if (!url.includes('/clipconvert/')) return;
  try {
    await del(url);
  } catch {
    /* ignore */
  }
}
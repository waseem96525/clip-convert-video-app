import { put, del, type PutBlobResult } from '@vercel/blob';

const BLOB_PREFIX = 'clipconvert/';

function hasReadWriteToken(): boolean {
  return !!(process.env.BLOB_READ_WRITE_TOKEN || '').trim();
}

function hasOidcStore(): boolean {
  return !!(process.env.BLOB_STORE_ID || '').trim();
}

export function blobEnabled(): boolean {
  return hasReadWriteToken() || hasOidcStore();
}

export async function storeBlob(
  body: BodyInit,
  filename: string,
  contentType: string,
  knownSize?: number
): Promise<{ url: string; size: number }> {
  if (!blobEnabled()) {
    throw Object.assign(new Error('Vercel Blob storage is not configured (missing BLOB_READ_WRITE_TOKEN or BLOB_STORE_ID).'), { kind: 'STORAGE' });
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
  if (!blobEnabled()) return;
  if (!url.includes('/clipconvert/')) return;
  try {
    await del(url);
  } catch {
    /* ignore */
  }
}
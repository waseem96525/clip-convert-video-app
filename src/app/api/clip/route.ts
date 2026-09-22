import { NextRequest, NextResponse } from 'next/server';
import { storeBlob, deleteBlob, blobEnabled } from '@/lib/storage';
import { CONFIG } from '@/lib/config';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    if (!blobEnabled()) {
      return NextResponse.json({ error: 'Storage is not configured. Set BLOB_READ_WRITE_TOKEN.' }, { status: 503 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }
    if (file.size > CONFIG.maxUploadSize) {
      return NextResponse.json({ error: 'File exceeds the maximum allowed size.' }, { status: 413 });
    }

    const name = file.name || `clip-${Date.now()}`;
    const stored = await storeBlob(file.stream(), name, file.type || 'audio/mpeg');

    return NextResponse.json({ success: true, url: stored.url, size: stored.size, name });
  } catch (error: unknown) {
    const kinded = error as { kind?: string } | null;
    if (kinded?.kind === 'STORAGE') {
      return NextResponse.json({ error: 'Storage is not configured. Set BLOB_READ_WRITE_TOKEN.' }, { status: 503 });
    }
    console.error('Clip store error:', error);
    return NextResponse.json({ error: 'Failed to store the clip.' }, { status: 500 });
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
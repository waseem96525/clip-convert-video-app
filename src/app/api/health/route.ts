import { NextResponse } from 'next/server';
import { blobEnabled } from '@/lib/storage';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    runtime: 'serverless',
    processing: 'browser ffmpeg.wasm',
    storage: blobEnabled() ? 'vercel-blob' : 'not-configured',
  });
}
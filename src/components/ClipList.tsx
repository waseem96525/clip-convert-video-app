'use client';

import Link from 'next/link';
import { formatTime, formatBytes } from '@/lib/config';
import { MdDelete, MdPlayArrow, MdDownload, MdFolder } from 'react-icons/md';
import type { StoredClip } from '@/lib/clipStore';

interface ClipListProps {
  clips: StoredClip[];
  onPreview: (clip: StoredClip) => void;
  onDownload: (clip: StoredClip) => void;
  onDelete: (clip: StoredClip) => void;
}

export default function ClipList({ clips, onPreview, onDownload, onDelete }: ClipListProps) {
  if (clips.length === 0) {
    return (
      <div className="text-center py-12 text-muted">
        <MdFolder className="text-4xl mx-auto mb-3 opacity-50" />
        <p>No clips created yet.</p>
        <Link href="/convert" className="text-indigo-500 hover:underline mt-2 inline-block">Create your first clip</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">My Clips</h2>
        <span className="text-sm text-muted">{clips.length} clip(s)</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {clips.map(clip => (
          <div key={clip.id} className="p-4 bg-card rounded-xl border border-card-border hover:border-indigo-500 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="min-w-0">
                <h4 className="font-semibold text-sm break-words">{clip.name}</h4>
                <p className="text-xs text-muted">{formatTime(clip.startTime)} → {formatTime(clip.endTime)}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => onPreview(clip)} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800" title="Preview">
                  <MdPlayArrow className="text-indigo-500" />
                </button>
                <button onClick={() => onDownload(clip)} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800" title="Download">
                  <MdDownload className="text-green-500" />
                </button>
                <button onClick={() => onDelete(clip)} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800" title="Delete">
                  <MdDelete className="text-red-500" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="px-2 py-0.5 rounded font-mono bg-gray-100 dark:bg-gray-800">{clip.format.toUpperCase()}</span>
              <span>{formatTime(clip.duration)}</span>
              {clip.size > 0 && <span>{formatBytes(clip.size)}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
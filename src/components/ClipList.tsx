'use client';

import Link from 'next/link';
import { formatTime, formatBytes } from '@/lib/config';
import { MdDelete, MdPlayArrow, MdDownload, MdContentCopy, MdOpenInNew, MdAudiotrack } from 'react-icons/md';
import type { StoredClip } from '@/lib/clipStore';

interface ClipListProps {
  clips: StoredClip[];
  onPreview: (clip: StoredClip) => void;
  onDownload: (clip: StoredClip) => void;
  onCopy: (clip: StoredClip) => void;
  onOpen: (clip: StoredClip) => void;
  onDelete: (clip: StoredClip) => void;
}

const FORMAT_STYLES: Record<string, string> = {
  MP3: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  WAV: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  M4A: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400',
  OGG: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  FLAC: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400',
};

export default function ClipList({ clips, onPreview, onDownload, onCopy, onOpen, onDelete }: ClipListProps) {
  if (clips.length === 0) {
    return (
      <div className="text-center py-16 text-muted bg-card border border-card-border rounded-2xl">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 mx-auto mb-4 flex items-center justify-center opacity-80">
          <MdAudiotrack className="text-3xl text-white" />
        </div>
        <p className="font-medium">No clips created yet</p>
        <p className="text-sm mt-1">Convert a video and it will appear here, saved to this browser.</p>
        <Link href="/convert" className="text-indigo-500 hover:underline mt-3 inline-block font-medium">Create your first clip</Link>
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
          <div key={clip.id} className="p-4 bg-card rounded-xl border border-card-border hover:border-indigo-500 transition-colors flex flex-col">
            <div className="flex items-start justify-between mb-3 gap-2">
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold text-sm break-words" title={clip.name}>{clip.name}</h4>
                <p className="text-xs text-muted">{formatTime(clip.startTime)} - {formatTime(clip.endTime)}</p>
                <p className="text-xs text-muted mt-0.5">{clip.createdAt ? new Date(clip.createdAt).toLocaleDateString() : ''}</p>
              </div>
              <span className={`px-2 py-0.5 rounded text-xs font-mono shrink-0 ${FORMAT_STYLES[clip.format.toUpperCase()] || 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
                {clip.format.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted mb-3">
              <span>{formatTime(clip.duration)}</span>
              {clip.size > 0 && <span>{formatBytes(clip.size)}</span>}
            </div>
            <div className="flex items-center gap-1 mt-auto">
              <button onClick={() => onPreview(clip)} className="p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" title="Preview">
                <MdPlayArrow className="text-lg text-indigo-500" />
              </button>
              <button onClick={() => onDownload(clip)} className="p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" title="Download">
                <MdDownload className="text-lg text-green-500" />
              </button>
              <button onClick={() => onCopy(clip)} className="p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" title="Copy URL">
                <MdContentCopy className="text-lg text-blue-500" />
              </button>
              <button onClick={() => onOpen(clip)} className="p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" title="Open in new tab">
                <MdOpenInNew className="text-lg text-purple-500" />
              </button>
              <button onClick={() => onDelete(clip)} className="p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" title="Delete">
                <MdDelete className="text-lg text-red-500" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
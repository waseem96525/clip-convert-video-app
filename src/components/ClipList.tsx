'use client';

import Link from 'next/link';
import { formatTime } from '@/lib/config';
import { MdDelete, MdPlayArrow, MdDownload, MdFolder } from 'react-icons/md';
import toast from 'react-hot-toast';

interface ClipCardProps {
  clip: any;
  onPreview: (clipId: string) => void;
  onDownload: (clipId: string) => void;
  onDelete: (clipId: string) => void;
  onRename: (clipId: string, name: string) => void;
}

function ClipCard({ clip, onPreview, onDownload, onDelete, onRename }: ClipCardProps) {
  const isDone = clip.status === 'completed';
  const isFailed = clip.status === 'failed' || clip.status === 'error';
  const isBusy = !isDone && !isFailed;
  return (
    <div className="p-4 bg-card rounded-xl border border-card-border hover:border-indigo-500 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-sm">{clip.name}</h4>
          <p className="text-xs text-muted">{formatTime(clip.start_time)} → {formatTime(clip.end_time)}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPreview(clip.id)}
            disabled={!isDone}
            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Preview"
          >
            <MdPlayArrow className="text-indigo-500" />
          </button>
          <button
            onClick={() => onDownload(clip.id)}
            disabled={!isDone}
            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Download"
          >
            <MdDownload className="text-green-500" />
          </button>
          <button
            onClick={() => onDelete(clip.id)}
            disabled={isBusy}
            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Delete"
          >
            <MdDelete className="text-red-500" />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted">
        <span className="px-2 py-0.5 rounded font-mono bg-gray-100 dark:bg-gray-800">{clip.format.toUpperCase()}</span>
        <span>{formatTime(clip.duration)}</span>
        {isBusy ? (
          <span className="text-yellow-500">⏳ Processing {clip.progress || 0}%</span>
        ) : isFailed ? (
          <span className="text-red-500">Failed</span>
        ) : clip.file_size > 0 ? (
          <span>{(clip.file_size / 1024).toFixed(1)} KB</span>
        ) : null}
      </div>
    </div>
  );
}

interface ClipListProps {
  clips: any[];
  videoFilename: string;
  onPreview: (clipId: string) => void;
  onDownload: (clipId: string) => void;
  onDelete: (clipId: string) => void;
  onRename: (clipId: string, name: string) => void;
}

export default function ClipList({ clips, videoFilename, onPreview, onDownload, onDelete, onRename }: ClipListProps) {
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
      <p className="text-sm text-muted">Source: {videoFilename}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {clips.map(clip => (
          <ClipCard key={clip.id} clip={clip} onPreview={onPreview} onDownload={onDownload} onDelete={onDelete} onRename={onRename} />
        ))}
      </div>
    </div>
  );
}

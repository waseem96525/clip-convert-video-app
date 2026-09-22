'use client';

import { formatTime, formatBytes } from '@/lib/config';
import { MdMusicNote, MdMovie, MdClose } from 'react-icons/md';

interface VideoInfoCardProps {
  name: string;
  size?: number;
  duration: number;
  hasAudio: boolean | null;
  onDownload: () => void;
  onReset: () => void;
}

export default function VideoInfoCard({ name, size, duration, hasAudio, onDownload, onReset }: VideoInfoCardProps) {
  const audioBadge =
    hasAudio === true
      ? { label: 'Audio track', cls: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' }
      : hasAudio === false
        ? { label: 'No audio track', cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' }
        : { label: 'Detecting audio…', cls: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' };

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center p-3 sm:p-4 bg-card rounded-xl border border-card-border w-full">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
          <MdMovie className="text-xl" />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate" title={name}>{name || 'Video'}</p>
          <p className="text-xs text-muted">
            {size != null && size > 0 ? `${formatBytes(size)} · ` : ''}{duration > 0 ? formatTime(duration) : '…'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap shrink-0">
        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${audioBadge.cls}`}>
          <MdMusicNote />
          {audioBadge.label}
        </span>
        <button
          onClick={onDownload}
          className="px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors min-h-[44px]"
          aria-label="Download the original video"
        >
          Download Video
        </button>
        <button
          onClick={onReset}
          className="px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors min-h-[44px] flex items-center gap-1"
          aria-label="Clear the loaded video"
        >
          <MdClose />
          Clear
        </button>
      </div>
    </div>
  );
}
'use client';

import { useState } from 'react';
import { formatTime } from '@/lib/config';
import { MdArrowBackIos, MdArrowForwardIos } from 'react-icons/md';

interface TimelineProps {
  duration: number;
  startTime: number;
  endTime: number;
  currentTime: number;
  onStartTimeChange: (time: number) => void;
  onEndTimeChange: (time: number) => void;
  onSeek: (time: number) => void;
  onSetStart: () => void;
  onSetEnd: () => void;
}

export default function Timeline({
  duration, startTime, endTime, currentTime,
  onStartTimeChange, onEndTimeChange, onSeek, onSetStart, onSetEnd,
}: TimelineProps) {
  const [zoom, setZoom] = useState(1);

  if (duration <= 0) return null;

  const startPercent = (startTime / duration) * 100;
  const endPercent = (endTime / duration) * 100;
  const currentPercent = (currentTime / duration) * 100;
  const selectedWidth = endPercent - startPercent;

  return (
    <div className="space-y-3 p-3 sm:p-4 bg-card rounded-xl border border-card-border w-full">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Trim Timeline</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom(z => Math.min(z * 1.5, 10))} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 min-w-[40px] min-h-[40px] flex items-center justify-center">
            <MdArrowForwardIos className="text-sm" />
          </button>
          <span className="text-xs text-muted w-10 text-center">{zoom.toFixed(1)}x</span>
          <button onClick={() => setZoom(z => Math.max(z / 1.5, 1))} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 min-w-[40px] min-h-[40px] flex items-center justify-center">
            <MdArrowBackIos className="text-sm" />
          </button>
        </div>
      </div>

      <div
        className="relative h-12 sm:h-16 bg-gray-100 dark:bg-gray-800 rounded-lg cursor-pointer overflow-hidden touch-manipulation"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = (e.clientX - rect.left) / rect.width;
          onSeek(ratio * duration);
        }}
      >
        {/* Selected region */}
        <div
          className="absolute top-1 bottom-1 bg-indigo-500/30 border border-indigo-500 rounded-lg"
          style={{ left: `${startPercent}%`, width: `${selectedWidth}%` }}
        >
          {/* Start handle */}
          <div
            className="absolute left-0 top-0 bottom-0 w-8 bg-indigo-500 rounded-l-lg cursor-ew-resize timeline-handle flex items-center justify-center"
            onClick={(e) => { e.stopPropagation(); onSetStart(); }}
          >
            <span className="text-white text-xs font-bold">▶</span>
          </div>
          {/* End handle */}
          <div
            className="absolute right-0 top-0 bottom-0 w-8 bg-indigo-500 rounded-r-lg cursor-ew-resize timeline-handle flex items-center justify-center"
            onClick={(e) => { e.stopPropagation(); onSetEnd(); }}
          >
            <span className="text-white text-xs font-bold">◀</span>
          </div>
          {/* Selected label */}
          <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-indigo-700 dark:text-indigo-300 pointer-events-none">
            {formatTime(endTime - startTime)}
          </div>
        </div>

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
          style={{ left: `${currentPercent}%` }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted block mb-1">Start Time</label>
          <input
            type="text"
            value={formatTime(startTime)}
            onChange={(e) => onStartTimeChange(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2.5 bg-input border border-input-border rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[44px]"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted block mb-1">End Time</label>
          <input
            type="text"
            value={formatTime(endTime)}
            onChange={(e) => onEndTimeChange(parseFloat(e.target.value) || duration)}
            className="w-full px-3 py-2.5 bg-input border border-input-border rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[44px]"
          />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={onSetStart}
          className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors min-h-[44px]"
        >
          ◀ Set Start
        </button>
        <button
          onClick={onSetEnd}
          className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors min-h-[44px]"
        >
          Set End ▶
        </button>
        <button
          onClick={() => { onStartTimeChange(0); onEndTimeChange(duration); }}
          className="px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors min-h-[44px]"
        >
          Reset
        </button>
      </div>

      <div className="flex items-center justify-between text-xs text-muted">
        <span>00:00</span>
        <span>Duration: {formatTime(duration)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}

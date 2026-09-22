'use client';

import { useState } from 'react';
import { formatTime, parseTimeToSeconds } from '@/lib/config';
import { MdKeyboardArrowDown, MdKeyboardArrowUp } from 'react-icons/md';

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

const STEP = 5;

export default function Timeline({
  duration, startTime, endTime, currentTime,
  onStartTimeChange, onEndTimeChange, onSeek, onSetStart, onSetEnd,
}: TimelineProps) {
  const [zoom, setZoom] = useState(1);

  if (duration <= 0) return null;

  const clampedDuration = Math.max(duration, 0.001);
  const startPercent = Math.max(0, (startTime / clampedDuration) * 100);
  const endPercent = Math.min(100, (endTime / clampedDuration) * 100);
  const currentPercent = Math.min(100, Math.max(0, (currentTime / clampedDuration) * 100));
  const selectedWidth = Math.max(0, endPercent - startPercent);

  const tickStep = zoom > 8 ? 1 : zoom > 3 ? 5 : 15;
  const tickCount = Math.min(Math.floor(duration / tickStep), 80);
  const ticks = Array.from({ length: tickCount }, (_, i) => (i + 1) * tickStep);

  return (
    <div className="space-y-3 p-3 sm:p-4 bg-card rounded-xl border border-card-border w-full">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Trim Timeline</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom(z => Math.min(z * 1.5, 10))}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 min-w-[40px] min-h-[40px] flex items-center justify-center"
            aria-label="Zoom in"
            title="Zoom in"
          >
            <MdKeyboardArrowUp className="text-lg" />
          </button>
          <span className="text-xs text-muted w-10 text-center">{zoom.toFixed(1)}x</span>
          <button
            onClick={() => setZoom(z => Math.max(z / 1.5, 1))}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 min-w-[40px] min-h-[40px] flex items-center justify-center"
            aria-label="Zoom out"
            title="Zoom out"
          >
            <MdKeyboardArrowDown className="text-lg" />
          </button>
        </div>
      </div>

      <div
        className="relative h-12 sm:h-16 bg-gray-100 dark:bg-gray-800 rounded-lg cursor-pointer overflow-hidden touch-manipulation"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = (e.clientX - rect.left) / rect.width;
          onSeek(Math.min(duration, Math.max(0, ratio * duration)));
        }}
      >
        {/* Tick marks */}
        <div className="absolute inset-0 pointer-events-none">
          {ticks.map((t) => (
            <div
              key={t}
              className="absolute top-0 bottom-0 w-px bg-gray-300 dark:bg-gray-700"
              style={{ left: `${(t / clampedDuration) * 100}%`, opacity: 0.4 }}
            />
          ))}
        </div>

        {/* Selected region */}
        <div
          className="absolute top-1 bottom-1 bg-indigo-500/30 border border-indigo-500 rounded-lg z-[5]"
          style={{ left: `${startPercent}%`, width: `${selectedWidth}%` }}
        >
          <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-indigo-700 dark:text-indigo-300 pointer-events-none">
            {formatTime(endTime - startTime)}
          </div>
        </div>

        {/* Start handle */}
        <div
          className="absolute left-0 top-0 bottom-0 w-6 sm:w-8 bg-indigo-600 rounded-l-lg cursor-ew-resize timeline-handle flex flex-col items-center justify-center z-10"
          onClick={(e) => { e.stopPropagation(); onSetStart(); }}
          title="Use current time as start"
        >
          <span className="text-white text-[10px] font-bold tracking-tighter">START</span>
        </div>
        {/* End handle */}
        <div
          className="absolute right-0 top-0 bottom-0 w-6 sm:w-8 bg-indigo-600 rounded-r-lg cursor-ew-resize timeline-handle flex flex-col items-center justify-center z-10"
          onClick={(e) => { e.stopPropagation(); onSetEnd(); }}
          title="Use current time as end"
        >
          <span className="text-white text-[10px] font-bold tracking-tighter">END</span>
        </div>

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
          style={{ left: `${currentPercent}%` }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted block mb-1">Start Time ({formatTime(startTime)})</label>
          <input
            type="text"
            defaultValue={formatTime(startTime)}
            key={`start-${startTime.toFixed(3)}`}
            onBlur={(e) => {
              const v = parseTimeToSeconds(e.target.value);
              if (!isNaN(v)) onStartTimeChange(Math.max(0, v));
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            placeholder="MM:SS or 00:MM:SS.mmm"
            className="w-full px-3 py-2.5 bg-input border border-input-border rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[44px]"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted block mb-1">End Time ({formatTime(endTime)})</label>
          <input
            type="text"
            defaultValue={formatTime(endTime)}
            key={`end-${endTime.toFixed(3)}`}
            onBlur={(e) => {
              const v = parseTimeToSeconds(e.target.value);
              if (!isNaN(v)) onEndTimeChange(Math.min(duration, Math.max(0, v)));
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            placeholder="MM:SS or 00:MM:SS.mmm"
            className="w-full px-3 py-2.5 bg-input border border-input-border rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[44px]"
          />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => onStartTimeChange(Math.max(0, startTime - STEP))}
          className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors min-h-[44px]"
          aria-label="Move start earlier"
        >
          Start -{STEP}s
        </button>
        <button
          onClick={onSetStart}
          className="flex-1 py-3 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors min-h-[44px]"
          aria-label="Set start to current time"
        >
          Set Start
        </button>
        <button
          onClick={onSetEnd}
          className="flex-1 py-3 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors min-h-[44px]"
          aria-label="Set end to current time"
        >
          Set End
        </button>
        <button
          onClick={() => onEndTimeChange(Math.min(duration, endTime + STEP))}
          className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors min-h-[44px]"
          aria-label="Move end later"
        >
          End +{STEP}s
        </button>
        <button
          onClick={() => { onStartTimeChange(0); onEndTimeChange(duration); }}
          className="px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors min-h-[44px]"
          aria-label="Select whole video"
        >
          Whole Video
        </button>
      </div>

      <div className="flex items-center justify-between text-xs text-muted">
        <span>In: {formatTime(startTime)}</span>
        <span>Duration: {formatTime(duration)}</span>
        <span>Out: {formatTime(endTime)}</span>
      </div>
    </div>
  );
}
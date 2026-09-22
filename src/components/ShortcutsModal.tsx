'use client';

import { useEffect } from 'react';
import { MdClose } from 'react-icons/md';

interface Shortcut {
  keys: string[];
  label: string;
}

const SHORTCUTS: Shortcut[] = [
  { keys: ['Space'], label: 'Play / pause' },
  { keys: ['I'], label: 'Set clip start time' },
  { keys: ['O'], label: 'Set clip end time' },
  { keys: ['←'], label: 'Step back 5 seconds' },
  { keys: ['→'], label: 'Step forward 5 seconds' },
];

interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ShortcutsModal({ open, onClose }: ShortcutsModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div
        className="w-full max-w-md bg-background text-foreground rounded-2xl border border-card-border shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-card-border">
          <h2 className="text-lg font-bold">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close shortcuts"
          >
            <MdClose className="text-xl" />
          </button>
        </div>
        <div className="p-5 space-y-2">
          {SHORTCUTS.map((shortcut) => (
            <div key={shortcut.label} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-muted">{shortcut.label}</span>
              <span className="flex gap-1">
                {shortcut.keys.map((key) => (
                  <kbd
                    key={key}
                    className={`px-2 py-1 rounded border text-xs font-mono ${shortcut.keys.length > 1 ? 'bg-gray-100 dark:bg-gray-800 border-card-border' : ''}`}
                  >
                    {key}
                  </kbd>
                ))}
              </span>
            </div>
          ))}
          <p className="text-xs text-muted pt-3 border-t border-card-border">Shortcuts work after a video is loaded. Tip: play the video, then press I and O to set the clip boundaries at the current time.</p>
        </div>
      </div>
    </div>
  );
}
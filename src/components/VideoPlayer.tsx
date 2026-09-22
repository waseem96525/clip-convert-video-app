'use client';

import { useVideo } from '@/hooks/useVideo';
import { formatTime } from '@/lib/config';
import {
  MdPlayArrow,
  MdPause,
  MdVolumeUp,
  MdVolumeOff,
  MdFastRewind,
  MdFastForward,
  MdFullscreen,
  MdFullscreenExit,
} from 'react-icons/md';

interface VideoPlayerProps {
  src: string;
}

export default function VideoPlayer({ src }: VideoPlayerProps) {
  const {
    videoRef, duration, currentTime, isPlaying, volume, isLoading, error,
    play, pause, seek, setVolume,
  } = useVideo();

  const skip = (delta: number) => seek(Math.min(Math.max(0, currentTime + delta), duration || 0));

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;
    const asFullscreen = video as HTMLVideoElement & { webkitRequestFullscreen?: () => void };
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else if (video.requestFullscreen) {
      void video.requestFullscreen();
    } else {
      asFullscreen.webkitRequestFullscreen?.();
    }
  };

  if (!src) return null;

  return (
    <div className="space-y-3 w-full">
      <div className="relative bg-black rounded-xl overflow-hidden w-full aspect-video">
        <video
          ref={videoRef}
          src={src}
          className="w-full h-full object-contain"
        />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none">
            <div className="animate-spin w-12 h-12 rounded-full border-4 border-white/20 border-t-indigo-500" aria-label="Loading video" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-900/50 text-white text-sm px-4 text-center pointer-events-none">
            {error}
          </div>
        )}
        {/* Click anywhere to toggle play */}
        <button
          onClick={isPlaying ? pause : play}
          className="absolute inset-0 w-full h-full opacity-0 focus:opacity-100"
          aria-label="Toggle playback"
        />
      </div>

      {/* Touch-friendly controls */}
      <div className="flex items-center gap-2 sm:gap-3 touch-manipulation">
        <button
          onClick={() => skip(-5)}
          className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700 active:bg-gray-400 active:text-white transition-colors"
          title="Back 5 seconds"
          aria-label="Back 5 seconds"
        >
          <MdFastRewind className="text-xl" />
        </button>
        <button onClick={isPlaying ? pause : play} className="min-w-[52px] min-h-[52px] flex items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-md" aria-label={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? <MdPause className="text-2xl" /> : <MdPlayArrow className="text-2xl" />}
        </button>
        <button
          onClick={() => skip(5)}
          className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700 active:bg-gray-400 active:text-white transition-colors"
          title="Forward 5 seconds"
          aria-label="Forward 5 seconds"
        >
          <MdFastForward className="text-xl" />
        </button>

        <div className="flex-1">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={(e) => seek(parseFloat(e.target.value))}
            className="w-full h-2 min-h-[44px] cursor-pointer accent-indigo-600"
          />
        </div>
        <span className="text-xs font-mono w-24 text-right hidden sm:block">{formatTime(currentTime)} / {formatTime(duration)}</span>

        <button onClick={() => setVolume(volume > 0 ? 0 : 1)} className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700 active:bg-gray-400 active:text-white transition-colors" aria-label="Toggle mute" title="Mute">
          {volume > 0 ? <MdVolumeUp /> : <MdVolumeOff />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-16 h-2 min-h-[44px] cursor-pointer accent-indigo-600 hidden sm:block"
          aria-label="Volume"
        />
        <button onClick={toggleFullscreen} className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700 active:bg-gray-400 active:text-white transition-colors" aria-label="Fullscreen" title="Fullscreen">
          {document.fullscreenElement ? <MdFullscreenExit /> : <MdFullscreen />}
        </button>
      </div>
    </div>
  );
}
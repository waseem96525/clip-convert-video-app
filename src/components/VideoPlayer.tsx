'use client';

import { useVideo } from '@/hooks/useVideo';
import { formatTime } from '@/lib/config';
import { MdPlayArrow, MdPause, MdVolumeUp, MdVolumeOff } from 'react-icons/md';

interface VideoPlayerProps {
  src: string;
}

export default function VideoPlayer({ src }: VideoPlayerProps) {
  const {
    videoRef, duration, currentTime, isPlaying, volume, isLoading, error,
    play, pause, seek, setVolume,
  } = useVideo();

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
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="animate-spin text-4xl text-white">⟳</div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-900/50 text-white text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Touch-friendly controls */}
      <div className="flex items-center gap-2 sm:gap-3 touch-manipulation">
        <button onClick={isPlaying ? pause : play} className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-full bg-gray-800 text-white hover:bg-gray-700 active:bg-gray-600 transition-colors">
          {isPlaying ? <MdPause className="text-xl" /> : <MdPlayArrow className="text-xl" />}
        </button>
        <div className="flex-1">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={(e) => seek(parseFloat(e.target.value))}
            className="w-full h-2 min-h-[44px] cursor-pointer"
          />
        </div>
        <span className="text-xs font-mono w-20 text-right hidden sm:block">{formatTime(currentTime)} / {formatTime(duration)}</span>
        <button onClick={() => setVolume(volume > 0 ? 0 : 1)} className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-full bg-gray-800 text-white hover:bg-gray-700 active:bg-gray-600 transition-colors">
          {volume > 0 ? <MdVolumeUp /> : <MdVolumeOff />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-16 h-2 min-h-[44px] cursor-pointer hidden sm:block"
        />
      </div>
    </div>
  );
}

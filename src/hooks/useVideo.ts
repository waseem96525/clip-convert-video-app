import { useState, useRef, useCallback, useEffect } from 'react';

interface UseVideoReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  src: string;
  setSrc: (src: string) => void;
  duration: number;
  setDuration: (d: number) => void;
  currentTime: number;
  setCurrentTime: (t: number) => void;
  isPlaying: boolean;
  volume: number;
  isLoading: boolean;
  error: string | null;
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  setVolume: (v: number) => void;
  playRange: (from: number, to: number) => void;
  loadVideo: (url: string) => void;
  clearVideo: () => void;
}

export function useVideo(): UseVideoReturn {
  const videoRef = useRef<HTMLVideoElement>(null!);
  const [src, setSrc] = useState('');
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const play = useCallback(() => {
    videoRef.current?.play().catch(() => {});
  }, []);

  const pause = useCallback(() => {
    videoRef.current?.pause();
  }, []);

  const seek = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(time, duration));
      setCurrentTime(videoRef.current.currentTime);
    }
  }, [duration]);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    if (videoRef.current) videoRef.current.volume = v;
  }, []);

  const playRange = useCallback((from: number, to: number) => {
    const video = videoRef.current;
    if (!video) return;
    const end = Math.min(to, video.duration || to);
    if (!(end > from) || !isFinite(end)) {
      video.currentTime = Math.max(0, from);
      video.play().catch(() => {});
      setCurrentTime(video.currentTime);
      return;
    }

    const cleanup = () => {
      video.removeEventListener('timeupdate', stopAtEnd);
      video.removeEventListener('pause', cleanup);
      video.removeEventListener('ended', cleanup);
    };
    const stopAtEnd = () => {
      if (video.currentTime >= end) {
        video.pause();
        setCurrentTime(video.currentTime);
        cleanup();
      }
    };
    video.addEventListener('timeupdate', stopAtEnd);
    video.addEventListener('pause', cleanup, { once: true });
    video.addEventListener('ended', cleanup, { once: true });
    video.currentTime = Math.max(0, from);
    video.play().catch(() => {});
    setCurrentTime(video.currentTime);
  }, []);

  const loadVideo = useCallback((url: string) => {
    setSrc(url);
    setIsLoading(true);
    setError(null);
  }, []);

  const clearVideo = useCallback(() => {
    setSrc('');
    setDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);
    setError(null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
    };

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);
    const onError = () => {
      setError('Failed to load video.');
      setIsLoading(false);
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);
    video.addEventListener('error', onError);

    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('error', onError);
    };
  }, [src]);

  return {
    videoRef,
    src,
    setSrc,
    duration,
    setDuration,
    currentTime,
    setCurrentTime,
    isPlaying,
    volume,
    isLoading,
    error,
    play,
    pause,
    seek,
    setVolume,
    playRange,
    loadVideo,
    clearVideo,
  };
}

export function useKeyboard(shortcuts: {
  onPlayPause?: () => void;
  onSetStart?: () => void;
  onSetEnd?: () => void;
  onStepBack?: () => void;
  onStepForward?: () => void;
  enabled: boolean;
}) {
  useEffect(() => {
    if (!shortcuts.enabled) return;

    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          shortcuts.onPlayPause?.();
          break;
        case 'i':
          shortcuts.onSetStart?.();
          break;
        case 'o':
          shortcuts.onSetEnd?.();
          break;
        case 'arrowleft':
          e.preventDefault();
          shortcuts.onStepBack?.();
          break;
        case 'arrowright':
          e.preventDefault();
          shortcuts.onStepForward?.();
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts]);
}

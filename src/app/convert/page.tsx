'use client';

import { useState, useCallback, useSyncExternalStore } from 'react';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useVideo, useKeyboard } from '@/hooks/useVideo';
import { AudioSettings } from '@/types';
import { formatTime, sanitizeFilename, generateId } from '@/lib/config';
import { validateClipTimes, validateFile } from '@/lib/validators';
import { probeVideo, convertAudio } from '@/lib/media';
import { getStoredClips, subscribeClips, saveStoredClip, removeStoredClip, StoredClip } from '@/lib/clipStore';
import toast from 'react-hot-toast';
import { safeJson } from '@/lib/clientHttp';
import { MdUpload, MdLink } from 'react-icons/md';
import Navbar from '@/components/Navbar';
import UploadArea from '@/components/UploadArea';
import VideoPlayer from '@/components/VideoPlayer';
import Timeline from '@/components/Timeline';
import AudioSettingsPanel from '@/components/AudioSettingsPanel';

interface UrlFetchResponse {
  success?: boolean;
  error?: string;
  video?: { id?: string; name?: string; url: string; size?: number; duration?: number };
}

interface ClipSaveResponse {
  success?: boolean;
  error?: string;
  url?: string;
  size?: number;
  name?: string;
}

const defaultAudioSettings: AudioSettings = {
  format: 'mp3',
  bitrate: '192k',
  sampleRate: 'original',
  channels: 'stereo',
  normalize: false,
  fadeIn: 0,
  fadeOut: 0,
  volume: 0,
};

export default function ConvertPage() {
  const { isDark } = useDarkMode();
  const { src, setSrc, duration, setDuration, currentTime, play, pause, seek } = useVideo();
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(defaultAudioSettings);
  const [clipName, setClipName] = useState('');
  const clips = useSyncExternalStore(subscribeClips, getStoredClips, getStoredClips);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [inputName, setInputName] = useState('');
  const [hasAudio, setHasAudio] = useState<boolean | null>(null);

  useKeyboard({
    onPlayPause: () => { if (src) play(); },
    onSetStart: () => setStartTime(currentTime),
    onSetEnd: () => setEndTime(currentTime),
    onStepBack: () => seek(Math.max(0, currentTime - 5)),
    onStepForward: () => seek(Math.min(duration, currentTime + 5)),
    enabled: !!src,
  });

  const probeAndLoad = useCallback(async (source: string) => {
    try {
      const info = await probeVideo(source);
      if (info.duration > 0) setDuration(info.duration);
      setHasAudio(info.hasAudio);
      if (info.hasAudio) {
        toast.success('Audio track detected', { id: 'audio-info' });
      } else {
        toast.error('This video has no audio track, so no audio can be extracted.', { id: 'audio-info' });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not read video metadata.', { id: 'audio-info' });
    }
  }, [setDuration]);

  const handleFileUpload = useCallback(async (file: File) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      toast.error(validation.error!);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setInputName(file.name);
    setHasAudio(null);
    setStartTime(0);
    setEndTime(0);
    setSrc(objectUrl);
    toast.success('Video loaded', { id: 'load' });
    void probeAndLoad(objectUrl);
  }, [setSrc, probeAndLoad]);

  const handleUrlSubmit = useCallback(async () => {
    if (!urlInput.trim()) { toast.error('Please enter a URL', { id: 'url' }); return; }
    try {
      toast.loading('Fetching video...', { id: 'url' });
      const res = await fetch('/api/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      const data = (await safeJson<UrlFetchResponse>(res)) || ({} as UrlFetchResponse);
      if (!res.ok) throw new Error(data.error || `Failed to fetch video (${res.status}).`);
      const fetchedVideo = data.video;
      if (!fetchedVideo?.url) throw new Error('The server did not return a video URL.');
      toast.success('Video fetched!', { id: 'url' });
      setInputName(fetchedVideo.name || 'fetched-video');
      setHasAudio(null);
      setStartTime(0);
      setEndTime(0);
      setSrc(fetchedVideo.url);
      void probeAndLoad(fetchedVideo.url);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to fetch video', { id: 'url' });
    }
  }, [urlInput, setSrc, probeAndLoad]);

  const setStartAtCurrent = useCallback(() => {
    const video = document.querySelector('video') as HTMLVideoElement;
    if (video) setStartTime(video.currentTime);
  }, []);

  const setEndAtCurrent = useCallback(() => {
    const video = document.querySelector('video') as HTMLVideoElement;
    if (video) setEndTime(video.currentTime);
  }, []);

  const downloadClip = useCallback(async (clip: StoredClip) => {
    try {
      const res = await fetch(clip.url);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${clip.name || 'clip'}.${clip.format}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast.success('Download started!');
    } catch {
      toast.error('Could not download clip.');
    }
  }, []);

  const deleteClip = useCallback(async (clip: StoredClip) => {
    removeStoredClip(clip.id);
    if (clip.url.startsWith('http')) {
      fetch('/api/url', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: clip.url }) }).catch(() => {});
    }
  }, []);

  const validateAndCreate = useCallback(async () => {
    if (!src) return;
    if (hasAudio === false) {
      toast.error('This video has no audio track, so no audio can be extracted.', { id: 'convert' });
      return;
    }
    const validation = validateClipTimes(startTime, endTime);
    if (validation) {
      toast.error(validation, { id: 'convert' });
      return;
    }
    if (endTime <= startTime) {
      toast.error('Set a start and end time for the clip.', { id: 'convert' });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setProgressMsg('Loading audio engine…');
    try {
      toast.loading('Preparing conversion…', { id: 'convert' });
      const input = await fetch(src).then(r => {
        if (!r.ok) throw new Error('Could not load video data.');
        return r.blob();
      });
      setProgressMsg('Extracting audio…');
      const { blob, size } = await convertAudio(input, {
        startTime,
        endTime,
        settings: audioSettings,
        onProgress: (r) => setProgress(Math.round(r * 100)),
      });

      setProgressMsg('Saving clip…');
      setProgress(95);

      const ext = audioSettings.format;
      const name = (clipName.trim() ? sanitizeFilename(clipName) : `clip-${Date.now()}`) || 'clip';
      const form = new FormData();
      form.append('file', blob, `${name}.${ext}`);
      const res = await fetch('/api/clip', { method: 'POST', body: form });
      const data = (await safeJson<ClipSaveResponse>(res)) || ({} as ClipSaveResponse);
      if (!res.ok) throw new Error(data.error || 'Failed to save the clip.');
      if (!data.url) throw new Error('The server did not return a clip URL.');

      toast.dismiss('convert');
      const clip: StoredClip = {
        id: generateId(),
        name,
        url: data.url,
        format: ext,
        bitrate: audioSettings.bitrate,
        size: data.size || size,
        startTime,
        endTime,
        duration: endTime - startTime,
        createdAt: new Date().toISOString(),
      };
      saveStoredClip(clip);
      setClipName('');
      toast.success('Clip created!', { id: 'done' });
    } catch (err: unknown) {
      console.error('Conversion error:', err);
      toast.error(err instanceof Error ? err.message : 'Conversion failed.', { id: 'convert' });
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setProgressMsg('');
    }
  }, [src, hasAudio, startTime, endTime, audioSettings, clipName]);

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <Navbar />
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">Video to Audio</h1>
          <p className="text-sm sm:text-base text-muted">Upload a video or paste a direct video URL, trim the section you want, and extract high-quality audio right in your browser.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setActiveTab('upload')} className={`px-4 py-3 rounded-lg font-medium transition-colors text-sm min-h-[44px] ${activeTab === 'upload' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
            <MdUpload className="inline mr-2" />Upload File
          </button>
          <button onClick={() => setActiveTab('url')} className={`px-4 py-3 rounded-lg font-medium transition-colors text-sm min-h-[44px] ${activeTab === 'url' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
            <MdLink className="inline mr-2" />Video URL
          </button>
        </div>

        {activeTab === 'upload' && <div className="mb-4"><UploadArea onUpload={handleFileUpload} onUrlClick={() => setActiveTab('url')} /></div>}

        {activeTab === 'url' && (
          <div className="mb-4 space-y-3">
            <div className="flex gap-2 flex-col sm:flex-row">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/video.mp4"
                className="flex-1 px-4 py-3 bg-input border border-input-border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[44px]"
              />
              <button onClick={handleUrlSubmit} disabled={isProcessing} className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors min-h-[44px] whitespace-nowrap">Fetch Video</button>
            </div>
            <p className="text-xs text-orange-500">Direct video file links only (.mp4/.webm/.mov). Video pages such as YouTube/Pexels are not supported in this build.</p>
          </div>
        )}

        {src && (
          <div className="space-y-4 animate-fade-in">
            <VideoPlayer src={src} />
            <Timeline
              duration={duration}
              startTime={startTime}
              endTime={endTime}
              currentTime={currentTime}
              onStartTimeChange={setStartTime}
              onEndTimeChange={setEndTime}
              onSeek={seek}
              onSetStart={setStartAtCurrent}
              onSetEnd={setEndAtCurrent}
            />
          </div>
        )}

        {!src && (
          <div className="flex items-center justify-center h-48 sm:h-64 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600">
            <p className="text-muted text-lg">No video loaded</p>
          </div>
        )}

        {src && (
          <div className="space-y-4">
            <input
              type="text"
              value={clipName}
              onChange={(e) => setClipName(e.target.value)}
              placeholder="Clip name (e.g., Intro)"
              className="w-full px-4 py-3 bg-input border border-input-border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
            />
            <AudioSettingsPanel settings={audioSettings} onChange={setAudioSettings} />
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => { play(); pause(); setTimeout(play, 100); }} className="px-6 py-3 bg-gray-200 dark:bg-gray-700 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors min-h-[48px]">▶ Preview Clip</button>
              <button onClick={validateAndCreate} disabled={isProcessing || hasAudio === null} className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[48px]">
                {isProcessing ? `Processing… ${progress}%` : '🎵 CREATE AUDIO CLIP'}
              </button>
            </div>
            <p className="text-xs text-muted">{inputName}</p>
          </div>
        )}

        {isProcessing && (
          <div className="space-y-3 p-4 bg-card rounded-xl border border-card-border animate-fade-in">
            <div className="flex items-center justify-between text-sm">
              <span>{progressMsg}</span>
              <span className="font-mono">{progress}%</span>
            </div>
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {clips.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Created Clips ({clips.length})</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {clips.map(clip => (
                <div key={clip.id} className="p-4 bg-card rounded-xl border border-card-border">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm truncate">{clip.name}</h4>
                    <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded whitespace-nowrap">✓ Ready</span>
                  </div>
                  <p className="text-xs text-muted mb-2 truncate">{formatTime(clip.startTime)} – {formatTime(clip.endTime)} · {clip.format.toUpperCase()} · {clip.bitrate}</p>
                  <div className="flex gap-2">
                    <button onClick={() => downloadClip(clip)} className="flex-1 px-3 py-3 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 transition-colors min-h-[44px]">Download</button>
                    <button onClick={() => deleteClip(clip)} className="flex-1 px-3 py-3 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 transition-colors min-h-[44px]">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
'use client';

import { useState, useCallback } from 'react';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useVideo } from '@/hooks/useVideo';
import { useKeyboard } from '@/hooks/useVideo';
import { AudioSettings } from '@/types';
import { CONFIG, formatTime } from '@/lib/config';
import { validateClipTimes } from '@/lib/validators';
import toast from 'react-hot-toast';
import { MdUpload, MdLink, MdWarning } from 'react-icons/md';
import Navbar from '@/components/Navbar';
import UploadArea from '@/components/UploadArea';
import VideoPlayer from '@/components/VideoPlayer';
import Timeline from '@/components/Timeline';
import AudioSettingsPanel from '@/components/AudioSettingsPanel';

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
  const { src, setSrc, duration, setDuration, currentTime, setCurrentTime, play, pause, seek, setVolume } = useVideo();
  const [videoId, setVideoId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(defaultAudioSettings);
  const [clipName, setClipName] = useState('');
  const [clips, setClips] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState('');

  useKeyboard({
    onPlayPause: () => { if (src) play(); },
    onSetStart: () => setStartTime(currentTime),
    onSetEnd: () => setEndTime(currentTime),
    onStepBack: () => seek(Math.max(0, currentTime - 5)),
    onStepForward: () => seek(Math.min(duration, currentTime + 5)),
    enabled: !!src,
  });

  const handleFileUpload = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      toast.loading('Uploading...', { id: 'upload' });
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Video uploaded!', { id: 'upload' });
      setVideoId(data.video.id);
      setSrc(data.video.filepath);
      setDuration(data.video.duration);
      setStartTime(0);
      setEndTime(data.video.duration);
      setClips([]);
      setClipName('');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed', { id: 'upload' });
    }
  }, []);

  const handleUrlSubmit = useCallback(async () => {
    if (!urlInput.trim()) { toast.error('Please enter a URL'); return; }
    try {
      toast.loading('Fetching video...', { id: 'url' });
      const res = await fetch('/api/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Video fetched!', { id: 'url' });
      setVideoId(data.video.id);
      setSrc(data.video.filepath);
      setDuration(data.video.duration);
      setStartTime(0);
      setEndTime(data.video.duration);
      setClips([]);
      setClipName('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch video', { id: 'url' });
    }
  }, [urlInput]);

  const setStartAtCurrent = useCallback(() => {
    const video = document.querySelector('video') as HTMLVideoElement;
    if (video) setStartTime(video.currentTime);
  }, []);

  const setEndAtCurrent = useCallback(() => {
    const video = document.querySelector('video') as HTMLVideoElement;
    if (video) setEndTime(video.currentTime);
  }, []);

  const validateAndCreate = useCallback(async () => {
    const error = validateClipTimes(startTime, endTime);
    if (error) { toast.error(error); return; }
    if (!clipName.trim()) { toast.error('Please enter a clip name'); return; }
    if (duration <= 0) { toast.error('Video not loaded'); return; }
    if (startTime < 0 || endTime > duration) { toast.error('Time out of range'); return; }
    setIsProcessing(true);
    setProgress(0);
    setProgressMsg('Preparing video...');
    try {
      const res = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, name: clipName.trim(), startTime, endTime, audioSettings }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProgress(100);
      setProgressMsg('Complete!');
      toast.success('Clip created!', { id: 'process' });
      const clipRes = await fetch(`/api/clip?id=${data.clipId}`);
      const clipData = await clipRes.json();
      setClips(prev => [...prev, clipData.clip]);
      setClipName('');
    } catch (err: any) {
      toast.error(err.message || 'Processing failed', { id: 'process' });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProgress(0), 2000);
    }
  }, [videoId, clipName, startTime, endTime, audioSettings, duration]);

  const downloadClip = useCallback(async (clipId: string) => {
    const clip = clips.find(c => c.id === clipId);
    const name = clip?.name || 'clip';
    const res = await fetch(`/api/download?id=${clipId}&name=${encodeURIComponent(name)}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${name}.${clip?.format || 'mp3'}`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('Download started!');
  }, [clips]);

  const deleteClip = useCallback(async (clipId: string) => {
    try {
      await fetch(`/api/clip?id=${clipId}`, { method: 'DELETE' });
      setClips(prev => prev.filter(c => c.id !== clipId));
      toast.success('Clip deleted');
    } catch (err: any) { toast.error(err.message); }
  }, []);

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <Navbar />
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">Video to Audio</h1>
          <p className="text-sm sm:text-base text-muted">Upload a video or paste a URL, trim the section you want, and extract high-quality audio.</p>
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

        {/* Upload Tab */}
        {activeTab === 'upload' && <div className="mb-4"><UploadArea onUpload={handleFileUpload} onUrlClick={() => setActiveTab('url')} /></div>}

        {/* URL Tab */}
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
              <button onClick={handleUrlSubmit} className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors min-h-[44px] whitespace-nowrap">Fetch Video</button>
            </div>
            <p className="text-xs text-orange-500 flex items-center gap-1"><MdWarning /> Only use URLs for content you have permission to download or process.</p>
            <p className="text-xs text-muted">Supported sources: Public videos, open media repositories, and content where downloading is permitted.</p>
          </div>
        )}

        {/* Video Player */}
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

        {/* Audio Settings */}
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
              <button onClick={validateAndCreate} disabled={isProcessing} className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[48px]">
                {isProcessing ? 'Processing...' : '🎵 CREATE AUDIO CLIP'}
              </button>
            </div>
          </div>
        )}

        {/* Progress */}
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

        {/* Created Clips */}
        {clips.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Created Clips ({clips.length})</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {clips.map(clip => (
                <div key={clip.id} className="p-4 bg-card rounded-xl border border-card-border">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm">{clip.name}</h4>
                    <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded">✓ Ready</span>
                  </div>
                  <p className="text-xs text-muted mb-2">{formatTime(clip.start_time)} – {formatTime(clip.end_time)} · {clip.format.toUpperCase()} · {clip.bitrate}</p>
                  <div className="flex gap-2">
                    <button onClick={() => downloadClip(clip.id)} className="flex-1 px-3 py-3 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 transition-colors min-h-[44px]">Download</button>
                    <button onClick={() => deleteClip(clip.id)} className="flex-1 px-3 py-3 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 transition-colors min-h-[44px]">Delete</button>
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

'use client';

import { useState, useCallback, useSyncExternalStore } from 'react';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useVideo, useKeyboard } from '@/hooks/useVideo';
import { AudioSettings } from '@/types';
import { formatTime, formatBytes, sanitizeFilename, generateId } from '@/lib/config';
import { validateClipTimes, validateFile } from '@/lib/validators';
import { probeVideo, convertAudio } from '@/lib/media';
import { getStoredClips, subscribeClips, saveStoredClip, removeStoredClip, StoredClip } from '@/lib/clipStore';
import { downloadUrl, copyText } from '@/lib/download';
import { getRecentUrls, addRecentUrl, SAMPLE_VIDEO_URL } from '@/lib/urlHistory';
import { estimateClipSize, bitrateLabel } from '@/lib/estimate';
import toast from 'react-hot-toast';
import { safeJson } from '@/lib/clientHttp';
import {
  MdUpload,
  MdLink,
  MdHelpOutline,
  MdDownload,
  MdContentCopy,
  MdOpenInNew,
  MdDelete,
  MdMovie,
} from 'react-icons/md';
import Navbar from '@/components/Navbar';
import UploadArea from '@/components/UploadArea';
import VideoPlayer from '@/components/VideoPlayer';
import VideoInfoCard from '@/components/VideoInfoCard';
import Timeline from '@/components/Timeline';
import AudioSettingsPanel from '@/components/AudioSettingsPanel';
import ShortcutsModal from '@/components/ShortcutsModal';

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

const FORMAT_CHIPS = ['MP3', 'WAV', 'M4A', 'OGG', 'FLAC'];

export default function ConvertPage() {
  const { isDark } = useDarkMode();
  const { src, setSrc, duration, setDuration, currentTime, play, seek, playRange, clearVideo } = useVideo();
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
  const [recentUrls, setRecentUrls] = useState<string[]>(() => getRecentUrls());
  const [inputName, setInputName] = useState('');
  const [inputSize, setInputSize] = useState<number | undefined>(undefined);
  const [hasAudio, setHasAudio] = useState<boolean | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);

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

  const resetSelection = useCallback(() => {
    setStartTime(0);
    setEndTime(0);
    setClipName('');
  }, []);

  const handleResetVideo = useCallback(() => {
    clearVideo();
    setHasAudio(null);
    setInputName('');
    setInputSize(undefined);
    resetSelection();
  }, [clearVideo, resetSelection]);

  const handleFileUpload = useCallback(async (file: File) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      toast.error(validation.error!);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setInputName(file.name);
    setInputSize(file.size);
    setHasAudio(null);
    setStartTime(0);
    setEndTime(0);
    setSrc(objectUrl);
    toast.success('Video loaded locally', { id: 'load' });
    void probeAndLoad(objectUrl);
  }, [setSrc, probeAndLoad]);

  const runFetch = useCallback(async (url: string) => {
    if (!url.trim()) { toast.error('Please enter a URL', { id: 'url' }); return; }
    setIsFetchingUrl(true);
    try {
      toast.loading('Fetching video…', { id: 'url' });
      const res = await fetch('/api/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = (await safeJson<UrlFetchResponse>(res)) || ({} as UrlFetchResponse);
      if (!res.ok) throw new Error(data.error || `Failed to fetch video (${res.status}).`);
      const fetchedVideo = data.video;
      if (!fetchedVideo?.url) throw new Error('The server did not return a video URL.');
      setRecentUrls(addRecentUrl(url.trim()));
      setUrlInput(url.trim());
      toast.success('Video fetched!', { id: 'url' });
      setInputName(fetchedVideo.name || 'fetched-video');
      setInputSize(fetchedVideo.size || undefined);
      setHasAudio(null);
      setStartTime(0);
      setEndTime(0);
      setSrc(fetchedVideo.url);
      void probeAndLoad(fetchedVideo.url);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to fetch video', { id: 'url' });
    } finally {
      setIsFetchingUrl(false);
    }
  }, [setSrc, probeAndLoad]);

  const handleUrlSubmit = useCallback(() => {
    void runFetch(urlInput);
  }, [urlInput, runFetch]);

  const setStartAtCurrent = useCallback(() => {
    const video = document.querySelector('video') as HTMLVideoElement;
    if (video) setStartTime(video.currentTime);
  }, []);

  const setEndAtCurrent = useCallback(() => {
    const video = document.querySelector('video') as HTMLVideoElement;
    if (video) setEndTime(video.currentTime);
  }, []);

  const handleDownloadVideo = useCallback(async () => {
    if (!src) return;
    const name = sanitizeFilename(inputName) || 'video';
    const ok = await downloadUrl(src, name);
    if (ok) toast.success('Video download started!');
    else toast.error('Could not download the video.');
  }, [src, inputName]);

  const handlePreviewClip = useCallback(() => {
    if (!src || !(endTime > startTime)) return;
    playRange(startTime, endTime);
  }, [src, startTime, endTime, playRange]);

  const downloadClip = useCallback(async (clip: StoredClip) => {
    const ok = await downloadUrl(clip.url, `${clip.name || 'clip'}.${clip.format}`);
    if (ok) toast.success('Download started!');
    else toast.error('Could not download clip.');
  }, []);

  const copyClipUrl = useCallback(async (clip: StoredClip) => {
    const ok = await copyText(clip.url);
    if (ok) toast.success('Clip URL copied to clipboard!');
    else toast.error('Could not copy the link.');
  }, []);

  const openClip = useCallback((clip: StoredClip) => {
    const a = document.createElement('a');
    a.href = clip.url;
    a.target = '_blank';
    a.rel = 'noreferrer';
    a.click();
  }, []);

  const deleteClip = useCallback(async (clip: StoredClip) => {
    removeStoredClip(clip.id);
    if (clip.url.startsWith('http')) {
      fetch('/api/url', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: clip.url }) }).catch(() => {});
    }
    toast.success('Clip deleted');
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

  const clipDuration = Math.max(0, endTime - startTime);
  const estimatedMb = estimateClipSize(audioSettings.format, clipDuration, audioSettings);

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <Navbar />
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* Hero */}
        <section className="rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-cyan-500 text-white p-5 sm:p-8 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">Video to Audio Converter</h1>
              <p className="text-sm sm:text-base text-indigo-100">Upload a video or paste a direct video URL, trim the section you want, and extract high-quality audio — all inside your browser.</p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              {FORMAT_CHIPS.map((f) => (
                <span key={f} className="px-2.5 py-1 rounded-lg bg-white/15 backdrop-blur text-xs font-mono font-semibold">{f}</span>
              ))}
            </div>
          </div>
        </section>

        {/* Source */}
        <section className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-3 rounded-xl font-medium transition-colors text-sm min-h-[44px] flex-1 sm:flex-none ${activeTab === 'upload' ? 'bg-indigo-600 text-white shadow' : 'bg-card border border-card-border text-muted hover:border-indigo-400'}`}
            >
              <MdUpload className="inline mr-2 text-lg" />Upload File
            </button>
            <button
              onClick={() => setActiveTab('url')}
              className={`px-4 py-3 rounded-xl font-medium transition-colors text-sm min-h-[44px] flex-1 sm:flex-none ${activeTab === 'url' ? 'bg-indigo-600 text-white shadow' : 'bg-card border border-card-border text-muted hover:border-indigo-400'}`}
            >
              <MdLink className="inline mr-2 text-lg" />Video URL
            </button>
          </div>

          {activeTab === 'upload' && <div><UploadArea onUpload={handleFileUpload} onUrlClick={() => setActiveTab('url')} /></div>}

          {activeTab === 'url' && (
            <div className="space-y-3 bg-card border border-card-border rounded-xl p-3 sm:p-4">
              <div className="flex gap-2 flex-col sm:flex-row">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Paste a direct video link, YouTube URL, or Instagram post URL"
                  className="flex-1 px-4 py-3 bg-input border border-input-border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[44px]"
                />
                <button
                  onClick={handleUrlSubmit}
                  disabled={isProcessing || isFetchingUrl || !urlInput.trim()}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors min-h-[44px] whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isFetchingUrl ? 'Fetching…' : 'Fetch Video'}
                </button>
              </div>

              {recentUrls.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted">Recent:</span>
                  {recentUrls.map((url) => (
                    <button
                      key={url}
                      onClick={() => { setUrlInput(url); void runFetch(url); }}
                      className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors truncate max-w-[220px]"
                      title={url}
                    >
                      {url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 40)}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="text-orange-500">Direct video links (.mp4/.webm/.mov), YouTube links, and Instagram post links are supported.</span>
                <button
                  onClick={() => { setUrlInput(SAMPLE_VIDEO_URL); void runFetch(SAMPLE_VIDEO_URL); }}
                  className="ml-auto px-3 py-1.5 rounded-lg bg-cyan-600/10 text-cyan-600 dark:text-cyan-400 font-medium hover:bg-cyan-600/20 transition-colors"
                >
                  Try a sample video
                </button>
              </div>
            </div>
          )}
        </section>

        {src && (
          <section className="space-y-4 animate-fade-in">
            <VideoInfoCard
              name={inputName}
              size={inputSize}
              duration={duration}
              hasAudio={hasAudio}
              onDownload={handleDownloadVideo}
              onReset={handleResetVideo}
            />
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
          </section>
        )}

        {!src && (
          <section className="flex flex-col items-center justify-center h-48 sm:h-56 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-center px-4">
            <MdMovie className="text-5xl text-gray-400 dark:text-gray-600 mb-3" />
            <p className="text-muted text-lg">No video loaded yet</p>
            <p className="text-xs text-muted mt-1">Upload a video file or fetch one from a direct URL to get started</p>
          </section>
        )}

        {src && (
          <section className="space-y-4 animate-fade-in">
            <AudioSettingsPanel settings={audioSettings} onChange={setAudioSettings} />

            <div className="space-y-3 p-4 sm:p-5 bg-card rounded-xl border border-card-border">
              <div>
                <label className="text-sm font-medium text-muted block mb-1">Clip name (optional)</label>
                <input
                  type="text"
                  value={clipName}
                  onChange={(e) => setClipName(e.target.value)}
                  placeholder={`e.g. Intro — defaults to ${audioSettings.format.toUpperCase()} clip`}
                  className="w-full px-4 py-3 bg-input border border-input-border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[44px]"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handlePreviewClip}
                  disabled={isProcessing || !(endTime > startTime)}
                  className="px-6 py-3.5 bg-gray-200 dark:bg-gray-700 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors min-h-[48px] disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Play only the selected section"
                >
                  Preview Clip
                </button>
                <button
                  onClick={validateAndCreate}
                  disabled={isProcessing || hasAudio === null}
                  className="px-6 py-3.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[48px]"
                >
                  {isProcessing ? `Creating Audio… ${progress}%` : 'Create Audio Clip'}
                </button>
              </div>

              <div className="flex items-center gap-3 flex-wrap text-xs text-muted">
                {clipDuration > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium">
                    Clip: {formatTime(clipDuration)}{estimatedMb > 0 ? ` · ≈ ${estimatedMb.toFixed(1)} MB (${bitrateLabel(audioSettings.bitrate)})` : ''}
                  </span>
                )}
                {hasAudio === false && <span className="text-amber-600 dark:text-amber-400">This video has no audio track — create is disabled.</span>}
                {hasAudio === null && src && <span className="text-muted">Detecting audio track…</span>}
                <span className="ml-auto">{inputName}{inputSize ? ` · ${formatBytes(inputSize)}` : ''}</span>
              </div>
            </div>
          </section>
        )}

        {isProcessing && (
          <section className="space-y-3 p-4 bg-card rounded-xl border border-card-border animate-fade-in">
            <div className="flex items-center justify-between text-sm">
              <span>{progressMsg}</span>
              <span className="font-mono">{progress}%</span>
            </div>
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </section>
        )}

        {clips.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Created Clips ({clips.length})</h2>
              <span className="text-xs text-muted">Saved on this browser</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {clips.map(clip => (
                <div key={clip.id} className="p-4 bg-card rounded-xl border border-card-border hover:border-indigo-500 transition-colors">
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div className="min-w-0">
                      <h4 className="font-semibold text-sm truncate" title={clip.name}>{clip.name}</h4>
                      <p className="text-xs text-muted truncate">{formatTime(clip.startTime)} - {formatTime(clip.endTime)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="px-2 py-0.5 rounded text-xs font-mono bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">{clip.format.toUpperCase()}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted mb-3 truncate">
                    {clip.duration > 0 ? `${formatTime(clip.duration)} · ` : ''}{clip.bitrate ? `${bitrateLabel(clip.bitrate)} · ` : ''}{clip.size > 0 ? formatBytes(clip.size) : ''}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => downloadClip(clip)} className="flex-1 px-3 py-3 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors min-h-[44px]">
                      <MdDownload className="inline mr-1" />Download
                    </button>
                    <button onClick={() => copyClipUrl(clip)} className="px-3 py-3 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors min-h-[44px]" title="Copy clip URL" aria-label="Copy clip URL">
                      <MdContentCopy />
                    </button>
                    <button onClick={() => openClip(clip)} className="px-3 py-3 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors min-h-[44px]" title="Open in new tab" aria-label="Open in new tab">
                      <MdOpenInNew />
                    </button>
                    <button onClick={() => deleteClip(clip)} className="px-3 py-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors min-h-[44px]" title="Delete clip" aria-label="Delete clip">
                      <MdDelete />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Help / shortcuts button */}
        <button
          onClick={() => setShortcutsOpen(true)}
          className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center"
          aria-label="Keyboard shortcuts"
          title="Keyboard shortcuts"
        >
          <MdHelpOutline className="text-2xl" />
        </button>

        <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      </main>
    </div>
  );
}
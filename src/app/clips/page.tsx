'use client';

import { useSyncExternalStore } from 'react';
import { useDarkMode } from '@/hooks/useDarkMode';
import Navbar from '@/components/Navbar';
import ClipList from '@/components/ClipList';
import { getStoredClips, subscribeClips, removeStoredClip, StoredClip } from '@/lib/clipStore';
import { downloadUrl, copyText } from '@/lib/download';
import toast from 'react-hot-toast';

export default function ClipsPage() {
  const { isDark } = useDarkMode();
  const clips = useSyncExternalStore(subscribeClips, getStoredClips, getStoredClips);

  const handleDownload = async (clip: StoredClip) => {
    const ok = await downloadUrl(clip.url, `${clip.name || 'clip'}.${clip.format}`);
    if (ok) toast.success('Download started!');
    else toast.error('Could not download clip.');
  };

  const handleCopy = async (clip: StoredClip) => {
    const ok = await copyText(clip.url);
    if (ok) toast.success('Clip URL copied!');
    else toast.error('Could not copy the link.');
  };

  const handleDelete = (clip: StoredClip) => {
    removeStoredClip(clip.id);
    if (clip.url.startsWith('http')) {
      fetch('/api/url', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: clip.url }) }).catch(() => {});
    }
    toast.success('Clip deleted');
  };

  const handlePreview = (clip: StoredClip) => {
    const a = document.createElement('a');
    a.href = clip.url;
    a.target = '_blank';
    a.rel = 'noreferrer';
    a.click();
  };

  const handleOpen = handlePreview;

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-2">My Clips</h1>
        <p className="text-muted mb-8">Clips created on this device. Stored in cloud storage with references on this browser.</p>
        <ClipList clips={clips} onPreview={handlePreview} onDownload={handleDownload} onCopy={handleCopy} onOpen={handleOpen} onDelete={handleDelete} />
      </main>
    </div>
  );
}
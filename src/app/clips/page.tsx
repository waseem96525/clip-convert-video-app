'use client';

import { useSyncExternalStore } from 'react';
import { useDarkMode } from '@/hooks/useDarkMode';
import Navbar from '@/components/Navbar';
import ClipList from '@/components/ClipList';
import { getStoredClips, subscribeClips, removeStoredClip, StoredClip } from '@/lib/clipStore';
import toast from 'react-hot-toast';

export default function ClipsPage() {
  const { isDark } = useDarkMode();
  const clips = useSyncExternalStore(subscribeClips, getStoredClips, getStoredClips);

  const handleDownload = async (clip: StoredClip) => {
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

  return (
    <div className={isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-2">My Clips</h1>
        <p className="text-muted mb-8">All clips created on this device. Stored securely on this browser and in cloud storage.</p>
        <ClipList clips={clips} onPreview={handlePreview} onDownload={handleDownload} onDelete={handleDelete} />
      </main>
    </div>
  );
}
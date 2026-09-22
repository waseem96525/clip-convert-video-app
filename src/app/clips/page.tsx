'use client';

import { useState, useEffect } from 'react';
import { getDb } from '@/lib/db';
import { formatTime } from '@/lib/config';
import { useDarkMode } from '@/hooks/useDarkMode';
import Navbar from '@/components/Navbar';
import ClipList from '@/components/ClipList';
import { safeJson } from '@/lib/clientHttp';

export default function ClipsPage() {
  const { isDark } = useDarkMode();
  const [clips, setClips] = useState<any[]>([]);
  const [videoFilename, setVideoFilename] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClips();
  }, []);

  const loadClips = async () => {
    try {
      const res = await fetch('/api/clip');
      const data = (await safeJson(res)) || {};
      if (data.clips) {
        setClips(data.clips);
        if (data.clips.length > 0) setVideoFilename(data.clips[0].video_filename);
      }
    } catch {}
    setLoading(false);
  };

  const handleDownload = async (clipId: string) => {
    const clip = clips.find(c => c.id === clipId);
    const name = clip?.name || 'clip';
    const res = await fetch(`/api/download?id=${clipId}&name=${encodeURIComponent(name)}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.${clip?.format || 'mp3'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (clipId: string) => {
    try {
      await fetch(`/api/clip?id=${clipId}`, { method: 'DELETE' });
      setClips(prev => prev.filter(c => c.id !== clipId));
    } catch {}
  };

  return (
    <div className={isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-2">My Clips</h1>
        <p className="text-muted mb-8">View and manage all your converted audio clips.</p>
        {loading ? (
          <div className="text-center py-12 text-muted">Loading...</div>
        ) : (
          <ClipList clips={clips} videoFilename={videoFilename} onPreview={() => {}} onDownload={handleDownload} onDelete={handleDelete} onRename={() => {}} />
        )}
      </main>
    </div>
  );
}

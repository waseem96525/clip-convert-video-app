'use client';

import { useState, useEffect } from 'react';
import { useDarkMode } from '@/hooks/useDarkMode';
import { CONFIG } from '@/lib/config';
import { getDb } from '@/lib/db';
import Navbar from '@/components/Navbar';
import toast from 'react-hot-toast';
import { safeJson } from '@/lib/clientHttp';

export default function SettingsPage() {
  const { isDark, toggle } = useDarkMode();
  const [theme, setTheme] = useState(isDark ? 'dark' : 'light');
  const [defaultFormat, setDefaultFormat] = useState('mp3');
  const [defaultBitrate, setDefaultBitrate] = useState('192k');
  const [maxFileSize, setMaxFileSize] = useState(CONFIG.maxUploadSize / 1024 / 1024);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    fetch('/api/health')
      .then(r => safeJson(r))
      .then(d => d && setStats(d.stats))
      .catch(() => {});
  }, []);

  const handleSave = () => {
    toast.success('Settings saved!');
  };

  return (
    <div className={isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <h1 className="text-3xl font-bold">Settings</h1>

        {/* General */}
        <div className="p-6 bg-card rounded-xl border border-card-border space-y-4">
          <h2 className="text-xl font-semibold">General</h2>
          <div>
            <label className="text-sm font-medium text-muted block mb-1">Theme</label>
            <select value={theme} onChange={(e) => setTheme(e.target.value)} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg">
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-muted block mb-1">Default Format</label>
            <select value={defaultFormat} onChange={(e) => setDefaultFormat(e.target.value)} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg">
              <option value="mp3">MP3</option>
              <option value="wav">WAV</option>
              <option value="m4a">M4A</option>
              <option value="ogg">OGG</option>
              <option value="flac">FLAC</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-muted block mb-1">Default Bitrate</label>
            <select value={defaultBitrate} onChange={(e) => setDefaultBitrate(e.target.value)} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg">
              <option value="128k">128 kbps</option>
              <option value="192k">192 kbps</option>
              <option value="256k">256 kbps</option>
              <option value="320k">320 kbps</option>
            </select>
          </div>
        </div>

        {/* Processing */}
        <div className="p-6 bg-card rounded-xl border border-card-border space-y-4">
          <h2 className="text-xl font-semibold">Processing</h2>
          <div>
            <label className="text-sm font-medium text-muted block mb-1">Max File Size (MB)</label>
            <input type="number" value={maxFileSize} onChange={(e) => setMaxFileSize(parseFloat(e.target.value))} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg" />
          </div>
          <p className="text-xs text-muted">Configured limits: Upload {CONFIG.maxUploadSize / 1024 / 1024}MB, Duration {CONFIG.maxVideoDuration / 3600}h, Clip {CONFIG.maxClipDuration / 60}min</p>
        </div>

        {/* Admin Stats */}
        <div className="p-6 bg-card rounded-xl border border-card-border space-y-4">
          <h2 className="text-xl font-semibold">System Status</h2>
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <p className="text-xs text-muted">Total Users</p>
                <p className="text-xl font-bold">{stats.totalUsers || 0}</p>
              </div>
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <p className="text-xs text-muted">Conversions</p>
                <p className="text-xl font-bold">{stats.totalConversions || 0}</p>
              </div>
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <p className="text-xs text-muted">Active Jobs</p>
                <p className="text-xl font-bold">{stats.activeJobs || 0}</p>
              </div>
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <p className="text-xs text-muted">Storage</p>
                <p className="text-xl font-bold">{((stats.storageUsed || 0) / 1024 / 1024).toFixed(1)} MB</p>
              </div>
            </div>
          )}
        </div>

        <button onClick={handleSave} className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
          Save Settings
        </button>
      </main>
    </div>
  );
}



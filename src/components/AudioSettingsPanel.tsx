'use client';

import { AudioSettings } from '@/types';

interface AudioSettingsPanelProps {
  settings: AudioSettings;
  onChange: (settings: AudioSettings) => void;
}

export default function AudioSettingsPanel({ settings, onChange }: AudioSettingsPanelProps) {
  const update = (partial: Partial<AudioSettings>) => onChange({ ...settings, ...partial });

  return (
    <div className="space-y-4 p-4 sm:p-6 bg-card rounded-xl border border-card-border w-full">
      <h3 className="text-lg font-semibold">Audio Settings</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-muted block mb-1">Output Format</label>
          <select
            value={settings.format}
            onChange={(e) => update({ format: e.target.value as AudioSettings['format'] })}
            className="w-full px-3 py-3 bg-input border border-input-border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
          >
            <option value="mp3">MP3</option>
            <option value="wav">WAV</option>
            <option value="m4a">M4A / AAC</option>
            <option value="ogg">OGG</option>
            <option value="flac">FLAC</option>
          </select>
        </div>

        {(settings.format === 'mp3' || settings.format === 'm4a' || settings.format === 'ogg') && (
          <div>
            <label className="text-sm font-medium text-muted block mb-1">Bitrate</label>
            <select
              value={settings.bitrate}
              onChange={(e) => update({ bitrate: e.target.value })}
              className="w-full px-3 py-3 bg-input border border-input-border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
            >
              <option value="64k">64 kbps</option>
              <option value="96k">96 kbps</option>
              <option value="128k">128 kbps</option>
              <option value="192k">192 kbps</option>
              <option value="256k">256 kbps</option>
              <option value="320k">320 kbps</option>
            </select>
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-muted block mb-1">Sample Rate</label>
          <select
            value={settings.sampleRate}
            onChange={(e) => update({ sampleRate: e.target.value })}
            className="w-full px-3 py-3 bg-input border border-input-border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
          >
            <option value="original">Original</option>
            <option value="44100">44.1 kHz</option>
            <option value="48000">48 kHz</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-muted block mb-1">Channels</label>
          <select
            value={settings.channels}
            onChange={(e) => update({ channels: e.target.value })}
            className="w-full px-3 py-3 bg-input border border-input-border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
          >
            <option value="original">Original</option>
            <option value="stereo">Stereo</option>
            <option value="mono">Mono</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
          <input
            type="checkbox"
            checked={settings.normalize}
            onChange={(e) => update({ normalize: e.target.checked })}
            className="w-5 h-5 rounded accent-indigo-500"
          />
          <span className="text-sm">Normalize audio</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium text-muted block mb-1">Fade In (s)</label>
            <input
              type="number"
              min={0}
              max={10}
              step={0.5}
              value={settings.fadeIn}
              onChange={(e) => update({ fadeIn: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-3 bg-input border border-input-border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted block mb-1">Fade Out (s)</label>
            <input
              type="number"
              min={0}
              max={10}
              step={0.5}
              value={settings.fadeOut}
              onChange={(e) => update({ fadeOut: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-3 bg-input border border-input-border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted block mb-1">Volume: {settings.volume > 0 ? '+' : ''}{settings.volume}%</label>
            <input
              type="range"
              min={-100}
              max={100}
              value={settings.volume}
              onChange={(e) => update({ volume: parseInt(e.target.value) })}
              className="w-full mt-2"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

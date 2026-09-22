'use client';

import { useCallback, useState, useRef } from 'react';
import { MdCloudUpload, MdFolder } from 'react-icons/md';
import toast from 'react-hot-toast';
import { CONFIG } from '@/lib/config';
import { validateFile } from '@/lib/validators';

interface UploadAreaProps {
  onUpload: (file: File) => void;
  onUrlClick: () => void;
}

export default function UploadArea({ onUpload, onUrlClick }: UploadAreaProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragFile, setDragFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const validation = validateFile(file);
      if (!validation.valid) {
        toast.error(validation.error!);
        return;
      }
      setDragFile(file);
      onUpload(file);
    }
  }, [onUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const validation = validateFile(file);
      if (!validation.valid) {
        toast.error(validation.error!);
        return;
      }
      onUpload(file);
    }
  }, [onUpload]);

  return (
    <div className="space-y-4 w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-300 ${
          isDragOver
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20 scale-[1.02]'
            : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-800'
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
        />
        <MdCloudUpload className="text-5xl mx-auto mb-3 text-indigo-500" />
        <p className="text-lg font-medium mb-2">
          {isDragOver ? 'Drop your video here' : 'Drag & drop your video file'}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          or{' '}
          <span className="text-indigo-500 hover:underline">Browse Files</span>
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {['MP4', 'WebM', 'MOV', 'AVI', 'MKV', 'M4V'].map(fmt => (
            <span key={fmt} className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">{fmt}</span>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">Max {CONFIG.maxUploadSize / 1024 / 1024} MB · Max {CONFIG.maxVideoDuration / 3600}h duration</p>
      </div>

      {dragFile && (
        <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg animate-fade-in">
          <MdFolder className="text-green-500 text-xl" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{dragFile.name}</p>
            <p className="text-xs text-gray-500">{(dragFile.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          <button onClick={() => setDragFile(null)} className="text-red-500 hover:text-red-700 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center">✕</button>
        </div>
      )}

      <button
        onClick={(e) => { e.preventDefault(); onUrlClick(); }}
        className="w-full py-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-all font-medium min-h-[48px]"
      >
        Or paste a video URL instead
      </button>
    </div>
  );
}

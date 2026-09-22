'use client';

import Link from "next/link";
import { MdDownload, MdVideoLibrary, MdContentCut, MdSpeed, MdSecurity, MdPhoneIphone } from "react-icons/md";
import { useDarkMode } from "@/hooks/useDarkMode";

export default function Home() {
  const { isDark, toggle } = useDarkMode();

  const features = [
    { icon: MdVideoLibrary, title: "Video Upload", desc: "Upload your own video files in MP4, WebM, MOV, and more formats." },
    { icon: MdContentCut, title: "Precision Trimming", desc: "Select exactly the section you need with millisecond precision." },
    { icon: MdDownload, title: "Multiple Formats", desc: "Export as MP3, WAV, M4A, OGG, FLAC with adjustable quality." },
    { icon: MdSpeed, title: "Fast Processing", desc: "Server-side FFmpeg processing ensures quick clip extraction." },
    { icon: MdSecurity, title: "Privacy First", desc: "Temporary files are automatically deleted after 24 hours." },
    { icon: MdPhoneIphone, title: "Mobile Friendly", desc: "Works beautifully across desktop, tablet, and mobile devices." },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className={`border-b sticky top-0 z-50 backdrop-blur-sm ${isDark ? 'border-gray-700 bg-gray-900/80' : 'border-gray-200 bg-white/80'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-indigo-500 to-cyan-500 bg-clip-text text-transparent">
            ClipConvert
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/convert" className="hidden sm:inline text-sm font-medium hover:text-indigo-500 transition-colors px-2 py-1">Video to Audio</Link>
            <Link href="/clips" className="hidden sm:inline text-sm font-medium hover:text-indigo-500 transition-colors px-2 py-1">My Clips</Link>
            <Link href="/settings" className="hidden sm:inline text-sm font-medium hover:text-indigo-500 transition-colors px-2 py-1">Settings</Link>
            <button onClick={toggle} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="Toggle theme">
              {isDark ? '☀️' : '🌙'}
            </button>
            <Link href="/convert" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
          <div className="text-center animate-fade-in">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6">
              Turn Any Video Into the{" "}
              <span className="bg-gradient-to-r from-indigo-500 to-cyan-500 bg-clip-text text-transparent">Perfect Audio Clip</span>
            </h1>
            <p className="text-base sm:text-lg text-muted max-w-xl sm:max-w-2xl mx-auto mb-8">
              Upload a video or paste a supported video URL, trim the exact section you need, and download it as a high-quality audio file.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/convert" className="w-full sm:w-auto px-8 py-4 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors text-lg text-center">
                Upload Video
              </Link>
              <Link href="/convert" className="w-full sm:w-auto px-8 py-4 border border-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-lg text-center">
                Paste Video URL
              </Link>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">Everything You Need</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {features.map((feature, i) => (
              <div key={i} className="p-5 sm:p-6 rounded-xl border border-card-border bg-card hover:border-indigo-500 transition-colors animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                <feature.icon className="text-3xl text-indigo-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-card rounded-2xl border border-card-border p-6 sm:p-12">
            <h2 className="text-2xl font-bold mb-6 text-center">How It Works</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { step: '1', title: 'Upload or Paste URL', desc: 'Provide your video file or a supported URL.' },
                { step: '2', title: 'Trim & Select', desc: 'Choose the exact section and set audio preferences.' },
                { step: '3', title: 'Download', desc: 'Get your high-quality audio clip instantly.' },
              ].map((item, i) => (
                <div key={i} className="text-center">
                  <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">{item.step}</div>
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-card-border bg-card/50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted">
          <p>ClipConvert &copy; {new Date().getFullYear()}. All rights reserved.</p>
          <p className="mt-2">Use this tool only for content you have permission to download.</p>
        </div>
      </footer>
    </div>
  );
}

'use client';

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0f]">
      <div className="w-12 h-12 border-2 border-white/10 border-t-white/50 rounded-full animate-spin mb-6" />
      <p className="text-white/60 text-sm">Loading 341,129 connections...</p>
      <p className="text-white/30 text-xs mt-2">Preparing GPU buffers</p>
    </div>
  );
}

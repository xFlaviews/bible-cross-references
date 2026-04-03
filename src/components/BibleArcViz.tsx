'use client';

import { useEffect, useState, useMemo } from 'react';
import { BibleVizProvider } from '@/context/BibleVizContext';
import { loadBibleData, buildArcInstanceData } from '@/lib/bible-data';
import ArcCanvas from './ArcCanvas';
import BookLabels from './BookLabels';
import UIOverlay from './UIOverlay';
import LoadingScreen from './LoadingScreen';
import type { BibleData } from '@/types/bible';

export default function BibleArcViz() {
  const [data, setData] = useState<BibleData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    loadBibleData()
      .then(setData)
      .catch(err => setError(err.message));
  }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const arcData = useMemo(() => {
    if (!data) return null;
    return buildArcInstanceData(data);
  }, [data]);

  if (error) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-[#0a0a0f] text-red-400">
        <div className="text-center">
          <p className="text-lg mb-2">Failed to load visualization</p>
          <p className="text-sm text-white/40">{error}</p>
        </div>
      </div>
    );
  }

  if (!data || !arcData) {
    return <LoadingScreen />;
  }

  return (
    <BibleVizProvider>
      <div className="w-full h-screen bg-[#0a0a0f] relative overflow-hidden">
        <ArcCanvas data={data} instanceData={arcData.instanceData} arcCount={arcData.arcCount} />
        <BookLabels books={data.books} totalVerses={data.totalVerses} isMobile={isMobile} />
        <UIOverlay data={data} isMobile={isMobile} />
      </div>
    </BibleVizProvider>
  );
}

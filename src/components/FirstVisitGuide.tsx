'use client';

import { useState, useEffect } from 'react';
import { useBibleViz } from '@/context/BibleVizContext';

export default function FirstVisitGuide() {
  const [visible, setVisible] = useState(false);
  const { state } = useBibleViz();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const dismissed = sessionStorage.getItem('bible-viz-guide-dismissed');
    if (!dismissed) {
      const timer = setTimeout(() => setVisible(true), 4000); // show after draw-on
      return () => clearTimeout(timer);
    }
  }, []);

  // Auto-dismiss on first interaction
  useEffect(() => {
    if (state.mode !== 'overview' && visible) {
      setVisible(false);
      sessionStorage.setItem('bible-viz-guide-dismissed', '1');
    }
  }, [state.mode, visible]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-[70px] left-1/2 -translate-x-1/2 z-50 animate-fade-in">
      <div className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-3 border border-white/20 max-w-xs text-center">
        <p className="text-white/80 text-sm">
          Tap a book name below to explore its connections
        </p>
        <div className="mt-2 text-white/30 text-lg">&darr;</div>
      </div>
      <button
        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white/20 text-white/60 text-xs flex items-center justify-center hover:bg-white/30"
        onClick={() => {
          setVisible(false);
          sessionStorage.setItem('bible-viz-guide-dismissed', '1');
        }}
      >
        &times;
      </button>
    </div>
  );
}

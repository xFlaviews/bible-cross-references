'use client';

import { useEffect, useState, useRef } from 'react';

interface ResponsiveState {
  width: number;
  height: number;
  isMobile: boolean;
  devicePixelRatio: number;
}

export function useResponsive(containerRef: React.RefObject<HTMLElement | null>): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>({
    width: 0,
    height: 0,
    isMobile: false,
    devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      setState({
        width: rect.width,
        height: rect.height,
        isMobile: rect.width < 768,
        devicePixelRatio: window.devicePixelRatio,
      });
    };

    const debouncedUpdate = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(update, 100);
    };

    const observer = new ResizeObserver(debouncedUpdate);
    observer.observe(el);
    update(); // initial

    return () => {
      observer.disconnect();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [containerRef]);

  return state;
}

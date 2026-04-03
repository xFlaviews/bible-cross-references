'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface UseReglResult {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reglRef: React.RefObject<any>;
  ready: boolean;
  contextLost: boolean;
}

export function useRegl(): UseReglResult {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reglRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [contextLost, setContextLost] = useState(false);

  const initRegl = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (reglRef.current) { setReady(true); return; }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const reglModule = require('regl');
      const createREGL = typeof reglModule === 'function' ? reglModule
        : typeof reglModule.default === 'function' ? reglModule.default
        : null;

      if (!createREGL) {
        console.error('regl import failed:', typeof reglModule);
        return;
      }

      reglRef.current = createREGL({
        canvas,
        attributes: { antialias: true, alpha: false },
        extensions: ['ANGLE_instanced_arrays'],
        optionalExtensions: ['WEBGL_debug_renderer_info'],
      });
      setReady(true);
      setContextLost(false);
    } catch (e) {
      console.error('Failed to create regl instance:', e);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
      reglRef.current = null;
      setReady(false);
    };

    const handleContextRestored = () => {
      reglRef.current = null;
      initRegl();
    };

    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    initRegl();

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
    };
  }, [initRegl]);

  return { canvasRef, reglRef, ready, contextLost };
}

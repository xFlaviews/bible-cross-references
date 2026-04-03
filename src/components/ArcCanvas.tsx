'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRegl } from '@/hooks/useRegl';
import { useResponsive } from '@/hooks/useResponsive';
import { useBibleViz } from '@/context/BibleVizContext';
import { createArcBuffers, createBarBuffers, destroyBuffers } from '@/lib/webgl/buffers';
import { createDrawCommands } from '@/lib/arc-renderer';
import type { ArcUniforms, DrawCommands } from '@/lib/arc-renderer';
import type { ArcBuffers, BarBuffers } from '@/lib/webgl/buffers';
import { AnimationTimeline } from '@/lib/webgl/animation';
import { hitTestBook, canvasToNormalized } from '@/lib/webgl/hit-testing';
import { createScales } from '@/lib/scales';
import { ARC_SEGMENTS } from '@/lib/webgl/shaders';
import type { BibleData } from '@/types/bible';

interface ArcCanvasProps {
  data: BibleData;
  instanceData: Float32Array;
  arcCount: number;
}

export default function ArcCanvas({ data, instanceData, arcCount }: ArcCanvasProps) {
  const { canvasRef, reglRef, ready, contextLost } = useRegl();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { width, height, isMobile, devicePixelRatio } = useResponsive(containerRef);
  const { state, dispatch } = useBibleViz();

  // Use refs for values the render loop needs (avoids restarting rAF on every change)
  const stateRef = useRef(state);
  stateRef.current = state;
  const sizeRef = useRef({ width, height, isMobile });
  sizeRef.current = { width, height, isMobile };

  const drawCommandsRef = useRef<DrawCommands | null>(null);
  const arcBuffersRef = useRef<ArcBuffers | null>(null);
  const barBuffersRef = useRef<BarBuffers | null>(null);
  const animationRef = useRef(new AnimationTimeline());
  const rafRef = useRef(0);
  const zoomRef = useRef({ center: [0.5, 0] as [number, number], scale: 1 });
  const renderingRef = useRef(false);

  const scales = useRef(createScales(data.books, data.chapters, data.totalVerses));

  // Build GPU buffers when regl is ready
  useEffect(() => {
    const regl = reglRef.current;
    if (!ready || !regl) return;

    destroyBuffers(arcBuffersRef.current, barBuffersRef.current);

    try {
      const segments = sizeRef.current.isMobile ? 6 : 12;
      const mobileArcCount = Math.min(arcCount, 20_000);
      const count = sizeRef.current.isMobile ? mobileArcCount : arcCount;

      const arcBuffers = createArcBuffers(regl, instanceData, count, segments);
      arcBuffersRef.current = arcBuffers;

      let maxVC = 0;
      for (const c of data.chapters) if (c.verseCount > maxVC) maxVC = c.verseCount;
      const barBuffers = createBarBuffers(regl, data.chapters, data.totalVerses, maxVC);
      barBuffersRef.current = barBuffers;

      const commands = createDrawCommands(regl, arcBuffers, barBuffers, segments);
      drawCommandsRef.current = commands;

      animationRef.current.start();
    } catch (e) {
      console.error('[ArcCanvas] Setup failed:', e);
    }

    return () => {
      destroyBuffers(arcBuffersRef.current, barBuffersRef.current);
      arcBuffersRef.current = null;
      barBuffersRef.current = null;
      drawCommandsRef.current = null;
    };
  }, [ready, reglRef, instanceData, data]);

  // Handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0 || height === 0) return;
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // Notify regl of viewport change
    const regl = reglRef.current;
    if (regl) {
      regl.poll();
    }
  }, [width, height, devicePixelRatio, canvasRef, reglRef]);

  // Persistent render loop — runs once, reads from refs
  useEffect(() => {
    if (!ready) return;
    if (renderingRef.current) return;
    renderingRef.current = true;

    const render = () => {
      const regl = reglRef.current;
      const commands = drawCommandsRef.current;
      const { width: w, height: h, isMobile: mobile } = sizeRef.current;
      const st = stateRef.current;

      if (!regl || !commands || w === 0 || h === 0) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      try {
        const anim = animationRef.current.getState();
        const focusBook = st.selectedBook ?? (st.hoveredBook ?? -1);

        // Chapter-level focus: compute verse range as normalized x
        let focusXStart = -1;
        let focusXEnd = -1;
        if (st.selectedChapter !== null) {
          const ch = data.chapters[st.selectedChapter];
          focusXStart = ch.startVerse / data.totalVerses;
          focusXEnd = (ch.startVerse + ch.verseCount) / data.totalVerses;
        }

        const uniforms: ArcUniforms = {
          uProgress: anim.drawOnProgress,
          uFocusBook: focusBook,
          uDimAlpha: 0.02,
          uTransition: focusXStart >= 0 ? 1 : anim.transitionProgress,
          uFocusXStart: focusXStart,
          uFocusXEnd: focusXEnd,
          uBreathing: st.mode === 'overview' ? anim.breathingAlpha : 0,
          uLineWidth: mobile ? 0.0008 : 0.0004,
          uTime: anim.time,
          uMinVotes: mobile ? 2 : 1,
          uZoomCenter: zoomRef.current.center,
          uZoomScale: zoomRef.current.scale,
          uAspect: w / h,
          uGlowPass: 0,
        };

        regl.poll();
        regl.clear({ color: [0.039, 0.039, 0.059, 1], depth: 1 });

        // Draw bars
        commands.drawBars(uniforms);

        // Draw arcs
        commands.drawArcs(uniforms);
      } catch (e) {
        console.error('[ArcCanvas] Render error:', e);
      }

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);

    return () => {
      renderingRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [ready, reglRef]);

  // Transition animation
  useEffect(() => {
    if (state.selectedBook !== null) {
      animationRef.current.startTransition(true);
    } else {
      animationRef.current.startTransition(false);
    }
  }, [state.selectedBook]);

  // Mouse/touch interaction
  const handleInteraction = useCallback(
    (clientX: number, clientY: number, isClick: boolean) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const canvasX = clientX - rect.left;
      const canvasY = clientY - rect.top;

      const { x } = canvasToNormalized(
        canvasX, canvasY,
        rect.width, rect.height,
        zoomRef.current.center, zoomRef.current.scale,
      );

      const currentMode = stateRef.current.mode;

      // If in any drill-down mode, click goes back one level
      if (isClick && currentMode !== 'overview') {
        dispatch({ type: 'GO_BACK' });
        return;
      }

      // Only hit-test in bar chart region (bottom ~20% of canvas)
      if (canvasY / rect.height < 0.8) {
        if (!isClick) dispatch({ type: 'HOVER_BOOK', bookIndex: null });
        return;
      }

      const bookIdx = hitTestBook(x, scales.current, data.books);

      if (isClick && bookIdx !== null && currentMode === 'overview') {
        dispatch({ type: 'SELECT_BOOK', bookIndex: bookIdx });
      } else if (!isClick) {
        dispatch({ type: 'HOVER_BOOK', bookIndex: bookIdx });
      }
    },
    [canvasRef, data.books, dispatch],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => handleInteraction(e.clientX, e.clientY, false),
    [handleInteraction],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => handleInteraction(e.clientX, e.clientY, true),
    [handleInteraction],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];
        handleInteraction(touch.clientX, touch.clientY, true);
      }
    },
    [handleInteraction],
  );

  const touchesRef = useRef<{ x: number; y: number }[]>([]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchesRef.current = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const prev = touchesRef.current;
      if (prev.length < 2) return;

      const prevDist = Math.hypot(prev[0].x - prev[1].x, prev[0].y - prev[1].y);
      const currDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );

      zoomRef.current.scale = Math.max(1, Math.min(zoomRef.current.scale * (currDist / prevDist), 10));

      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        zoomRef.current.center = [midX / rect.width, 0];
      }

      touchesRef.current = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
    }
  }, [canvasRef]);

  if (contextLost) {
    return (
      <div ref={containerRef} className="w-full h-full flex items-center justify-center bg-[#0a0a0f] text-white/60">
        <p>WebGL context lost. Recovering...</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ touchAction: 'manipulation' }}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
    </div>
  );
}

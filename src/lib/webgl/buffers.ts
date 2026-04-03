import type REGL from 'regl';
import { ARC_SEGMENTS } from './shaders';
import type { BibleData } from '@/types/bible';
import type { ChapterMeta } from '@/types/bible';

export interface ArcBuffers {
  templateBuffer: REGL.Buffer;
  instanceBuffer: REGL.Buffer;
  instanceCount: number;
}

export interface BarBuffers {
  quadBuffer: REGL.Buffer;
  barInstanceBuffer: REGL.Buffer;
  barCount: number;
}

/**
 * Build the shared arc template buffer: triangle strip positions for one arc.
 * Each segment has 2 vertices (aSide = -1 and +1).
 * Total: ARC_SEGMENTS * 2 vertices, each with [t, side].
 */
function buildTemplateData(segments: number): Float32Array {
  const data = new Float32Array(segments * 2 * 2); // segments * 2 verts * 2 floats
  for (let i = 0; i < segments; i++) {
    const t = i / (segments - 1);
    data[i * 4] = t;      // aT
    data[i * 4 + 1] = -1;  // aSide
    data[i * 4 + 2] = t;   // aT
    data[i * 4 + 3] = 1;   // aSide
  }
  return data;
}

/**
 * Create GPU buffers for arc rendering. (regl isolation boundary)
 */
export function createArcBuffers(
  regl: REGL.Regl,
  instanceData: Float32Array,
  instanceCount: number,
  segments: number = ARC_SEGMENTS,
): ArcBuffers {
  const templateData = buildTemplateData(segments);

  return {
    templateBuffer: regl.buffer({
      data: templateData,
      usage: 'static',
    }),
    instanceBuffer: regl.buffer({
      data: instanceData,
      usage: 'static',
    }),
    instanceCount,
  };
}

/**
 * Create GPU buffers for bar chart rendering. (regl isolation boundary)
 */
export function createBarBuffers(
  regl: REGL.Regl,
  chapters: ChapterMeta[],
  totalVerses: number,
  maxVerseCount: number,
): BarBuffers {
  // Quad template: 2 triangles forming a rectangle
  const quadData = new Float32Array([
    0, 0,  1, 0,  0, 1,
    1, 0,  1, 1,  0, 1,
  ]);

  // Per-bar instance data: [barX, barWidth, barHeight, bookIndex]
  const barData = new Float32Array(chapters.length * 4);
  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    barData[i * 4] = ch.startVerse / totalVerses;
    barData[i * 4 + 1] = ch.verseCount / totalVerses;
    barData[i * 4 + 2] = (ch.verseCount / maxVerseCount) * 0.12; // max bar height
    barData[i * 4 + 3] = ch.bookIndex;
  }

  return {
    quadBuffer: regl.buffer({ data: quadData, usage: 'static' }),
    barInstanceBuffer: regl.buffer({ data: barData, usage: 'static' }),
    barCount: chapters.length,
  };
}

/**
 * Destroy all buffers. (regl isolation boundary)
 */
export function destroyBuffers(arcBuffers: ArcBuffers | null, barBuffers: BarBuffers | null) {
  if (arcBuffers) {
    arcBuffers.templateBuffer.destroy();
    arcBuffers.instanceBuffer.destroy();
  }
  if (barBuffers) {
    barBuffers.quadBuffer.destroy();
    barBuffers.barInstanceBuffer.destroy();
  }
}

import type REGL from 'regl';
import { arcVertexShader, arcFragmentShader, barVertexShader, barFragmentShader, ARC_SEGMENTS } from './webgl/shaders';
import type { ArcBuffers, BarBuffers } from './webgl/buffers';

export interface ArcUniforms {
  uProgress: number;
  uFocusBook: number;
  uDimAlpha: number;
  uTransition: number;
  uFocusXStart: number;
  uFocusXEnd: number;
  uBreathing: number;
  uLineWidth: number;
  uTime: number;
  uMinVotes: number;
  uZoomCenter: [number, number];
  uZoomScale: number;
  uAspect: number;
  uGlowPass: number;
}

export interface DrawCommands {
  drawArcs: REGL.DrawCommand;
  drawBars: REGL.DrawCommand;
}

/**
 * Create regl draw commands for arcs and bars. (regl isolation boundary)
 */
export function createDrawCommands(
  regl: REGL.Regl,
  arcBuffers: ArcBuffers,
  barBuffers: BarBuffers,
  segments: number = ARC_SEGMENTS,
): DrawCommands {
  const drawArcs = regl({
    vert: arcVertexShader,
    frag: arcFragmentShader,

    attributes: {
      aT: {
        buffer: arcBuffers.templateBuffer,
        offset: 0,
        stride: 8, // 2 floats * 4 bytes
        divisor: 0,
      },
      aSide: {
        buffer: arcBuffers.templateBuffer,
        offset: 4,
        stride: 8,
        divisor: 0,
      },
      aFromX: {
        buffer: arcBuffers.instanceBuffer,
        offset: 0,
        stride: 24, // 6 floats * 4 bytes
        divisor: 1,
      },
      aToX: {
        buffer: arcBuffers.instanceBuffer,
        offset: 4,
        stride: 24,
        divisor: 1,
      },
      aHeight: {
        buffer: arcBuffers.instanceBuffer,
        offset: 8,
        stride: 24,
        divisor: 1,
      },
      aHueFrom: {
        buffer: arcBuffers.instanceBuffer,
        offset: 12,
        stride: 24,
        divisor: 1,
      },
      aHueTo: {
        buffer: arcBuffers.instanceBuffer,
        offset: 16,
        stride: 24,
        divisor: 1,
      },
      aBookIndex: {
        buffer: arcBuffers.instanceBuffer,
        offset: 20,
        stride: 24,
        divisor: 1,
      },
    },

    uniforms: {
      uProgress: regl.prop<ArcUniforms, 'uProgress'>('uProgress'),
      uFocusBook: regl.prop<ArcUniforms, 'uFocusBook'>('uFocusBook'),
      uDimAlpha: regl.prop<ArcUniforms, 'uDimAlpha'>('uDimAlpha'),
      uTransition: regl.prop<ArcUniforms, 'uTransition'>('uTransition'),
      uFocusXStart: regl.prop<ArcUniforms, 'uFocusXStart'>('uFocusXStart'),
      uFocusXEnd: regl.prop<ArcUniforms, 'uFocusXEnd'>('uFocusXEnd'),
      uBreathing: regl.prop<ArcUniforms, 'uBreathing'>('uBreathing'),
      uLineWidth: regl.prop<ArcUniforms, 'uLineWidth'>('uLineWidth'),
      uTime: regl.prop<ArcUniforms, 'uTime'>('uTime'),
      uMinVotes: regl.prop<ArcUniforms, 'uMinVotes'>('uMinVotes'),
      uZoomCenter: regl.prop<ArcUniforms, 'uZoomCenter'>('uZoomCenter'),
      uZoomScale: regl.prop<ArcUniforms, 'uZoomScale'>('uZoomScale'),
      uAspect: regl.prop<ArcUniforms, 'uAspect'>('uAspect'),
      uGlowPass: regl.prop<ArcUniforms, 'uGlowPass'>('uGlowPass'),
    },

    primitive: 'triangle strip',
    count: segments * 2,
    instances: arcBuffers.instanceCount,

    blend: {
      enable: true,
      func: {
        srcRGB: 'src alpha',
        dstRGB: 'one minus src alpha',
        srcAlpha: 'one',
        dstAlpha: 'one minus src alpha',
      },
    },

    depth: { enable: false },
  });

  const drawBars = regl({
    vert: barVertexShader,
    frag: barFragmentShader,

    attributes: {
      aPos: {
        buffer: barBuffers.quadBuffer,
        offset: 0,
        stride: 8,
        divisor: 0,
      },
      aBarX: {
        buffer: barBuffers.barInstanceBuffer,
        offset: 0,
        stride: 16,
        divisor: 1,
      },
      aBarWidth: {
        buffer: barBuffers.barInstanceBuffer,
        offset: 4,
        stride: 16,
        divisor: 1,
      },
      aBarHeight: {
        buffer: barBuffers.barInstanceBuffer,
        offset: 8,
        stride: 16,
        divisor: 1,
      },
      aBarBookIdx: {
        buffer: barBuffers.barInstanceBuffer,
        offset: 12,
        stride: 16,
        divisor: 1,
      },
    },

    uniforms: {
      uZoomCenter: regl.prop<ArcUniforms, 'uZoomCenter'>('uZoomCenter'),
      uZoomScale: regl.prop<ArcUniforms, 'uZoomScale'>('uZoomScale'),
      uFocusBook: regl.prop<ArcUniforms, 'uFocusBook'>('uFocusBook'),
      uTransition: regl.prop<ArcUniforms, 'uTransition'>('uTransition'),
    },

    primitive: 'triangles',
    count: 6,
    instances: barBuffers.barCount,

    blend: {
      enable: true,
      func: {
        srcRGB: 'src alpha',
        dstRGB: 'one minus src alpha',
        srcAlpha: 'one',
        dstAlpha: 'one minus src alpha',
      },
    },

    depth: { enable: false },
  });

  return { drawArcs, drawBars };
}

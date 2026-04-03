import { GLSL_HSL_TO_RGB } from '@/lib/colors';

const ARC_SEGMENTS = 32;

/**
 * Vertex shader for instanced arc rendering.
 *
 * Per-vertex (template buffer): aT (0..1 along arc), aSide (-1 or +1 for ribbon width)
 * Per-instance: aFromX, aToX, aHeight, aHueFrom, aHueTo, aBookIndex
 *
 * Computes quadratic bezier at t, then offsets perpendicular to tangent for ribbon width.
 */
export const arcVertexShader = `
precision highp float;

attribute float aT;
attribute float aSide;

attribute float aFromX;
attribute float aToX;
attribute float aHeight;
attribute float aHueFrom;
attribute float aHueTo;
attribute float aBookIndex;

uniform float uProgress;       // draw-on animation (0-1)
uniform float uFocusBook;      // -1 = no focus, 0-65 = focused book
uniform float uDimAlpha;       // alpha for non-focused arcs
uniform float uTransition;     // transition progress (0-1)
uniform float uFocusXStart;    // -1 = no chapter focus, else normalized x start
uniform float uFocusXEnd;      // normalized x end of focused chapter
uniform float uBreathing;      // breathing alpha offset
uniform float uLineWidth;      // arc ribbon half-width in clip space
uniform float uTime;
uniform float uMinVotes;       // vote threshold for culling
uniform vec2 uZoomCenter;      // zoom center in normalized coords
uniform float uZoomScale;      // zoom scale factor
uniform float uAspect;         // canvas aspect ratio
uniform float uGlowPass;       // 0 = normal, 1 = glow pass

varying float vArcProgress;
varying float vHueFrom;
varying float vHueTo;
varying float vAlpha;

void main() {
  // Draw-on: only show arcs up to uProgress
  float arcMid = (aFromX + aToX) * 0.5;
  if (arcMid > uProgress) {
    gl_Position = vec4(2.0, 2.0, 0.0, 1.0); // off-screen
    vAlpha = 0.0;
    return;
  }

  // Quadratic bezier: P0=(fromX, 0), P1=(midX, +height), P2=(toX, 0)
  // Arcs go UPWARD from the bar chart baseline
  float midX = (aFromX + aToX) * 0.5;
  float t = aT;

  float oneMinusT = 1.0 - t;
  float px = oneMinusT * oneMinusT * aFromX + 2.0 * oneMinusT * t * midX + t * t * aToX;
  float py = 2.0 * oneMinusT * t * aHeight; // positive = upward

  // Tangent for perpendicular offset
  float tx = 2.0 * (1.0 - t) * (midX - aFromX) + 2.0 * t * (aToX - midX);
  float ty = 2.0 * (1.0 - t) * aHeight + 2.0 * t * (-aHeight);

  // Normalize tangent and get perpendicular
  float tLen = sqrt(tx * tx + ty * ty);
  if (tLen < 0.0001) tLen = 0.0001;
  float nx = -ty / tLen;
  float ny = tx / tLen;

  // Apply ribbon width
  float width = uLineWidth;
  px += nx * aSide * width;
  py += ny * aSide * width;

  // Map to clip space: x [0,1]->[-1,1], y baseline near bottom, arcs fill upward
  // On tall screens (mobile), scale arcs taller to fill vertical space
  float aspectScale = uAspect < 1.0 ? 1.0 / max(uAspect, 0.3) : 1.0;
  float yScale = 3.0 * min(aspectScale, 2.5);
  float clipX = px * 2.0 - 1.0;
  float clipY = -0.92 + py * yScale;

  // Apply zoom
  clipX = (clipX - (uZoomCenter.x * 2.0 - 1.0)) * uZoomScale + (uZoomCenter.x * 2.0 - 1.0);
  clipY = (clipY - uZoomCenter.y) * uZoomScale + uZoomCenter.y;

  gl_Position = vec4(clipX, clipY, 0.0, 1.0);

  // Alpha computation
  float alpha = 1.0;

  // Chapter focus: highlight arcs from/to the selected chapter's verse range
  if (uFocusXStart >= 0.0) {
    float fromInRange = step(uFocusXStart, aFromX) * step(aFromX, uFocusXEnd);
    float toInRange = step(uFocusXStart, aToX) * step(aToX, uFocusXEnd);
    float isTarget = max(fromInRange, toInRange);
    alpha = mix(uDimAlpha, 1.0, isTarget);
    alpha = mix(1.0, alpha, uTransition);
  }
  // Book focus: dim non-selected books (only if no chapter focus)
  else if (uFocusBook >= 0.0) {
    float isTarget = step(abs(aBookIndex - uFocusBook), 0.5);
    alpha = mix(uDimAlpha, 1.0, isTarget);
    alpha = mix(1.0, alpha, uTransition);
  }

  // Breathing
  alpha += uBreathing;

  // Glow pass: reduce alpha
  if (uGlowPass > 0.5) {
    alpha *= 0.15;
  }

  vAlpha = alpha;
  vArcProgress = t;
  vHueFrom = aHueFrom;
  vHueTo = aHueTo;
}
`;

export const arcFragmentShader = `
precision highp float;

${GLSL_HSL_TO_RGB}

varying float vArcProgress;
varying float vHueFrom;
varying float vHueTo;
varying float vAlpha;

void main() {
  if (vAlpha < 0.01) discard;

  float hue = mix(vHueFrom, vHueTo, vArcProgress);
  vec3 color = hsl2rgb(hue, 0.8, 0.55);
  gl_FragColor = vec4(color * vAlpha, vAlpha);
}
`;

/**
 * Bar chart vertex shader — instanced quads for chapter length bars.
 */
export const barVertexShader = `
precision highp float;

attribute vec2 aPos;         // quad corner (0,0), (1,0), (0,1), (1,1)
attribute float aBarX;       // bar left x (normalized 0-1)
attribute float aBarWidth;   // bar width (normalized)
attribute float aBarHeight;  // bar height (normalized, based on verse count)
attribute float aBarBookIdx; // book index for coloring

uniform vec2 uZoomCenter;
uniform float uZoomScale;
uniform float uFocusBook;
uniform float uTransition;

varying float vBarAlpha;
varying float vBarBookIdx;

void main() {
  float x = aBarX + aPos.x * aBarWidth;
  float y = -0.85 + aPos.y * aBarHeight; // bars at bottom

  float clipX = x * 2.0 - 1.0;
  float clipY = y;

  clipX = (clipX - (uZoomCenter.x * 2.0 - 1.0)) * uZoomScale + (uZoomCenter.x * 2.0 - 1.0);
  clipY = (clipY - uZoomCenter.y) * uZoomScale + uZoomCenter.y;

  gl_Position = vec4(clipX, clipY, 0.0, 1.0);

  vBarAlpha = 1.0;
  if (uFocusBook >= 0.0) {
    float isTarget = step(abs(aBarBookIdx - uFocusBook), 0.5);
    vBarAlpha = mix(0.3, 1.0, isTarget);
    vBarAlpha = mix(1.0, vBarAlpha, uTransition);
  }
  vBarBookIdx = aBarBookIdx;
}
`;

export const barFragmentShader = `
precision highp float;
varying float vBarAlpha;
varying float vBarBookIdx;

void main() {
  float testament = step(39.0, vBarBookIdx);
  vec3 color = mix(vec3(0.55, 0.6, 0.7), vec3(0.65, 0.7, 0.55), testament);
  gl_FragColor = vec4(color * vBarAlpha, vBarAlpha * 0.6);
}
`;

export { ARC_SEGMENTS };

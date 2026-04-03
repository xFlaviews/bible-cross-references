import type { BookMeta, Scales } from '@/types/bible';

/**
 * Hit-test which book the user clicked/tapped on the bar chart.
 * Uses binary search on book x-ranges. O(log 66).
 *
 * @param normalizedX - x position normalized to 0-1
 * @param scales - scale functions
 * @param books - book metadata
 * @returns book index or null
 */
export function hitTestBook(
  normalizedX: number,
  scales: Scales,
  books: BookMeta[],
): number | null {
  // Binary search for book containing this x position
  let lo = 0;
  let hi = books.length - 1;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const { start, end } = scales.bookToX(mid);

    if (normalizedX < start) {
      hi = mid - 1;
    } else if (normalizedX > end) {
      lo = mid + 1;
    } else {
      return mid;
    }
  }

  return null;
}

/**
 * Hit-test which chapter within a book the user clicked.
 * Linear scan of ~20-50 chapters.
 */
export function hitTestChapter(
  normalizedX: number,
  scales: Scales,
  chapters: { startVerse: number; verseCount: number }[],
  globalChapterOffset: number,
  chapterCount: number,
): number | null {
  for (let i = 0; i < chapterCount; i++) {
    const globalIdx = globalChapterOffset + i;
    const { start, end } = scales.chapterToX(globalIdx);
    if (normalizedX >= start && normalizedX <= end) {
      return globalIdx;
    }
  }
  return null;
}

/**
 * Convert canvas pixel coordinates to normalized [0,1] coordinates,
 * accounting for zoom.
 */
export function canvasToNormalized(
  canvasX: number,
  canvasY: number,
  canvasWidth: number,
  canvasHeight: number,
  zoomCenter: [number, number],
  zoomScale: number,
): { x: number; y: number } {
  // Canvas pixel to clip space
  const clipX = (canvasX / canvasWidth) * 2 - 1;
  const clipY = 1 - (canvasY / canvasHeight) * 2; // flip Y

  // Inverse zoom transform
  const x = ((clipX - (zoomCenter[0] * 2 - 1)) / zoomScale + (zoomCenter[0] * 2 - 1) + 1) / 2;
  const y = clipY; // for hit-testing we only need x

  return { x, y };
}

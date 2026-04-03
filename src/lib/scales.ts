import type { BookMeta, ChapterMeta, Scales } from '@/types/bible';

export function createScales(
  books: BookMeta[],
  chapters: ChapterMeta[],
  totalVerses: number,
): Scales {
  const verseToX = (verseIndex: number): number => {
    return verseIndex / totalVerses;
  };

  const bookToX = (bookIndex: number) => {
    const book = books[bookIndex];
    const start = book.startVerse / totalVerses;
    const end = (book.startVerse + book.verseCount) / totalVerses;
    return { start, end, center: (start + end) / 2 };
  };

  const chapterToX = (chapterGlobalIndex: number) => {
    const ch = chapters[chapterGlobalIndex];
    const start = ch.startVerse / totalVerses;
    const end = (ch.startVerse + ch.verseCount) / totalVerses;
    return { start, end, center: (start + end) / 2 };
  };

  return { verseToX, bookToX, chapterToX };
}

/** Simple linear interpolation */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Map value from one range to another */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

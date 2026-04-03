import type { BibleData, BookMeta, ChapterMeta } from '@/types/bible';
import { distanceToHue } from '@/lib/colors';

export async function loadBibleData(): Promise<BibleData> {
  const [booksRes, chaptersRes, binRes] = await Promise.all([
    fetch('/data/books.json'),
    fetch('/data/chapter-index.json'),
    fetch('/data/cross-refs.bin'),
  ]);

  const books: BookMeta[] = await booksRes.json();
  const chapters: ChapterMeta[] = await chaptersRes.json();
  const binBuffer = await binRes.arrayBuffer();

  // Parse binary cross-refs
  const view = new DataView(binBuffer);
  const count = view.getUint32(0, true);
  const from = new Uint16Array(count);
  const to = new Uint16Array(count);
  const votes = new Uint16Array(count);

  for (let i = 0; i < count; i++) {
    const offset = 4 + i * 8;
    from[i] = view.getUint16(offset, true);
    to[i] = view.getUint16(offset + 2, true);
    votes[i] = view.getUint16(offset + 4, true);
  }

  const totalVerses = books.reduce((sum, b) => sum + b.verseCount, 0);

  return {
    books,
    chapters,
    crossRefs: { count, from, to, votes },
    totalVerses,
  };
}

let versesCache: Record<string, string> | null = null;

export async function loadVerses(): Promise<Record<string, string>> {
  if (versesCache) return versesCache;
  const res = await fetch('/data/verses.json');
  versesCache = await res.json();
  return versesCache!;
}

/**
 * Build the per-arc instance data for GPU upload.
 * Returns a Float32Array with 6 floats per arc: x1, x2, height, hueFrom, hueTo, bookIndex
 */
/**
 * Max arcs to render. 80K gives dense visuals at 60fps.
 * The Harrison poster uses ~63K — 80K exceeds that.
 */
const MAX_ARCS = 65_000;

export function buildArcInstanceData(data: BibleData): { instanceData: Float32Array; arcCount: number } {
  const { crossRefs, books, totalVerses } = data;

  // Sort indices by votes descending, keep top MAX_ARCS
  const indices = new Uint32Array(crossRefs.count);
  for (let i = 0; i < crossRefs.count; i++) indices[i] = i;
  indices.sort((a, b) => crossRefs.votes[b] - crossRefs.votes[a]);

  const arcCount = Math.min(crossRefs.count, MAX_ARCS);
  const instanceData = new Float32Array(arcCount * 6);

  // Find which book a verse belongs to
  const verseToBook = new Uint8Array(totalVerses);
  for (let bi = 0; bi < books.length; bi++) {
    const book = books[bi];
    for (let v = book.startVerse; v < book.startVerse + book.verseCount; v++) {
      verseToBook[v] = bi;
    }
  }

  for (let j = 0; j < arcCount; j++) {
    const i = indices[j];
    const f = crossRefs.from[i];
    const t = crossRefs.to[i];
    const x1 = f / totalVerses;
    const x2 = t / totalVerses;
    const distance = Math.abs(t - f);
    const height = Math.sqrt(distance / totalVerses) * 0.55; // sqrt for visible short arcs, capped to avoid clipping
    const hueFrom = distanceToHue(distance, totalVerses);

    const offset = j * 6;
    instanceData[offset] = x1;
    instanceData[offset + 1] = x2;
    instanceData[offset + 2] = height;
    instanceData[offset + 3] = hueFrom;
    instanceData[offset + 4] = hueFrom;
    instanceData[offset + 5] = verseToBook[f];
  }

  return { instanceData, arcCount };
}

/**
 * Get a human-readable verse reference from a global verse index.
 */
export function verseIndexToRef(
  verseIndex: number,
  books: BookMeta[],
  chapters: ChapterMeta[],
): string {
  // Find book
  let bookIdx = 0;
  for (let i = 0; i < books.length; i++) {
    if (verseIndex >= books[i].startVerse &&
        verseIndex < books[i].startVerse + books[i].verseCount) {
      bookIdx = i;
      break;
    }
  }

  // Find chapter
  const book = books[bookIdx];
  let chapterNum = 1;
  let verseNum = verseIndex - book.startVerse + 1;

  for (const ch of chapters) {
    if (ch.bookIndex !== bookIdx) continue;
    if (verseIndex >= ch.startVerse && verseIndex < ch.startVerse + ch.verseCount) {
      chapterNum = ch.chapterNum;
      verseNum = verseIndex - ch.startVerse + 1;
      break;
    }
  }

  return `${book.abbrev} ${chapterNum}:${verseNum}`;
}

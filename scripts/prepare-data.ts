import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// --- OSIS abbreviation → canonical book index (0-65) ---
const OSIS_BOOKS = [
  'Gen','Exod','Lev','Num','Deut','Josh','Judg','Ruth','1Sam','2Sam',
  '1Kgs','2Kgs','1Chr','2Chr','Ezra','Neh','Esth','Job','Ps','Prov',
  'Eccl','Song','Isa','Jer','Lam','Ezek','Dan','Hos','Joel','Amos',
  'Obad','Jonah','Mic','Nah','Hab','Zeph','Hag','Zech','Mal',
  'Matt','Mark','Luke','John','Acts','Rom','1Cor','2Cor','Gal','Eph',
  'Phil','Col','1Thess','2Thess','1Tim','2Tim','Titus','Phlm','Heb',
  'Jas','1Pet','2Pet','1John','2John','3John','Jude','Rev'
];

const BOOK_ABBREVS = [
  'Gen','Exod','Lev','Num','Deut','Josh','Judg','Ruth','1 Sam','2 Sam',
  '1 Kgs','2 Kgs','1 Chr','2 Chr','Ezra','Neh','Esth','Job','Ps','Prov',
  'Eccl','Song','Isa','Jer','Lam','Ezek','Dan','Hos','Joel','Amos',
  'Obad','Jonah','Mic','Nah','Hab','Zeph','Hag','Zech','Mal',
  'Matt','Mark','Luke','John','Acts','Rom','1 Cor','2 Cor','Gal','Eph',
  'Phil','Col','1 Thess','2 Thess','1 Tim','2 Tim','Titus','Phlm','Heb',
  'Jas','1 Pet','2 Pet','1 John','2 John','3 John','Jude','Rev'
];

const osisToIndex = new Map<string, number>();
OSIS_BOOKS.forEach((name, i) => osisToIndex.set(name, i));

interface KJVBook {
  name: string;
  chapters: { chapter: number; verses: { verse: number; text: string }[] }[];
}

interface KJVData {
  translation: string;
  books: KJVBook[];
}

interface BookMeta {
  name: string;
  abbrev: string;
  testament: 'OT' | 'NT';
  chapterCount: number;
  verseCount: number;
  startVerse: number;
}

interface ChapterMeta {
  bookIndex: number;
  chapterNum: number;
  verseCount: number;
  startVerse: number;
  crossRefStart: number;
  crossRefEnd: number;
}

// --- Load KJV data ---
const rawDir = join(__dirname, '..', 'raw-data');
const outDir = join(__dirname, '..', 'public', 'data');
mkdirSync(outDir, { recursive: true });

console.log('Loading KJV data...');
const kjv: KJVData = JSON.parse(readFileSync(join(rawDir, 'kjv.json'), 'utf-8'));

// --- Build verse index: global sequential index for every verse ---
// verseIndex[bookIndex][chapterIndex][verseIndex] = globalIndex
const bookMeta: BookMeta[] = [];
const chapterMeta: ChapterMeta[] = [];
const verses: Record<number, string> = {};

// Map from (bookIndex, chapter, verse) to global index
const verseToGlobal = new Map<string, number>();
let globalIndex = 0;

for (let bi = 0; bi < kjv.books.length; bi++) {
  const book = kjv.books[bi];
  const startVerse = globalIndex;
  let bookVerseCount = 0;

  for (let ci = 0; ci < book.chapters.length; ci++) {
    const chapter = book.chapters[ci];
    const chapterStart = globalIndex;

    for (let vi = 0; vi < chapter.verses.length; vi++) {
      const v = chapter.verses[vi];
      const key = `${OSIS_BOOKS[bi]}.${chapter.chapter}.${v.verse}`;
      verseToGlobal.set(key, globalIndex);
      // Strip Strong's numbers and morphology tags for clean text
      verses[globalIndex] = v.text.replace(/<[^>]+>/g, '').trim();
      globalIndex++;
      bookVerseCount++;
    }

    chapterMeta.push({
      bookIndex: bi,
      chapterNum: chapter.chapter,
      verseCount: chapter.verses.length,
      startVerse: chapterStart,
      crossRefStart: 0, // filled after cross-ref parsing
      crossRefEnd: 0,
    });
  }

  bookMeta.push({
    name: book.name,
    abbrev: BOOK_ABBREVS[bi],
    testament: bi < 39 ? 'OT' : 'NT',
    chapterCount: book.chapters.length,
    verseCount: bookVerseCount,
    startVerse,
  });
}

console.log(`Total verses indexed: ${globalIndex}`);

// --- Parse OSIS reference to global verse index ---
function parseOSIS(ref: string): number | null {
  // Handle ranges: take first verse only (e.g., "Col.1.16-Col.1.17" → "Col.1.16")
  const base = ref.split('-')[0];
  const match = base.match(/^([A-Za-z0-9]+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  const key = `${match[1]}.${match[2]}.${match[3]}`;
  return verseToGlobal.get(key) ?? null;
}

// --- Parse cross-references ---
console.log('Parsing cross-references...');
const crossRefLines = readFileSync(join(rawDir, 'cross_references.txt'), 'utf-8').split('\n');

interface CrossRef {
  from: number;
  to: number;
  votes: number;
}

const crossRefs: CrossRef[] = [];
let skipped = 0;

for (let i = 1; i < crossRefLines.length; i++) {
  const line = crossRefLines[i].trim();
  if (!line || line.startsWith('#')) continue;

  const parts = line.split('\t');
  if (parts.length < 3) continue;

  const from = parseOSIS(parts[0]);
  const to = parseOSIS(parts[1]);
  const votes = parseInt(parts[2], 10);

  if (from === null || to === null || isNaN(votes)) {
    skipped++;
    continue;
  }

  crossRefs.push({ from, to, votes });
}

console.log(`Cross-references parsed: ${crossRefs.length} (skipped: ${skipped})`);

// Sort by source verse index for binary search
crossRefs.sort((a, b) => a.from - b.from || a.to - b.to);

// --- Build chapter cross-ref index ---
// For each chapter, find the range [start, end) in the sorted crossRefs array
let crIdx = 0;
for (const ch of chapterMeta) {
  const chapterEnd = ch.startVerse + ch.verseCount;
  ch.crossRefStart = crIdx;
  while (crIdx < crossRefs.length && crossRefs[crIdx].from < chapterEnd) {
    if (crossRefs[crIdx].from >= ch.startVerse) {
      // This cross-ref belongs to this chapter
    }
    crIdx++;
  }
  ch.crossRefEnd = crIdx;
  // Reset to scan properly — we need contiguous ranges
}

// Re-scan properly: for each chapter, binary search start position
for (const ch of chapterMeta) {
  const chapterEnd = ch.startVerse + ch.verseCount;
  // Binary search for first cross-ref with from >= ch.startVerse
  let lo = 0, hi = crossRefs.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (crossRefs[mid].from < ch.startVerse) lo = mid + 1;
    else hi = mid;
  }
  ch.crossRefStart = lo;
  // Linear scan to find end
  let end = lo;
  while (end < crossRefs.length && crossRefs[end].from < chapterEnd) end++;
  ch.crossRefEnd = end;
}

// --- Write cross-refs.bin ---
console.log('Writing cross-refs.bin...');
const binSize = 4 + crossRefs.length * 8; // 4-byte header + 8 bytes per pair
const buffer = Buffer.alloc(binSize);
buffer.writeUInt32LE(crossRefs.length, 0);

for (let i = 0; i < crossRefs.length; i++) {
  const offset = 4 + i * 8;
  buffer.writeUInt16LE(crossRefs[i].from, offset);
  buffer.writeUInt16LE(crossRefs[i].to, offset + 2);
  buffer.writeUInt16LE(Math.max(0, Math.min(crossRefs[i].votes, 65535)), offset + 4);
  buffer.writeUInt16LE(0, offset + 6); // padding
}

writeFileSync(join(outDir, 'cross-refs.bin'), buffer);
console.log(`  Written: ${(binSize / 1024 / 1024).toFixed(2)} MB, ${crossRefs.length} pairs`);

// --- Write books.json ---
console.log('Writing books.json...');
writeFileSync(join(outDir, 'books.json'), JSON.stringify(bookMeta, null, 2));

// --- Write chapter-index.json ---
console.log('Writing chapter-index.json...');
writeFileSync(join(outDir, 'chapter-index.json'), JSON.stringify(chapterMeta));

// --- Write verses.json ---
console.log('Writing verses.json...');
writeFileSync(join(outDir, 'verses.json'), JSON.stringify(verses));

// --- Verification ---
console.log('\n--- Verification ---');
console.log(`Books: ${bookMeta.length}`);
console.log(`Chapters: ${chapterMeta.length}`);
console.log(`Verses: ${globalIndex}`);
console.log(`Cross-refs: ${crossRefs.length}`);
console.log(`Binary size: ${(binSize / 1024 / 1024).toFixed(2)} MB`);

// Verify round-trip using Buffer reads (avoids alignment issues)
const readBack = readFileSync(join(outDir, 'cross-refs.bin'));
const count = readBack.readUInt32LE(0);
let verified = true;
for (let i = 0; i < Math.min(10, count); i++) {
  const off = 4 + i * 8;
  const from = readBack.readUInt16LE(off);
  const to = readBack.readUInt16LE(off + 2);
  const votes = readBack.readUInt16LE(off + 4);
  const expectedVotes = Math.max(0, Math.min(crossRefs[i].votes, 65535));
  if (from !== crossRefs[i].from || to !== crossRefs[i].to || votes !== expectedVotes) {
    console.error(`  MISMATCH at index ${i}: got (${from},${to},${votes}) expected (${crossRefs[i].from},${crossRefs[i].to},${expectedVotes})`);
    verified = false;
  }
}
console.log(`Round-trip verification: ${verified ? 'PASSED' : 'FAILED'}`);
console.log('Done!');

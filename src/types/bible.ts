export type VizMode = 'overview' | 'book' | 'chapter' | 'verse';

export interface VizState {
  mode: VizMode;
  selectedBook: number | null;
  selectedChapter: number | null;
  selectedVerse: number | null;
  hoveredBook: number | null;
  animationProgress: number;
  transitionProgress: number;
}

export type VizAction =
  | { type: 'SELECT_BOOK'; bookIndex: number }
  | { type: 'SELECT_CHAPTER'; chapterIndex: number }
  | { type: 'SELECT_VERSE'; verseIndex: number }
  | { type: 'GO_BACK' }
  | { type: 'HOVER_BOOK'; bookIndex: number | null }
  | { type: 'SET_ANIMATION_PROGRESS'; progress: number }
  | { type: 'SET_TRANSITION_PROGRESS'; progress: number }
  | { type: 'RESET' };

export interface BookMeta {
  name: string;
  abbrev: string;
  testament: 'OT' | 'NT';
  chapterCount: number;
  verseCount: number;
  startVerse: number;
}

export interface ChapterMeta {
  bookIndex: number;
  chapterNum: number;
  verseCount: number;
  startVerse: number;
  crossRefStart: number;
  crossRefEnd: number;
}

export interface CrossRefPair {
  from: number;
  to: number;
  votes: number;
}

export interface BibleData {
  books: BookMeta[];
  chapters: ChapterMeta[];
  crossRefs: {
    count: number;
    from: Uint16Array;
    to: Uint16Array;
    votes: Uint16Array;
  };
  totalVerses: number;
}

export interface ArcInstance {
  x1: number;     // source x position (normalized 0-1)
  x2: number;     // target x position (normalized 0-1)
  height: number;  // arc height
  hueFrom: number; // source hue (0-1)
  hueTo: number;   // target hue (0-1)
  bookIndex: number; // which book this arc belongs to (source)
}

export interface Scales {
  verseToX: (verseIndex: number) => number;
  bookToX: (bookIndex: number) => { start: number; end: number; center: number };
  chapterToX: (chapterGlobalIndex: number) => { start: number; end: number; center: number };
}

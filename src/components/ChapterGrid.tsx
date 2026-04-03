'use client';

import { useBibleViz } from '@/context/BibleVizContext';
import type { BookMeta } from '@/types/bible';

interface ChapterGridProps {
  books: BookMeta[];
  chapters: { bookIndex: number; chapterNum: number; verseCount: number; startVerse: number; crossRefStart: number; crossRefEnd: number }[];
}

export default function ChapterGrid({ books, chapters }: ChapterGridProps) {
  const { state, dispatch } = useBibleViz();

  if (state.mode !== 'book' || state.selectedBook === null) return null;

  const book = books[state.selectedBook];
  const bookChapters = chapters.filter(ch => ch.bookIndex === state.selectedBook);
  const totalRefs = bookChapters.reduce((sum, ch) => sum + (ch.crossRefEnd - ch.crossRefStart), 0);

  return (
    <div className="fixed top-12 left-4 z-40">
      <div className="px-4 py-2 rounded-xl bg-[#12121a]/80 backdrop-blur-md border border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-white text-sm font-medium">{book.name}</span>
          <span className="text-white/40 text-xs">{totalRefs} cross-refs</span>
          <button
            className="text-white/50 hover:text-white text-xs px-2 py-1 rounded bg-white/10 ml-2"
            onClick={() => dispatch({ type: 'GO_BACK' })}
          >
            Back to overview
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useBibleViz } from '@/context/BibleVizContext';
import type { BookMeta, ChapterMeta } from '@/types/bible';
import { verseIndexToRef } from '@/lib/bible-data';

interface BreadcrumbProps {
  books: BookMeta[];
  chapters: ChapterMeta[];
}

export default function Breadcrumb({ books, chapters }: BreadcrumbProps) {
  const { state, dispatch } = useBibleViz();

  if (state.mode === 'overview') return null;

  const segments: { label: string; onClick: () => void }[] = [
    {
      label: 'Overview',
      onClick: () => {
        // Go back to overview directly
        while (state.mode !== 'overview') {
          dispatch({ type: 'GO_BACK' });
        }
      },
    },
  ];

  if (state.selectedBook !== null) {
    segments.push({
      label: books[state.selectedBook].name,
      onClick: () => {
        if (state.mode === 'chapter' || state.mode === 'verse') {
          dispatch({ type: 'GO_BACK' }); // verse→chapter or chapter→book
          if (state.mode === 'verse') {
            dispatch({ type: 'GO_BACK' }); // then chapter→book
          }
        }
      },
    });
  }

  if (state.selectedChapter !== null) {
    const ch = chapters[state.selectedChapter];
    segments.push({
      label: `Chapter ${ch.chapterNum}`,
      onClick: () => {
        if (state.mode === 'verse') dispatch({ type: 'GO_BACK' });
      },
    });
  }

  if (state.selectedVerse !== null) {
    segments.push({
      label: verseIndexToRef(state.selectedVerse, books, chapters),
      onClick: () => {},
    });
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-4 py-3 bg-black/60 backdrop-blur-md">
      <div className="flex items-center gap-2 text-sm text-white/80">
        {segments.map((seg, i) => (
          <span key={i} className="flex items-center gap-2">
            {i > 0 && <span className="text-white/30">&rsaquo;</span>}
            {i < segments.length - 1 ? (
              <button
                className="hover:text-white transition-colors"
                onClick={seg.onClick}
              >
                {seg.label}
              </button>
            ) : (
              <span className="text-white font-medium">{seg.label}</span>
            )}
          </span>
        ))}

        <button
          className="ml-auto text-white/50 hover:text-white text-xs px-2 py-1 rounded bg-white/10"
          onClick={() => dispatch({ type: 'GO_BACK' })}
        >
          Back
        </button>
      </div>
    </nav>
  );
}

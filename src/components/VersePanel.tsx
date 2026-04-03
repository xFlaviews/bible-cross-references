'use client';

import { useEffect, useState, useMemo } from 'react';
import { useBibleViz } from '@/context/BibleVizContext';
import { loadVerses, verseIndexToRef } from '@/lib/bible-data';
import type { BibleData } from '@/types/bible';

interface VersePanelProps {
  data: BibleData;
  isMobile: boolean;
}

export default function VersePanel({ data, isMobile }: VersePanelProps) {
  const { state, dispatch } = useBibleViz();
  const [verses, setVerses] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(false);

  // Load verse text on first chapter drill-down
  useEffect(() => {
    if (state.mode === 'chapter' && !verses) {
      setLoading(true);
      loadVerses().then(v => {
        setVerses(v);
        setLoading(false);
      });
    }
  }, [state.mode, verses]);

  // Get cross-refs for selected chapter
  const chapterRefs = useMemo(() => {
    if (state.selectedChapter === null) return [];
    const ch = data.chapters[state.selectedChapter];
    const refs: { from: number; to: number; votes: number }[] = [];
    for (let i = ch.crossRefStart; i < ch.crossRefEnd; i++) {
      refs.push({
        from: data.crossRefs.from[i],
        to: data.crossRefs.to[i],
        votes: data.crossRefs.votes[i],
      });
    }
    // Sort by votes descending
    refs.sort((a, b) => b.votes - a.votes);
    return refs;
  }, [state.selectedChapter, data]);

  if (state.mode !== 'chapter' && state.mode !== 'verse') return null;

  const panelClass = isMobile
    ? 'fixed inset-x-0 bottom-0 z-40 max-h-[60vh] bg-[#12121a] border-t border-white/10 rounded-t-2xl overflow-y-auto'
    : 'fixed right-0 top-12 bottom-0 z-40 w-[400px] bg-[#12121a] border-l border-white/10 overflow-y-auto';

  return (
    <div className={panelClass}>
      {/* Drag handle (mobile) */}
      {isMobile && (
        <div className="flex justify-center py-2">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white text-sm font-medium">
            {state.selectedChapter !== null &&
              `${data.books[data.chapters[state.selectedChapter].bookIndex].name} ${data.chapters[state.selectedChapter].chapterNum}`}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-white/40 text-xs">
              {chapterRefs.length} cross-refs
            </span>
            <button
              className="text-white/40 hover:text-white text-lg leading-none px-1"
              onClick={() => dispatch({ type: 'GO_BACK' })}
            >
              &times;
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
            <span className="ml-2 text-white/40 text-sm">Loading verse text...</span>
          </div>
        ) : (
          <div className="space-y-2">
            {chapterRefs.slice(0, 200).map((ref, i) => {
              const fromRef = verseIndexToRef(ref.from, data.books, data.chapters);
              const toRef = verseIndexToRef(ref.to, data.books, data.chapters);
              const fromText = verses?.[String(ref.from)] ?? '';
              const toText = verses?.[String(ref.to)] ?? '';
              const isSelected = state.selectedVerse === ref.from || state.selectedVerse === ref.to;

              return (
                <button
                  key={i}
                  className={`w-full text-left p-3 rounded-lg transition-colors duration-150
                    ${isSelected ? 'bg-white/15 ring-1 ring-white/30' : 'bg-white/5 hover:bg-white/10'}`}
                  onClick={() => dispatch({ type: 'SELECT_VERSE', verseIndex: ref.from })}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-blue-300">{fromRef}</span>
                    <span className="text-white/20">&rarr;</span>
                    <span className="text-xs font-medium text-purple-300">{toRef}</span>
                    <span className="ml-auto text-[10px] text-white/30">{ref.votes} votes</span>
                  </div>
                  {verses && (
                    <>
                      <p className="text-xs text-white/60 line-clamp-2 mb-1">{fromText}</p>
                      <p className="text-xs text-white/40 line-clamp-2 italic">{toText}</p>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

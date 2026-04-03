'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useBibleViz } from '@/context/BibleVizContext';
import type { BookMeta, ChapterMeta } from '@/types/bible';

interface BookSearchProps {
  books: BookMeta[];
  chapters: ChapterMeta[];
}

export default function BookSearch({ books, chapters }: BookSearchProps) {
  const { state, dispatch } = useBibleViz();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [expandedBook, setExpandedBook] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const filtered = query
    ? books
        .map((b, i) => ({ ...b, index: i }))
        .filter(b =>
          b.name.toLowerCase().includes(query.toLowerCase()) ||
          b.abbrev.toLowerCase().includes(query.toLowerCase())
        )
    : books.map((b, i) => ({ ...b, index: i }));

  const bookChapters = useMemo(() => {
    if (expandedBook === null) return [];
    return chapters
      .map((ch, globalIdx) => ({ ...ch, globalIdx }))
      .filter(ch => ch.bookIndex === expandedBook);
  }, [expandedBook, chapters]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
        setExpandedBook(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selectBook = (index: number) => {
    dispatch({ type: 'RESET' });
    // Allow state to settle then select
    setTimeout(() => {
      dispatch({ type: 'SELECT_BOOK', bookIndex: index });
      setExpandedBook(index);
      setQuery('');
    }, 20);
  };

  const selectChapter = (globalIdx: number, bookIndex: number) => {
    dispatch({ type: 'RESET' });
    setTimeout(() => {
      dispatch({ type: 'SELECT_BOOK', bookIndex });
      setTimeout(() => {
        dispatch({ type: 'SELECT_CHAPTER', chapterIndex: globalIdx });
        setOpen(false);
        setExpandedBook(null);
        setQuery('');
      }, 20);
    }, 20);
  };

  return (
    <div ref={panelRef} className="fixed top-3 right-4 z-50">
      {!open ? (
        <button
          className="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-md border border-white/10 text-white/70 text-xs hover:bg-white/15 hover:text-white transition-colors"
          onClick={() => setOpen(true)}
        >
          Search book...
        </button>
      ) : (
        <div className="w-64 rounded-xl bg-[#12121a]/95 backdrop-blur-md border border-white/15 shadow-2xl overflow-hidden">
          <div className="flex items-center border-b border-white/10">
            <input
              ref={inputRef}
              type="text"
              placeholder="Type a book name..."
            value={query}
            onChange={e => { setQuery(e.target.value); setExpandedBook(null); }}
            className="flex-1 px-3 py-2 bg-transparent text-white text-sm outline-none placeholder:text-white/30"
            onKeyDown={e => {
              if (e.key === 'Escape') { setOpen(false); setQuery(''); setExpandedBook(null); }
              if (e.key === 'Enter' && filtered.length > 0) selectBook(filtered[0].index);
            }}
            onBlur={(e) => {
              if (panelRef.current && !panelRef.current.contains(e.relatedTarget as Node)) {
                setTimeout(() => setOpen(false), 200);
              }
            }}
          />
            <button
              className="px-2 py-1 text-white/40 hover:text-white text-sm"
              onClick={() => { setOpen(false); setQuery(''); setExpandedBook(null); }}
            >
              &times;
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {filtered.map(book => (
              <div key={book.index}>
                <button
                  className={`w-full text-left px-3 py-1.5 text-sm transition-colors hover:bg-white/10 flex items-center justify-between
                    ${state.selectedBook === book.index ? 'text-yellow-300 bg-white/5' : 'text-white/70'}`}
                  onClick={() => {
                    if (expandedBook === book.index) {
                      setExpandedBook(null);
                    } else {
                      selectBook(book.index);
                    }
                  }}
                >
                  <span>
                    <span className="text-white/30 text-xs mr-2">{book.index < 39 ? 'OT' : 'NT'}</span>
                    {book.name}
                  </span>
                  <span className="text-white/20 text-xs">{book.chapterCount} ch</span>
                </button>

                {/* Chapter grid inside the book */}
                {expandedBook === book.index && (
                  <div className="px-3 py-2 bg-white/5 border-t border-b border-white/5">
                    <p className="text-white/30 text-[10px] mb-1.5">Select chapter:</p>
                    <div className="flex flex-wrap gap-1">
                      {bookChapters.map(ch => (
                        <button
                          key={ch.globalIdx}
                          className="w-7 h-7 flex items-center justify-center rounded text-[11px]
                            text-white/60 bg-white/5 hover:bg-white/15 hover:text-white transition-colors"
                          onClick={() => selectChapter(ch.globalIdx, book.index)}
                        >
                          {ch.chapterNum}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

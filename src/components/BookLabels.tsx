'use client';

import { useBibleViz } from '@/context/BibleVizContext';
import type { BookMeta } from '@/types/bible';

interface BookLabelsProps {
  books: BookMeta[];
  totalVerses: number;
  isMobile: boolean;
}

const SHORT = [
  'Gen','Exo','Lev','Num','Deu','Jos','Jdg','Rut','1Sa','2Sa',
  '1Ki','2Ki','1Ch','2Ch','Ezr','Neh','Est','Job','Psa','Pro',
  'Ecc','Son','Isa','Jer','Lam','Eze','Dan','Hos','Joe','Amo',
  'Oba','Jon','Mic','Nah','Hab','Zep','Hag','Zec','Mal',
  'Mat','Mar','Luk','Joh','Act','Rom','1Co','2Co','Gal','Eph',
  'Phi','Col','1Th','2Th','1Ti','2Ti','Tit','Phm','Heb',
  'Jam','1Pe','2Pe','1Jn','2Jn','3Jn','Jud','Rev'
];

export default function BookLabels({ books, totalVerses, isMobile }: BookLabelsProps) {
  const { state, dispatch } = useBibleViz();

  if (state.mode !== 'overview' && state.mode !== 'book') return null;

  const ntStart = (books[39]?.startVerse ?? 0) / totalVerses;
  const hoveredBook = state.hoveredBook !== null ? books[state.hoveredBook] : null;
  const hoveredCenter = state.hoveredBook !== null
    ? ((books[state.hoveredBook].startVerse + books[state.hoveredBook].verseCount / 2) / totalVerses) * 100
    : 0;

  if (isMobile) {
    // Mobile: just show OT / NT labels with divider
    return (
      <div className="absolute bottom-0 left-0 right-0 h-[36px] pointer-events-none select-none">
        {/* OT label */}
        <div className="absolute bottom-2 text-[11px] text-white/50 font-medium whitespace-nowrap"
          style={{ left: `${ntStart * 50}%`, transform: 'translateX(-50%)' }}>
          OT
        </div>
        {/* NT label */}
        <div className="absolute bottom-2 text-[11px] text-white/50 font-medium whitespace-nowrap"
          style={{ left: `${(ntStart + (1 - ntStart) / 2) * 100}%`, transform: 'translateX(-50%)' }}>
          NT
        </div>
        {/* Divider */}
        <div className="absolute bottom-0 top-0 w-px bg-white/30"
          style={{ left: `${ntStart * 100}%` }} />

        {/* Invisible hit areas still work on mobile */}
        {books.map((book, index) => {
          const start = (book.startVerse / totalVerses) * 100;
          const width = (book.verseCount / totalVerses) * 100;
          return (
            <button
              key={index}
              className="absolute bottom-0 top-0 pointer-events-auto"
              style={{ left: `${start}%`, width: `${Math.max(width, 0.5)}%`, minWidth: '8px' }}
              onClick={() => {
                if (state.mode === 'book') dispatch({ type: 'GO_BACK' });
                else if (state.mode === 'overview') dispatch({ type: 'SELECT_BOOK', bookIndex: index });
              }}
              title={book.name}
            />
          );
        })}

        {/* Hover tooltip */}
        {hoveredBook && (
          <div className="absolute bottom-[38px] pointer-events-none z-50 -translate-x-1/2"
            style={{ left: `${hoveredCenter}%` }}>
            <div className="px-2 py-1 rounded-lg bg-[#1a1a2e]/95 border border-white/15 shadow-lg whitespace-nowrap">
              <span className="text-white text-xs font-medium">{hoveredBook.name}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Desktop: vertical labels + tooltip
  return (
    <div className="absolute bottom-0 left-0 right-0 h-[56px] pointer-events-none select-none">
      {books.map((book, index) => {
        const start = (book.startVerse / totalVerses) * 100;
        const width = (book.verseCount / totalVerses) * 100;
        const isSelected = state.selectedBook === index;
        const isHovered = state.hoveredBook === index;

        return (
          <button
            key={index}
            className="absolute bottom-0 top-0 pointer-events-auto hover:bg-white/5 transition-colors flex items-end justify-center"
            style={{ left: `${start}%`, width: `${Math.max(width, 0.4)}%`, minWidth: '10px' }}
            onClick={() => {
              if (state.mode === 'book') dispatch({ type: 'GO_BACK' });
              else if (state.mode === 'overview') dispatch({ type: 'SELECT_BOOK', bookIndex: index });
            }}
            onMouseEnter={() => dispatch({ type: 'HOVER_BOOK', bookIndex: index })}
            onMouseLeave={() => dispatch({ type: 'HOVER_BOOK', bookIndex: null })}
            title={book.name}
          >
            <span
              className={`transition-colors duration-100 ${
                isSelected ? 'text-yellow-300 font-bold' :
                isHovered ? 'text-white' :
                index < 39 ? 'text-white/40' : 'text-white/35'
              }`}
              style={{
                fontSize: '7px',
                writingMode: 'vertical-lr',
                textOrientation: 'mixed',
                lineHeight: 1,
                paddingBottom: '2px',
                whiteSpace: 'nowrap',
              }}
            >
              {SHORT[index]}
            </span>
          </button>
        );
      })}

      {hoveredBook && (
        <div className="absolute bottom-[58px] pointer-events-none z-50 -translate-x-1/2"
          style={{ left: `${hoveredCenter}%` }}>
          <div className="px-2.5 py-1.5 rounded-lg bg-[#1a1a2e]/95 backdrop-blur-sm border border-white/15 shadow-lg whitespace-nowrap">
            <span className="text-white text-xs font-medium">{hoveredBook.name}</span>
            <span className="text-white/40 text-[10px] ml-2">
              {hoveredBook.chapterCount} ch &middot; {hoveredBook.verseCount} vs
            </span>
          </div>
          <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-transparent border-t-[#1a1a2e]/95 mx-auto" />
        </div>
      )}

      <div className="absolute bottom-0 top-0 w-px bg-white/25"
        style={{ left: `${ntStart * 100}%` }} />
    </div>
  );
}

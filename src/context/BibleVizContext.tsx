'use client';

import { createContext, useContext, useReducer, useMemo, type Dispatch, type ReactNode } from 'react';
import type { VizState, VizAction } from '@/types/bible';

const initialState: VizState = {
  mode: 'overview',
  selectedBook: null,
  selectedChapter: null,
  selectedVerse: null,
  hoveredBook: null,
  animationProgress: 0,
  transitionProgress: 0,
};

function vizReducer(state: VizState, action: VizAction): VizState {
  switch (action.type) {
    case 'SELECT_BOOK':
      if (state.mode !== 'overview') return state;
      return { ...state, mode: 'book', selectedBook: action.bookIndex };

    case 'SELECT_CHAPTER':
      if (state.mode !== 'book') return state;
      return { ...state, mode: 'chapter', selectedChapter: action.chapterIndex };

    case 'SELECT_VERSE':
      if (state.mode !== 'chapter') return state;
      return { ...state, mode: 'verse', selectedVerse: action.verseIndex };

    case 'GO_BACK':
      switch (state.mode) {
        case 'verse':
          return { ...state, mode: 'chapter', selectedVerse: null };
        case 'chapter':
          return { ...state, mode: 'book', selectedChapter: null };
        case 'book':
          return { ...state, mode: 'overview', selectedBook: null, hoveredBook: null };
        default:
          return state;
      }

    case 'HOVER_BOOK':
      return { ...state, hoveredBook: action.bookIndex };

    case 'SET_ANIMATION_PROGRESS':
      return { ...state, animationProgress: action.progress };

    case 'SET_TRANSITION_PROGRESS':
      return { ...state, transitionProgress: action.progress };

    case 'RESET':
      return { ...initialState };

    default:
      return state;
  }
}

interface VizContextValue {
  state: VizState;
  dispatch: Dispatch<VizAction>;
}

const BibleVizContext = createContext<VizContextValue | null>(null);

export function BibleVizProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(vizReducer, initialState);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <BibleVizContext.Provider value={value}>
      {children}
    </BibleVizContext.Provider>
  );
}

export function useBibleViz() {
  const ctx = useContext(BibleVizContext);
  if (!ctx) throw new Error('useBibleViz must be used within BibleVizProvider');
  return ctx;
}

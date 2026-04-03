'use client';

import { useBibleViz } from '@/context/BibleVizContext';
import BookSearch from './BookSearch';
import Breadcrumb from './Breadcrumb';
import ChapterGrid from './ChapterGrid';
import VersePanel from './VersePanel';
import FirstVisitGuide from './FirstVisitGuide';
import type { BibleData } from '@/types/bible';

interface UIOverlayProps {
  data: BibleData;
  isMobile: boolean;
}

export default function UIOverlay({ data, isMobile }: UIOverlayProps) {
  const { state } = useBibleViz();

  return (
    <>
      {/* Fixed elements — stay on screen during scroll */}
      <Breadcrumb books={data.books} chapters={data.chapters} />
      <BookSearch books={data.books} chapters={data.chapters} />
      <ChapterGrid books={data.books} chapters={data.chapters} />
      <VersePanel data={data} isMobile={isMobile} />
      {state.mode === 'overview' && <FirstVisitGuide />}
    </>
  );
}

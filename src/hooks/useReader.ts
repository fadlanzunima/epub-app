import { useState, useCallback, useRef } from 'react';
import { Book } from '../database/models/Book';
import { Bookmark } from '../database/models/Bookmark';
import { Annotation } from '../database/models/Annotation';
import { ReaderService } from '../services/ReaderService';

export interface ReaderState {
  book: Book | null;
  currentLocation: string; // CFI for EPUB, page for PDF
  progress: number;
  isLoading: boolean;
  error: Error | null;
}

export interface UseReaderReturn {
  state: ReaderState;
  bookmarks: Bookmark[];
  annotations: Annotation[];
  loadBook: (bookId: string) => Promise<void>;
  updateLocation: (location: string, progress: number) => Promise<void>;
  addBookmark: (note?: string) => Promise<Bookmark>;
  removeBookmark: (bookmarkId: string) => Promise<void>;
  addAnnotation: (
    text: string,
    cfi: string,
    color?: string,
    note?: string,
  ) => Promise<Annotation>;
  removeAnnotation: (annotationId: string) => Promise<void>;
  updateReadingTime: (minutes: number) => Promise<void>;
}

/**
 * Hook for managing reading session
 */
export const useReader = (): UseReaderReturn => {
  const [state, setState] = useState<ReaderState>({
    book: null,
    currentLocation: '',
    progress: 0,
    isLoading: false,
    error: null,
  });
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

  // Refs for session tracking
  const sessionStartTime = useRef<Date | null>(null);
  const pagesRead = useRef(0);

  const loadBook = useCallback(async (bookId: string): Promise<void> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const book = await ReaderService.loadBook(bookId);
      const loadedBookmarks = await ReaderService.getBookmarks(bookId);
      const loadedAnnotations = await ReaderService.getAnnotations(bookId);

      setState({
        book,
        currentLocation: book.currentCfi || String(book.currentPage) || '',
        progress: book.progress,
        isLoading: false,
        error: null,
      });

      setBookmarks(loadedBookmarks);
      setAnnotations(loadedAnnotations);

      // Start reading session
      sessionStartTime.current = new Date();
      pagesRead.current = 0;
    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err : new Error('Failed to load book'),
      }));
    }
  }, []);

  const updateLocation = useCallback(
    async (location: string, progress: number): Promise<void> => {
      setState(prev => ({ ...prev, currentLocation: location, progress }));

      if (state.book) {
        const updates: Partial<Book> = {
          lastReadAt: new Date(),
        };

        if (state.book.fileType === 'epub') {
          updates.currentCfi = location;
        } else {
          updates.currentPage = parseInt(location, 10) || 0;
        }

        await ReaderService.updateBookProgress(state.book.id, updates);
        pagesRead.current += 1;
      }
    },
    [state.book],
  );

  const addBookmark = useCallback(
    async (note?: string): Promise<Bookmark> => {
      if (!state.book) throw new Error('No book loaded');

      const bookmark = await ReaderService.addBookmark(
        state.book.id,
        state.currentLocation,
        state.book.fileType === 'pdf',
        note,
      );

      setBookmarks(prev => [...prev, bookmark]);
      return bookmark;
    },
    [state.book, state.currentLocation],
  );

  const removeBookmark = useCallback(
    async (bookmarkId: string): Promise<void> => {
      await ReaderService.removeBookmark(bookmarkId);
      setBookmarks(prev => prev.filter(b => b.id !== bookmarkId));
    },
    [],
  );

  const addAnnotation = useCallback(
    async (
      text: string,
      cfi: string,
      color?: string,
      note?: string,
    ): Promise<Annotation> => {
      if (!state.book) throw new Error('No book loaded');

      const annotation = await ReaderService.addAnnotation(
        state.book.id,
        cfi,
        text,
        color,
        note,
      );

      setAnnotations(prev => [...prev, annotation]);
      return annotation;
    },
    [state.book],
  );

  const removeAnnotation = useCallback(
    async (annotationId: string): Promise<void> => {
      await ReaderService.removeAnnotation(annotationId);
      setAnnotations(prev => prev.filter(a => a.id !== annotationId));
    },
    [],
  );

  const updateReadingTime = useCallback(
    async (minutes: number): Promise<void> => {
      if (!state.book) return;

      await ReaderService.recordReadingProgress(
        state.book.id,
        pagesRead.current,
        minutes,
      );

      // Reset session tracking
      pagesRead.current = 0;
      sessionStartTime.current = new Date();
    },
    [state.book],
  );

  return {
    state,
    bookmarks,
    annotations,
    loadBook,
    updateLocation,
    addBookmark,
    removeBookmark,
    addAnnotation,
    removeAnnotation,
    updateReadingTime,
  };
};

export default useReader;

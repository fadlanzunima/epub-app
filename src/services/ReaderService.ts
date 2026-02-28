import { Book } from '../database/models/Book';
import { Bookmark } from '../database/models/Bookmark';
import { Annotation } from '../database/models/Annotation';
import { ReadingProgress } from '../database/models/ReadingProgress';
import BookService from './BookService';
import DatabaseService from './DatabaseService';

/**
 * Service for managing reading sessions
 */
export class ReaderService {
  /**
   * Load a book for reading
   */
  static async loadBook(bookId: string): Promise<Book> {
    const book = await BookService.getBookById(bookId);
    if (!book) {
      throw new Error(`Book not found: ${bookId}`);
    }
    return book;
  }

  /**
   * Update book reading progress
   */
  static async updateBookProgress(
    bookId: string,
    updates: Partial<Book>,
  ): Promise<void> {
    await BookService.updateBook(bookId, {
      ...updates,
      lastReadAt: new Date(),
    });
  }

  /**
   * Get all bookmarks for a book
   */
  static async getBookmarks(bookId: string): Promise<Bookmark[]> {
    return await DatabaseService.getBookmarks(bookId);
  }

  /**
   * Add a bookmark
   */
  static async addBookmark(
    bookId: string,
    location: string,
    isPdf: boolean,
    note?: string,
  ): Promise<Bookmark> {
    let bookmark: Bookmark;

    if (isPdf) {
      bookmark = Bookmark.createForPdf(
        bookId,
        parseInt(location, 10) || 1,
        note,
      );
    } else {
      bookmark = Bookmark.createForEpub(bookId, location, note);
    }

    await DatabaseService.saveBookmark(bookmark);
    return bookmark;
  }

  /**
   * Remove a bookmark
   */
  static async removeBookmark(bookmarkId: string): Promise<void> {
    await DatabaseService.deleteBookmark(bookmarkId);
  }

  /**
   * Get all annotations for a book
   */
  static async getAnnotations(bookId: string): Promise<Annotation[]> {
    return await DatabaseService.getAnnotations(bookId);
  }

  /**
   * Add an annotation
   */
  static async addAnnotation(
    bookId: string,
    cfi: string,
    text: string,
    color?: string,
    note?: string,
  ): Promise<Annotation> {
    const annotation = Annotation.create(bookId, cfi, text, color, note);
    await DatabaseService.saveAnnotation(annotation);
    return annotation;
  }

  /**
   * Remove an annotation
   */
  static async removeAnnotation(annotationId: string): Promise<void> {
    await DatabaseService.deleteAnnotation(annotationId);
  }

  /**
   * Record reading progress
   */
  static async recordReadingProgress(
    bookId: string,
    pagesRead: number,
    timeSpent: number,
  ): Promise<void> {
    const progress = ReadingProgress.create(bookId, pagesRead, timeSpent);
    await DatabaseService.saveReadingProgress(progress);

    // Update total reading time on book
    const book = await BookService.getBookById(bookId);
    if (book) {
      await BookService.updateBook(bookId, {
        readingTime: book.readingTime + timeSpent,
      });
    }
  }

  /**
   * Get reading statistics for a book
   */
  static async getBookStats(bookId: string): Promise<{
    totalTime: number;
    totalPages: number;
    sessions: number;
  }> {
    const progressList = await DatabaseService.getReadingProgress(bookId);
    const totals = ReadingProgress.calculateTotals(progressList);

    return {
      totalTime: totals.totalTime,
      totalPages: totals.totalPages,
      sessions: progressList.length,
    };
  }

  /**
   * Search within book content (EPUB only)
   */
  static async searchInBook(
    bookId: string,
    query: string,
  ): Promise<Array<{ cfi: string; excerpt: string }>> {
    // This would require access to the EPUB content
    // Implementation depends on the reader component
    return [];
  }
}

export default ReaderService;

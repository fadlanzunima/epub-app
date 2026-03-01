import {
  Book,
  Category,
  Bookmark,
  Annotation,
  ReadingProgress,
} from '../types';

// In-memory storage for web (SQLite not available)
const storage = {
  books: [] as Book[],
  categories: [] as Category[],
  bookCategories: [] as { bookId: string; categoryId: string }[],
  bookmarks: [] as Bookmark[],
  annotations: [] as Annotation[],
  readingProgress: [] as ReadingProgress[],
};

/**
 * Web-compatible DatabaseService using in-memory storage
 * Note: Data will be lost on page refresh. For persistent storage,
 * use localStorage or IndexedDB.
 */
class DatabaseService {
  async init(): Promise<void> {
    // On web, we could use localStorage here for persistence
    console.log('Database initialized (web - in-memory mode)');
  }

  // Books
  async getBooks(): Promise<Book[]> {
    console.log(
      'DatabaseService.web: getBooks called, returning',
      storage.books.length,
      'books',
    );
    return [...storage.books];
  }

  async getBookById(id: string): Promise<Book | null> {
    return storage.books.find(b => b.id === id) || null;
  }

  async addBook(book: Book): Promise<void> {
    console.log('DatabaseService.web: addBook called', {
      id: book.id,
      title: book.title,
    });
    storage.books.push(book);
    console.log(
      'DatabaseService.web: Book added, total books:',
      storage.books.length,
    );
  }

  async updateBook(book: Book): Promise<void> {
    const index = storage.books.findIndex(b => b.id === book.id);
    if (index !== -1) {
      storage.books[index] = book;
    }
  }

  async deleteBook(id: string): Promise<void> {
    storage.books = storage.books.filter(b => b.id !== id);
    // Also clean up related data
    storage.bookCategories = storage.bookCategories.filter(
      bc => bc.bookId !== id,
    );
    storage.bookmarks = storage.bookmarks.filter(b => b.bookId !== id);
    storage.annotations = storage.annotations.filter(a => a.bookId !== id);
    storage.readingProgress = storage.readingProgress.filter(
      rp => rp.bookId !== id,
    );
  }

  async searchBooks(query: string): Promise<Book[]> {
    const lowerQuery = query.toLowerCase();
    return storage.books.filter(
      b =>
        b.title.toLowerCase().includes(lowerQuery) ||
        b.author.toLowerCase().includes(lowerQuery),
    );
  }

  async getFavoriteBooks(): Promise<Book[]> {
    return storage.books.filter(b => b.isFavorite);
  }

  async getRecentBooks(limit: number): Promise<Book[]> {
    return storage.books
      .filter(b => b.lastReadAt)
      .sort(
        (a, b) =>
          (b.lastReadAt?.getTime() || 0) - (a.lastReadAt?.getTime() || 0),
      )
      .slice(0, limit);
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return [...storage.categories];
  }

  async createCategory(category: Category): Promise<void> {
    storage.categories.push(category);
  }

  async deleteCategory(id: string): Promise<void> {
    storage.categories = storage.categories.filter(c => c.id !== id);
    storage.bookCategories = storage.bookCategories.filter(
      bc => bc.categoryId !== id,
    );
  }

  async addBookToCategory(bookId: string, categoryId: string): Promise<void> {
    const exists = storage.bookCategories.some(
      bc => bc.bookId === bookId && bc.categoryId === categoryId,
    );
    if (!exists) {
      storage.bookCategories.push({ bookId, categoryId });
    }
  }

  async removeBookFromCategory(
    bookId: string,
    categoryId: string,
  ): Promise<void> {
    storage.bookCategories = storage.bookCategories.filter(
      bc => !(bc.bookId === bookId && bc.categoryId === categoryId),
    );
  }

  async getBooksByCategory(categoryId: string): Promise<Book[]> {
    const bookIds = storage.bookCategories
      .filter(bc => bc.categoryId === categoryId)
      .map(bc => bc.bookId);
    return storage.books.filter(b => bookIds.includes(b.id));
  }

  // Bookmarks
  async addBookmark(bookmark: Bookmark): Promise<void> {
    storage.bookmarks.push(bookmark);
  }

  async getBookmarks(bookId: string): Promise<Bookmark[]> {
    return storage.bookmarks.filter(b => b.bookId === bookId);
  }

  async deleteBookmark(id: string): Promise<void> {
    storage.bookmarks = storage.bookmarks.filter(b => b.id !== id);
  }

  // Annotations
  async addAnnotation(annotation: Annotation): Promise<void> {
    storage.annotations.push(annotation);
  }

  async getAnnotations(bookId: string): Promise<Annotation[]> {
    return storage.annotations.filter(a => a.bookId === bookId);
  }

  async deleteAnnotation(id: string): Promise<void> {
    storage.annotations = storage.annotations.filter(a => a.id !== id);
  }

  // Reading Progress
  async updateReadingProgress(progress: ReadingProgress): Promise<void> {
    const index = storage.readingProgress.findIndex(
      rp => rp.bookId === progress.bookId,
    );
    if (index !== -1) {
      storage.readingProgress[index] = progress;
    } else {
      storage.readingProgress.push(progress);
    }
  }

  async getReadingProgress(bookId: string): Promise<ReadingProgress | null> {
    return storage.readingProgress.find(rp => rp.bookId === bookId) || null;
  }

  // Stats
  async getReadingStats(): Promise<{ totalTime: number; totalPages: number }> {
    return storage.readingProgress.reduce(
      (acc, rp) => ({
        totalTime: acc.totalTime + (rp.timeSpent || 0),
        totalPages: acc.totalPages + (rp.currentPage || 0),
      }),
      { totalTime: 0, totalPages: 0 },
    );
  }
}

export default new DatabaseService();

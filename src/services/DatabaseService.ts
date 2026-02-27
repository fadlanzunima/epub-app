import * as SQLite from 'expo-sqlite';
import {
  Book,
  Category,
  Bookmark,
  Annotation,
  ReadingProgress,
} from '../types';

const DATABASE_NAME = 'EReader.db';

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  async init(): Promise<void> {
    this.db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    await this.createTables();
  }

  private async createTables(): Promise<void> {
    if (!this.db) return;

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS books (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        description TEXT,
        filePath TEXT NOT NULL,
        fileType TEXT NOT NULL,
        coverImage TEXT,
        addedAt INTEGER NOT NULL,
        lastReadAt INTEGER,
        totalPages INTEGER DEFAULT 0,
        currentPage INTEGER DEFAULT 0,
        currentCfi TEXT,
        readingTime INTEGER DEFAULT 0,
        isFavorite INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        sortOrder INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS book_categories (
        bookId TEXT NOT NULL,
        categoryId TEXT NOT NULL,
        PRIMARY KEY (bookId, categoryId),
        FOREIGN KEY (bookId) REFERENCES books(id) ON DELETE CASCADE,
        FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS bookmarks (
        id TEXT PRIMARY KEY,
        bookId TEXT NOT NULL,
        cfi TEXT,
        page INTEGER,
        createdAt INTEGER NOT NULL,
        note TEXT,
        FOREIGN KEY (bookId) REFERENCES books(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS annotations (
        id TEXT PRIMARY KEY,
        bookId TEXT NOT NULL,
        cfi TEXT NOT NULL,
        text TEXT NOT NULL,
        note TEXT,
        color TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        FOREIGN KEY (bookId) REFERENCES books(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS reading_progress (
        id TEXT PRIMARY KEY,
        bookId TEXT NOT NULL,
        date INTEGER NOT NULL,
        pagesRead INTEGER DEFAULT 0,
        timeSpent INTEGER DEFAULT 0,
        FOREIGN KEY (bookId) REFERENCES books(id) ON DELETE CASCADE
      );
    `);
  }

  // Books
  async addBook(book: Book): Promise<void> {
    if (!this.db) return;
    await this.db.runAsync(
      `INSERT INTO books (id, title, author, description, filePath, fileType, coverImage,
        addedAt, lastReadAt, totalPages, currentPage, currentCfi, readingTime, isFavorite)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        book.id,
        book.title,
        book.author,
        book.description || '',
        book.filePath,
        book.fileType,
        book.coverImage || '',
        book.addedAt.getTime(),
        book.lastReadAt?.getTime() || null,
        book.totalPages,
        book.currentPage,
        book.currentCfi || '',
        book.readingTime,
        book.isFavorite ? 1 : 0,
      ],
    );
  }

  async updateBook(book: Book): Promise<void> {
    if (!this.db) return;
    await this.db.runAsync(
      `UPDATE books SET title = ?, author = ?, description = ?, filePath = ?, fileType = ?,
        coverImage = ?, addedAt = ?, lastReadAt = ?, totalPages = ?, currentPage = ?,
        currentCfi = ?, readingTime = ?, isFavorite = ?
      WHERE id = ?`,
      [
        book.title,
        book.author,
        book.description || '',
        book.filePath,
        book.fileType,
        book.coverImage || '',
        book.addedAt.getTime(),
        book.lastReadAt?.getTime() || null,
        book.totalPages,
        book.currentPage,
        book.currentCfi || '',
        book.readingTime,
        book.isFavorite ? 1 : 0,
        book.id,
      ],
    );
  }

  async deleteBook(id: string): Promise<void> {
    if (!this.db) return;
    await this.db.runAsync('DELETE FROM books WHERE id = ?', [id]);
  }

  async getBooks(): Promise<Book[]> {
    if (!this.db) return [];
    const rows = await this.db.getAllAsync<any>(
      'SELECT * FROM books ORDER BY addedAt DESC',
    );
    return rows.map(this.rowToBook);
  }

  async getBookById(id: string): Promise<Book | null> {
    if (!this.db) return null;
    const row = await this.db.getFirstAsync<any>(
      'SELECT * FROM books WHERE id = ?',
      [id],
    );
    if (!row) return null;
    return this.rowToBook(row);
  }

  async searchBooks(query: string): Promise<Book[]> {
    if (!this.db) return [];
    const rows = await this.db.getAllAsync<any>(
      'SELECT * FROM books WHERE title LIKE ? OR author LIKE ? ORDER BY title',
      [`%${query}%`, `%${query}%`],
    );
    return rows.map(this.rowToBook);
  }

  // Categories
  async addCategory(category: Category): Promise<void> {
    if (!this.db) return;
    await this.db.runAsync(
      'INSERT INTO categories (id, name, color, sortOrder) VALUES (?, ?, ?, ?)',
      [category.id, category.name, category.color, category.sortOrder],
    );
  }

  async getCategories(): Promise<Category[]> {
    if (!this.db) return [];
    const rows = await this.db.getAllAsync<any>(
      'SELECT * FROM categories ORDER BY sortOrder',
    );
    return rows;
  }

  async deleteCategory(id: string): Promise<void> {
    if (!this.db) return;
    await this.db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
  }

  // Book-Category relationships
  async addBookToCategory(bookId: string, categoryId: string): Promise<void> {
    if (!this.db) return;
    await this.db.runAsync(
      'INSERT OR IGNORE INTO book_categories (bookId, categoryId) VALUES (?, ?)',
      [bookId, categoryId],
    );
  }

  async removeBookFromCategory(
    bookId: string,
    categoryId: string,
  ): Promise<void> {
    if (!this.db) return;
    await this.db.runAsync(
      'DELETE FROM book_categories WHERE bookId = ? AND categoryId = ?',
      [bookId, categoryId],
    );
  }

  async getBooksByCategory(categoryId: string): Promise<Book[]> {
    if (!this.db) return [];
    const rows = await this.db.getAllAsync<any>(
      `SELECT b.* FROM books b
       INNER JOIN book_categories bc ON b.id = bc.bookId
       WHERE bc.categoryId = ?
       ORDER BY b.addedAt DESC`,
      [categoryId],
    );
    return rows.map(this.rowToBook);
  }

  // Bookmarks
  async addBookmark(bookmark: Bookmark): Promise<void> {
    if (!this.db) return;
    await this.db.runAsync(
      'INSERT INTO bookmarks (id, bookId, cfi, page, createdAt, note) VALUES (?, ?, ?, ?, ?, ?)',
      [
        bookmark.id,
        bookmark.bookId,
        bookmark.cfi || '',
        bookmark.page || 0,
        bookmark.createdAt.getTime(),
        bookmark.note || '',
      ],
    );
  }

  async getBookmarksByBook(bookId: string): Promise<Bookmark[]> {
    if (!this.db) return [];
    const rows = await this.db.getAllAsync<any>(
      'SELECT * FROM bookmarks WHERE bookId = ? ORDER BY createdAt DESC',
      [bookId],
    );
    return rows.map((row: any) => ({
      id: row.id,
      bookId: row.bookId,
      cfi: row.cfi,
      page: row.page,
      createdAt: new Date(row.createdAt),
      note: row.note,
    }));
  }

  async deleteBookmark(id: string): Promise<void> {
    if (!this.db) return;
    await this.db.runAsync('DELETE FROM bookmarks WHERE id = ?', [id]);
  }

  // Annotations
  async addAnnotation(annotation: Annotation): Promise<void> {
    if (!this.db) return;
    await this.db.runAsync(
      'INSERT INTO annotations (id, bookId, cfi, text, note, color, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        annotation.id,
        annotation.bookId,
        annotation.cfi,
        annotation.text,
        annotation.note || '',
        annotation.color,
        annotation.createdAt.getTime(),
      ],
    );
  }

  async getAnnotationsByBook(bookId: string): Promise<Annotation[]> {
    if (!this.db) return [];
    const rows = await this.db.getAllAsync<any>(
      'SELECT * FROM annotations WHERE bookId = ? ORDER BY createdAt DESC',
      [bookId],
    );
    return rows.map((row: any) => ({
      id: row.id,
      bookId: row.bookId,
      cfi: row.cfi,
      text: row.text,
      note: row.note,
      color: row.color,
      createdAt: new Date(row.createdAt),
    }));
  }

  async deleteAnnotation(id: string): Promise<void> {
    if (!this.db) return;
    await this.db.runAsync('DELETE FROM annotations WHERE id = ?', [id]);
  }

  // Reading Progress
  async addReadingProgress(progress: ReadingProgress): Promise<void> {
    if (!this.db) return;
    await this.db.runAsync(
      'INSERT INTO reading_progress (id, bookId, date, pagesRead, timeSpent) VALUES (?, ?, ?, ?, ?)',
      [
        progress.id,
        progress.bookId,
        progress.date.getTime(),
        progress.pagesRead,
        progress.timeSpent,
      ],
    );
  }

  async getReadingProgressByBook(bookId: string): Promise<ReadingProgress[]> {
    if (!this.db) return [];
    const rows = await this.db.getAllAsync<any>(
      'SELECT * FROM reading_progress WHERE bookId = ? ORDER BY date DESC',
      [bookId],
    );
    return rows.map((row: any) => ({
      id: row.id,
      bookId: row.bookId,
      date: new Date(row.date),
      pagesRead: row.pagesRead,
      timeSpent: row.timeSpent,
    }));
  }

  async getTotalReadingStats(): Promise<{
    totalTime: number;
    totalPages: number;
  }> {
    if (!this.db) return { totalTime: 0, totalPages: 0 };
    const row = await this.db.getFirstAsync<any>(
      'SELECT SUM(timeSpent) as totalTime, SUM(pagesRead) as totalPages FROM reading_progress',
    );
    return {
      totalTime: row?.totalTime || 0,
      totalPages: row?.totalPages || 0,
    };
  }

  private rowToBook(row: any): Book {
    return {
      id: row.id,
      title: row.title,
      author: row.author,
      description: row.description,
      filePath: row.filePath,
      fileType: row.fileType,
      coverImage: row.coverImage,
      addedAt: new Date(row.addedAt),
      lastReadAt: row.lastReadAt ? new Date(row.lastReadAt) : undefined,
      totalPages: row.totalPages,
      currentPage: row.currentPage,
      currentCfi: row.currentCfi,
      readingTime: row.readingTime,
      isFavorite: row.isFavorite === 1,
    };
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db = null;
    }
  }
}

export default new DatabaseService();

import {
  Book,
  BookFormat,
  Category,
  Bookmark,
  Annotation,
  ReadingProgress,
} from '../types';
import DatabaseService from './DatabaseService';
import * as FileSystem from 'expo-file-system';
import { v4 as uuidv4 } from 'uuid';

const BOOKS_DIR = `${FileSystem.documentDirectory}books/`;
const COVERS_DIR = `${FileSystem.documentDirectory}covers/`;

class BookService {
  async initialize(): Promise<void> {
    await DatabaseService.init();
    await this.ensureDirectories();
  }

  private async ensureDirectories(): Promise<void> {
    const booksDirInfo = await FileSystem.getInfoAsync(BOOKS_DIR);
    if (!booksDirInfo.exists) {
      await FileSystem.makeDirectoryAsync(BOOKS_DIR, { intermediates: true });
    }
    const coversDirInfo = await FileSystem.getInfoAsync(COVERS_DIR);
    if (!coversDirInfo.exists) {
      await FileSystem.makeDirectoryAsync(COVERS_DIR, { intermediates: true });
    }
  }

  async importBook(sourcePath: string, fileType: BookFormat): Promise<Book> {
    const fileName = sourcePath.split('/').pop() || 'unknown';
    const bookId = uuidv4();
    const destPath = `${BOOKS_DIR}${bookId}_${fileName}`;

    // Copy file to app storage
    await FileSystem.copyAsync({ from: sourcePath, to: destPath });

    // Extract metadata (basic implementation)
    const metadata = await this.extractMetadata(destPath, fileType);

    // Generate cover image placeholder
    const coverPath = `${COVERS_DIR}${bookId}.jpg`;

    const book: Book = {
      id: bookId,
      title: metadata.title || fileName.replace(/\.[^/.]+$/, ''),
      author: metadata.author || 'Unknown Author',
      description: metadata.description || '',
      filePath: destPath,
      fileType,
      coverImage: coverPath,
      addedAt: new Date(),
      totalPages: metadata.totalPages || 0,
      currentPage: 0,
      readingTime: 0,
      isFavorite: false,
    };

    await DatabaseService.addBook(book);
    return book;
  }

  private async extractMetadata(
    _filePath: string,
    _fileType: BookFormat,
  ): Promise<{
    title?: string;
    author?: string;
    description?: string;
    totalPages?: number;
  }> {
    // TODO: Implement proper metadata extraction for each format
    return {};
  }

  async getAllBooks(): Promise<Book[]> {
    return DatabaseService.getBooks();
  }

  async getBookById(id: string): Promise<Book | null> {
    return DatabaseService.getBookById(id);
  }

  async updateBook(book: Book): Promise<void> {
    await DatabaseService.updateBook(book);
  }

  async deleteBook(id: string): Promise<void> {
    const book = await DatabaseService.getBookById(id);
    if (book) {
      // Delete file from storage
      const fileInfo = await FileSystem.getInfoAsync(book.filePath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(book.filePath);
      }
      if (book.coverImage) {
        const coverInfo = await FileSystem.getInfoAsync(book.coverImage);
        if (coverInfo.exists) {
          await FileSystem.deleteAsync(book.coverImage);
        }
      }
      // Delete from database
      await DatabaseService.deleteBook(id);
    }
  }

  async searchBooks(query: string): Promise<Book[]> {
    return DatabaseService.searchBooks(query);
  }

  async toggleFavorite(id: string): Promise<void> {
    const book = await DatabaseService.getBookById(id);
    if (book) {
      book.isFavorite = !book.isFavorite;
      await DatabaseService.updateBook(book);
    }
  }

  async updateReadingProgress(
    bookId: string,
    currentPage: number,
    currentCfi?: string,
  ): Promise<void> {
    const book = await DatabaseService.getBookById(bookId);
    if (book) {
      book.currentPage = currentPage;
      book.currentCfi = currentCfi;
      book.lastReadAt = new Date();
      await DatabaseService.updateBook(book);
    }
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return DatabaseService.getCategories();
  }

  async createCategory(name: string, color: string): Promise<Category> {
    const categories = await DatabaseService.getCategories();
    const category: Category = {
      id: uuidv4(),
      name,
      color,
      sortOrder: categories.length,
    };
    await DatabaseService.addCategory(category);
    return category;
  }

  async deleteCategory(id: string): Promise<void> {
    await DatabaseService.deleteCategory(id);
  }

  async addBookToCategory(bookId: string, categoryId: string): Promise<void> {
    await DatabaseService.addBookToCategory(bookId, categoryId);
  }

  async removeBookFromCategory(
    bookId: string,
    categoryId: string,
  ): Promise<void> {
    await DatabaseService.removeBookFromCategory(bookId, categoryId);
  }

  async getBooksByCategory(categoryId: string): Promise<Book[]> {
    return DatabaseService.getBooksByCategory(categoryId);
  }

  // Bookmarks
  async addBookmark(
    bookId: string,
    cfi: string,
    page?: number,
    note?: string,
  ): Promise<Bookmark> {
    const bookmark: Bookmark = {
      id: uuidv4(),
      bookId,
      cfi,
      page,
      createdAt: new Date(),
      note,
    };
    await DatabaseService.addBookmark(bookmark);
    return bookmark;
  }

  async getBookmarks(bookId: string): Promise<Bookmark[]> {
    return DatabaseService.getBookmarksByBook(bookId);
  }

  async deleteBookmark(id: string): Promise<void> {
    await DatabaseService.deleteBookmark(id);
  }

  // Annotations
  async addAnnotation(
    bookId: string,
    cfi: string,
    text: string,
    color: string,
    note?: string,
  ): Promise<Annotation> {
    const annotation: Annotation = {
      id: uuidv4(),
      bookId,
      cfi,
      text,
      note,
      color,
      createdAt: new Date(),
    };
    await DatabaseService.addAnnotation(annotation);
    return annotation;
  }

  async getAnnotations(bookId: string): Promise<Annotation[]> {
    return DatabaseService.getAnnotationsByBook(bookId);
  }

  async deleteAnnotation(id: string): Promise<void> {
    await DatabaseService.deleteAnnotation(id);
  }

  // Reading Progress Tracking
  async trackReadingSession(
    bookId: string,
    pagesRead: number,
    timeSpent: number,
  ): Promise<void> {
    const progress: ReadingProgress = {
      id: uuidv4(),
      bookId,
      date: new Date(),
      pagesRead,
      timeSpent,
    };
    await DatabaseService.addReadingProgress(progress);
  }

  async getReadingStats(): Promise<{ totalTime: number; totalPages: number }> {
    return DatabaseService.getTotalReadingStats();
  }
}

export default new BookService();

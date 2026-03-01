import {
  Book,
  BookFormat,
  Category,
  Bookmark,
  Annotation,
  ReadingProgress,
} from '../types';
import DatabaseService from './DatabaseService';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import JSZip from 'jszip';

const BOOKS_DIR = FileSystem.documentDirectory
  ? `${FileSystem.documentDirectory}books/`
  : '';
const COVERS_DIR = FileSystem.documentDirectory
  ? `${FileSystem.documentDirectory}covers/`
  : '';

class BookService {
  async initialize(): Promise<void> {
    try {
      console.log('BookService: Initializing...');
      await DatabaseService.init();
      console.log('BookService: Database initialized successfully');
      // Skip directory creation on web - file system not available
      if (Platform.OS !== 'web') {
        await this.ensureDirectories();
        console.log('BookService: Directories ensured');
      }
      console.log('BookService: Initialization complete');
    } catch (error) {
      console.error('BookService: Initialization failed:', error);
      throw error;
    }
  }

  private async ensureDirectories(): Promise<void> {
    if (Platform.OS === 'web' || !BOOKS_DIR || !COVERS_DIR) return;

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
    console.log('BookService: Starting importBook', {
      sourcePath: sourcePath.substring(0, 50) + '...',
      fileType,
    });
    const fileName = sourcePath.split('/').pop() || 'unknown';
    const bookId = uuidv4();
    const destPath =
      Platform.OS === 'web' ? sourcePath : `${BOOKS_DIR}${bookId}_${fileName}`;
    console.log(
      'BookService: Generated bookId:',
      bookId,
      'destPath:',
      destPath.substring(0, 50) + '...',
    );

    // On native: Copy file to app storage
    // On web: Keep the original URI (blob/ObjectURL)
    if (Platform.OS !== 'web') {
      console.log('BookService: Copying file to app storage...');
      await FileSystem.copyAsync({ from: sourcePath, to: destPath });
      console.log('BookService: File copied successfully');
    } else {
      console.log('BookService: Running on web, skipping file copy');
    }

    // Extract metadata (basic implementation)
    console.log('BookService: Extracting metadata...');
    const metadata = await this.extractMetadata(destPath, fileType);
    console.log('BookService: Metadata extracted:', metadata);

    // Generate cover image placeholder
    const coverPath = Platform.OS === 'web' ? '' : `${COVERS_DIR}${bookId}.jpg`;

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
    console.log('BookService: Created book object:', {
      id: book.id,
      title: book.title,
    });

    console.log('BookService: Adding book to database...');
    await DatabaseService.addBook(book);
    console.log('BookService: Book added to database successfully');
    return book;
  }

  private async extractMetadata(
    filePath: string,
    fileType: BookFormat,
  ): Promise<{
    title?: string;
    author?: string;
    description?: string;
    totalPages?: number;
  }> {
    if (fileType === 'epub') {
      return this.extractEpubMetadata(filePath);
    }
    return {};
  }

  private async extractEpubMetadata(filePath: string): Promise<{
    title?: string;
    author?: string;
    description?: string;
  }> {
    try {
      console.log(
        'BookService: Extracting EPUB metadata from:',
        filePath.substring(0, 50) + '...',
      );

      // Read the EPUB file as base64
      const fileContent = await FileSystem.readAsStringAsync(filePath, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Load with JSZip
      const zip = await JSZip.loadAsync(fileContent, { base64: true });

      // Read META-INF/container.xml to find the OPF file
      const containerFile = zip.file('META-INF/container.xml');
      if (!containerFile) {
        console.log('BookService: No container.xml found');
        return {};
      }

      const containerContent = await containerFile.async('text');
      console.log(
        'BookService: Container.xml content:',
        containerContent.substring(0, 200),
      );

      // Extract OPF file path from container.xml
      const opfMatch = containerContent.match(/full-path="([^"]+)"/);
      if (!opfMatch) {
        console.log('BookService: No OPF path found in container.xml');
        return {};
      }

      const opfPath = opfMatch[1];
      console.log('BookService: OPF path:', opfPath);

      // Read the OPF file
      const opfFile = zip.file(opfPath);
      if (!opfFile) {
        console.log('BookService: OPF file not found:', opfPath);
        return {};
      }

      const opfContent = await opfFile.async('text');
      console.log('BookService: OPF content:', opfContent.substring(0, 500));

      // Parse metadata from OPF
      const metadata: {
        title?: string;
        author?: string;
        description?: string;
      } = {};

      // Extract title
      const titleMatch = opfContent.match(
        /<dc:title[^>]*>([^<]+)<\/dc:title>/i,
      );
      if (titleMatch) {
        metadata.title = titleMatch[1].trim();
        console.log('BookService: Found title:', metadata.title);
      }

      // Extract author (creator)
      const authorMatch = opfContent.match(
        /<dc:creator[^>]*>([^<]+)<\/dc:creator>/i,
      );
      if (authorMatch) {
        metadata.author = authorMatch[1].trim();
        console.log('BookService: Found author:', metadata.author);
      }

      // Extract description
      const descMatch = opfContent.match(
        /<dc:description[^>]*>([^<]+)<\/dc:description>/i,
      );
      if (descMatch) {
        metadata.description = descMatch[1].trim();
        console.log(
          'BookService: Found description:',
          metadata.description.substring(0, 100),
        );
      }

      return metadata;
    } catch (error) {
      console.error('BookService: Failed to extract EPUB metadata:', error);
      return {};
    }
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
      // On native: Delete file from storage
      // On web: Skip file system operations
      if (Platform.OS !== 'web') {
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

  // Category management
  async getCategories(): Promise<Category[]> {
    return DatabaseService.getCategories();
  }

  async createCategory(name: string, color: string): Promise<Category> {
    const category: Category = {
      id: uuidv4(),
      name,
      color,
      createdAt: new Date(),
    };
    return DatabaseService.addCategory(category);
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

  // Bookmark management
  async addBookmark(
    bookId: string,
    cfi: string,
    title?: string,
  ): Promise<Bookmark> {
    const bookmark: Bookmark = {
      id: uuidv4(),
      bookId,
      cfi,
      title,
      createdAt: new Date(),
    };
    return DatabaseService.addBookmark(bookmark);
  }

  async getBookmarks(bookId: string): Promise<Bookmark[]> {
    return DatabaseService.getBookmarksByBook(bookId);
  }

  async deleteBookmark(id: string): Promise<void> {
    await DatabaseService.deleteBookmark(id);
  }

  // Annotation management
  async addAnnotation(
    bookId: string,
    cfi: string,
    text: string,
    note?: string,
    color?: string,
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
    return DatabaseService.addAnnotation(annotation);
  }

  async getAnnotations(bookId: string): Promise<Annotation[]> {
    return DatabaseService.getAnnotationsByBookId(bookId);
  }

  async deleteAnnotation(id: string): Promise<void> {
    await DatabaseService.deleteAnnotation(id);
  }

  // Reading progress tracking
  async updateReadingTime(bookId: string, timeSpent: number): Promise<void> {
    const book = await DatabaseService.getBookById(bookId);
    if (book) {
      book.readingTime += timeSpent;
      await DatabaseService.updateBook(book);
    }
  }

  async getReadingStats(): Promise<{ totalTime: number; totalPages: number }> {
    return DatabaseService.getReadingStats();
  }
}

export default new BookService();

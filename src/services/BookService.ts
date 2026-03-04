import { Book, BookFormat, Category, Bookmark, Annotation } from '../types';
import DatabaseService from './DatabaseService';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import JSZip from 'jszip';
import { extractPdfMetadata } from '../utils/pdfHelpers';
import {
  BUNDLE_DEFAULT_BOOKS,
  DEFAULT_BOOKS_URLS,
  DEFAULT_BOOKS_ASSETS,
  DEFAULT_BOOKS_METADATA,
  DEFAULT_BOOKS_COVERS,
} from '../config/defaultBooks';
import { Asset } from 'expo-asset';

// Callback for download progress updates
export type DownloadProgressCallback = (
  bookId: string,
  progress: number, // 0-100
  bytesDownloaded: number,
  totalBytes: number,
) => void;

let downloadProgressCallback: DownloadProgressCallback | null = null;

export function setDownloadProgressCallback(
  callback: DownloadProgressCallback | null,
): void {
  downloadProgressCallback = callback;
}

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
        // Seed default books on native platforms
        await this.seedDefaultBooks();
      }
      console.log('BookService: Initialization complete');
    } catch (error) {
      console.error('BookService: Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Seed default books on first app launch
   *
   * Mode 1 - Bundled (BUNDLE_DEFAULT_BOOKS = true):
   *   EPUBs are bundled with the app and copied to app storage
   *   Use this for production builds
   *
   * Mode 2 - Download (BUNDLE_DEFAULT_BOOKS = false):
   *   EPUBs are downloaded from server URLs
   *   Use this for development or to keep app size small
   *
   * Default books get IDs: default-1, default-2, default-3
   * User books will start appearing after these (conceptually position 4+)
   */
  private async seedDefaultBooks(): Promise<void> {
    try {
      console.log('[DEBUG] BookService: ====================================');
      console.log('[DEBUG] BookService: Starting default books setup');
      console.log(
        '[DEBUG] BookService: BUNDLE_DEFAULT_BOOKS =',
        BUNDLE_DEFAULT_BOOKS,
      );
      console.log(
        '[DEBUG] BookService: Mode =',
        BUNDLE_DEFAULT_BOOKS
          ? 'BUNDLED (local assets)'
          : 'DOWNLOAD (GitHub URLs)',
      );
      console.log('[DEBUG] BookService: ====================================');

      const existingBooks = await DatabaseService.getBooks();
      const existingDefaultBooks = existingBooks.filter(book =>
        book.id.startsWith('default-'),
      );

      console.log(
        '[DEBUG] BookService: Found',
        existingBooks.length,
        'total books in database',
      );
      console.log(
        '[DEBUG] BookService: Found',
        existingDefaultBooks.length,
        'default books already seeded',
      );
      console.log(
        '[DEBUG] BookService: Total default books expected:',
        DEFAULT_BOOKS_METADATA.length,
      );

      // If all default books already exist, skip seeding
      if (existingDefaultBooks.length === DEFAULT_BOOKS_METADATA.length) {
        console.log(
          '[DEBUG] BookService: All default books already available - skipping setup',
        );
        return;
      }

      const booksToSetup =
        DEFAULT_BOOKS_METADATA.length - existingDefaultBooks.length;
      console.log(
        '[DEBUG] BookService: Need to setup',
        booksToSetup,
        'default books',
      );

      for (const defaultBook of DEFAULT_BOOKS_METADATA) {
        console.log(
          '[DEBUG] BookService: ----------------------------------------',
        );
        console.log('[DEBUG] BookService: Processing book:', defaultBook.id);
        console.log('[DEBUG] BookService: Title:', defaultBook.title);
        console.log('[DEBUG] BookService: Filename:', defaultBook.fileName);

        // Check if this default book already exists
        const existingBook = existingBooks.find(
          book => book.id === defaultBook.id,
        );
        if (existingBook) {
          console.log(
            '[DEBUG] BookService: Book already exists, skipping:',
            defaultBook.title,
          );
          continue;
        }

        console.log(
          '[DEBUG] BookService: Book not found, will download from GitHub',
        );

        try {
          const destPath = `${BOOKS_DIR}${defaultBook.id}_${defaultBook.fileName}`;
          console.log('[DEBUG] BookService: Destination path:', destPath);

          if (BUNDLE_DEFAULT_BOOKS) {
            // Mode 1: Copy from bundled assets
            console.log('[DEBUG] BookService: Using BUNDLED mode');
            await this.seedBundledDefaultBook(defaultBook, destPath);
          } else {
            // Mode 2: Download from server
            console.log('[DEBUG] BookService: Using DOWNLOAD mode (GitHub)');
            await this.seedDownloadedDefaultBook(defaultBook, destPath);
          }
          console.log(
            '[DEBUG] BookService: Successfully setup book:',
            defaultBook.title,
          );
        } catch (error) {
          console.error(
            '[DEBUG] BookService: FAILED to setup book:',
            defaultBook.title,
          );
          console.error('[DEBUG] BookService: Error:', error);
        }
      }

      console.log('[DEBUG] BookService: ====================================');
      console.log('[DEBUG] BookService: Default books setup complete');
      console.log('[DEBUG] BookService: ====================================');
    } catch (error) {
      console.error('BookService: Error in seedDefaultBooks:', error);
      // Don't throw - app should still work even if default books fail
    }
  }

  /**
   * Seed a default book from bundled assets
   */
  private async seedBundledDefaultBook(
    defaultBook: (typeof DEFAULT_BOOKS_METADATA)[0],
    destPath: string,
  ): Promise<void> {
    console.log('BookService: Copying bundled asset:', defaultBook.title);

    // Load the bundled asset
    const assetModule =
      DEFAULT_BOOKS_ASSETS[defaultBook.id as keyof typeof DEFAULT_BOOKS_ASSETS];
    const asset = Asset.fromModule(assetModule);
    await asset.downloadAsync();

    if (!asset.localUri) {
      throw new Error(`Failed to load bundled asset: ${defaultBook.fileName}`);
    }

    // Copy to app's books directory
    await FileSystem.copyAsync({
      from: asset.localUri,
      to: destPath,
    });

    console.log('BookService: Copied bundled asset to:', destPath);

    // Create book record
    await this.createDefaultBookRecord(defaultBook, destPath);
  }

  /**
   * Seed a default book by downloading from server
   */
  private async seedDownloadedDefaultBook(
    defaultBook: (typeof DEFAULT_BOOKS_METADATA)[0],
    destPath: string,
  ): Promise<void> {
    const downloadUrl =
      DEFAULT_BOOKS_URLS[defaultBook.id as keyof typeof DEFAULT_BOOKS_URLS];

    console.log('[DEBUG] BookService: Starting download from GitHub');
    console.log('[DEBUG] BookService: Book ID:', defaultBook.id);
    console.log('[DEBUG] BookService: Title:', defaultBook.title);
    console.log('[DEBUG] BookService: URL:', downloadUrl);
    console.log('[DEBUG] BookService: Destination:', destPath);

    // Report start of download
    if (downloadProgressCallback) {
      downloadProgressCallback(defaultBook.id, 0, 0, defaultBook.fileSize);
    }

    // Download the EPUB file from server with progress tracking
    const downloadResumable = FileSystem.createDownloadResumable(
      downloadUrl,
      destPath,
      {},
      downloadProgress => {
        const progress =
          downloadProgress.totalBytesWritten /
          downloadProgress.totalBytesExpectedToWrite;
        const percentProgress = Math.round(progress * 100);
        const mbWritten = (
          downloadProgress.totalBytesWritten /
          1024 /
          1024
        ).toFixed(2);
        const mbTotal = (
          downloadProgress.totalBytesExpectedToWrite /
          1024 /
          1024
        ).toFixed(2);

        console.log(
          `[DEBUG] BookService: Downloading ${defaultBook.title}: ${percentProgress}% (${mbWritten}MB / ${mbTotal}MB)`,
        );

        if (downloadProgressCallback) {
          downloadProgressCallback(
            defaultBook.id,
            percentProgress,
            downloadProgress.totalBytesWritten,
            downloadProgress.totalBytesExpectedToWrite,
          );
        }
      },
    );

    console.log('[DEBUG] BookService: Download started...');
    const downloadResult = await downloadResumable.downloadAsync();

    if (!downloadResult || downloadResult.status !== 200) {
      console.error('[DEBUG] BookService: Download failed!');
      console.error('[DEBUG] BookService: Status:', downloadResult?.status);
      console.error('[DEBUG] BookService: URI:', downloadResult?.uri);
      // Clean up partial download
      await FileSystem.deleteAsync(destPath, { idempotent: true });
      throw new Error(
        `Failed to download: ${defaultBook.fileName}, Status: ${downloadResult?.status}`,
      );
    }

    // Verify file exists and get size
    const fileInfo = await FileSystem.getInfoAsync(destPath);
    const fileSizeMB =
      fileInfo.exists && fileInfo.size
        ? (fileInfo.size / 1024 / 1024).toFixed(2)
        : 'unknown';

    console.log('[DEBUG] BookService: Download completed successfully!');
    console.log('[DEBUG] BookService: File:', defaultBook.fileName);
    console.log('[DEBUG] BookService: Saved to:', destPath);
    console.log('[DEBUG] BookService: File size:', fileSizeMB, 'MB');
    console.log('[DEBUG] BookService: HTTP Status:', downloadResult.status);

    // Create book record
    await this.createDefaultBookRecord(defaultBook, destPath);
    console.log(
      '[DEBUG] BookService: Database record created for:',
      defaultBook.title,
    );
  }

  /**
   * Create a book record in the database for a default book
   */
  private async createDefaultBookRecord(
    defaultBook: (typeof DEFAULT_BOOKS_METADATA)[0],
    destPath: string,
  ): Promise<void> {
    // Extract metadata from the EPUB
    const metadata = await this.extractEpubMetadata(destPath);

    // Copy cover asset to file system
    let coverImagePath = '';
    try {
      const coverAssetModule =
        DEFAULT_BOOKS_COVERS[
          defaultBook.id as keyof typeof DEFAULT_BOOKS_COVERS
        ];
      if (coverAssetModule) {
        const asset = Asset.fromModule(coverAssetModule);
        await asset.downloadAsync();
        if (asset.localUri) {
          const coverDestPath = `${COVERS_DIR}${defaultBook.id}.png`;
          await FileSystem.copyAsync({
            from: asset.localUri,
            to: coverDestPath,
          });
          coverImagePath = coverDestPath;
          console.log('[DEBUG] BookService: Copied cover to:', coverDestPath);
        }
      }
    } catch (error) {
      console.error('[DEBUG] BookService: Failed to copy cover:', error);
    }

    // Create book object with fixed default ID
    // Use filename (without extension) as title
    const fileNameWithoutExt = defaultBook.fileName.replace(/\.[^/.]+$/, '');
    const book: Book = {
      id: defaultBook.id,
      title: fileNameWithoutExt,
      author: metadata.author || defaultBook.author,
      description: metadata.description || defaultBook.description,
      filePath: destPath,
      fileType: 'epub',
      coverImage: coverImagePath,
      addedAt: new Date('2000-01-01'), // Default books have oldest date (appear first)
      totalPages: 0,
      currentPage: 0,
      readingTime: 0,
      isFavorite: false,
    };

    await DatabaseService.addBook(book);
    console.log('BookService: Added default book to library:', book.title);
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

    let fileCopied = false;

    try {
      // On native: Copy file to app storage
      // On web: Keep the original URI (blob/ObjectURL)
      if (Platform.OS !== 'web') {
        console.log('BookService: Copying file to app storage...');
        await FileSystem.copyAsync({ from: sourcePath, to: destPath });
        fileCopied = true;
        console.log('BookService: File copied successfully');
      } else {
        console.log('BookService: Running on web, skipping file copy');
      }

      // Extract metadata (basic implementation)
      console.log('BookService: Extracting metadata...');
      const originalFileName = fileName.replace(/\.[^/.]+$/, '');
      const metadata = await this.extractMetadata(
        destPath,
        fileType,
        originalFileName,
      );
      console.log('BookService: Metadata extracted:', metadata);

      // Generate cover image path
      // EPUB: will extract from file, PDF: no thumbnail for now (would need native library)
      let coverPath = '';
      if (Platform.OS !== 'web' && fileType === 'epub') {
        coverPath = `${COVERS_DIR}${bookId}.jpg`;
      }

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
        author: book.author,
        fileName: fileName,
        fileType: fileType,
        metadataTitle: metadata.title,
      });

      console.log('BookService: Adding book to database...');
      await DatabaseService.addBook(book);
      console.log('BookService: Book added to database successfully');

      return book;
    } catch (error) {
      // Rollback: Clean up copied file if database save failed
      if (fileCopied && Platform.OS !== 'web') {
        console.log('BookService: Rolling back - deleting copied file...');
        try {
          await FileSystem.deleteAsync(destPath, { idempotent: true });
          console.log('BookService: Rollback complete - file deleted');
        } catch (cleanupError) {
          console.error(
            'BookService: Failed to clean up file during rollback:',
            cleanupError,
          );
        }
      }
      throw error; // Re-throw for UI handling
    }
  }

  private async extractMetadata(
    filePath: string,
    fileType: BookFormat,
    originalFileName?: string,
  ): Promise<{
    title?: string;
    author?: string;
    description?: string;
    totalPages?: number;
  }> {
    if (fileType === 'epub') {
      return this.extractEpubMetadata(filePath);
    } else if (fileType === 'pdf') {
      const pdfMetadata = await extractPdfMetadata(filePath, originalFileName);
      // Always use filename for PDF title instead of metadata
      return {
        title: originalFileName || 'Untitled PDF',
        author: pdfMetadata.author || 'Unknown Author',
        description: pdfMetadata.subject,
        totalPages: pdfMetadata.pageCount,
      };
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

  async getCategoriesByBook(bookId: string): Promise<Category[]> {
    return DatabaseService.getCategoriesByBook(bookId);
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
    return DatabaseService.getAnnotationsByBook(bookId);
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
    return DatabaseService.getTotalReadingStats();
  }
}

export default new BookService();

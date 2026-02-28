/**
 * Database Schema Definition
 *
 * This file defines the database schema for SQLite/WatermelonDB.
 * It includes table definitions, indexes, and relationships.
 */

// Table names
export const Tables = {
  BOOKS: 'books',
  CATEGORIES: 'categories',
  BOOK_CATEGORIES: 'book_categories',
  BOOKMARKS: 'bookmarks',
  ANNOTATIONS: 'annotations',
  READING_PROGRESS: 'reading_progress',
} as const;

// Book table schema
export const BookTableSchema = `
  CREATE TABLE IF NOT EXISTS ${Tables.BOOKS} (
    id TEXT PRIMARY KEY NOT NULL,
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
`;

// Categories table schema
export const CategoryTableSchema = `
  CREATE TABLE IF NOT EXISTS ${Tables.CATEGORIES} (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    sortOrder INTEGER DEFAULT 0
  );
`;

// Book-Categories junction table schema
export const BookCategoryTableSchema = `
  CREATE TABLE IF NOT EXISTS ${Tables.BOOK_CATEGORIES} (
    bookId TEXT NOT NULL,
    categoryId TEXT NOT NULL,
    PRIMARY KEY (bookId, categoryId),
    FOREIGN KEY (bookId) REFERENCES ${Tables.BOOKS}(id) ON DELETE CASCADE,
    FOREIGN KEY (categoryId) REFERENCES ${Tables.CATEGORIES}(id) ON DELETE CASCADE
  );
`;

// Bookmarks table schema
export const BookmarkTableSchema = `
  CREATE TABLE IF NOT EXISTS ${Tables.BOOKMARKS} (
    id TEXT PRIMARY KEY NOT NULL,
    bookId TEXT NOT NULL,
    cfi TEXT,
    page INTEGER,
    createdAt INTEGER NOT NULL,
    note TEXT,
    FOREIGN KEY (bookId) REFERENCES ${Tables.BOOKS}(id) ON DELETE CASCADE
  );
`;

// Annotations table schema
export const AnnotationTableSchema = `
  CREATE TABLE IF NOT EXISTS ${Tables.ANNOTATIONS} (
    id TEXT PRIMARY KEY NOT NULL,
    bookId TEXT NOT NULL,
    cfi TEXT NOT NULL,
    text TEXT NOT NULL,
    note TEXT,
    color TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    FOREIGN KEY (bookId) REFERENCES ${Tables.BOOKS}(id) ON DELETE CASCADE
  );
`;

// Reading progress table schema
export const ReadingProgressTableSchema = `
  CREATE TABLE IF NOT EXISTS ${Tables.READING_PROGRESS} (
    id TEXT PRIMARY KEY NOT NULL,
    bookId TEXT NOT NULL,
    date INTEGER NOT NULL,
    pagesRead INTEGER DEFAULT 0,
    timeSpent INTEGER DEFAULT 0,
    FOREIGN KEY (bookId) REFERENCES ${Tables.BOOKS}(id) ON DELETE CASCADE
  );
`;

// Indexes for performance
export const IndexSchemas = [
  `CREATE INDEX IF NOT EXISTS idx_books_author ON ${Tables.BOOKS}(author);`,
  `CREATE INDEX IF NOT EXISTS idx_books_added_at ON ${Tables.BOOKS}(addedAt);`,
  `CREATE INDEX IF NOT EXISTS idx_books_last_read ON ${Tables.BOOKS}(lastReadAt);`,
  `CREATE INDEX IF NOT EXISTS idx_bookmarks_book_id ON ${Tables.BOOKMARKS}(bookId);`,
  `CREATE INDEX IF NOT EXISTS idx_annotations_book_id ON ${Tables.ANNOTATIONS}(bookId);`,
  `CREATE INDEX IF NOT EXISTS idx_reading_progress_book_id ON ${Tables.READING_PROGRESS}(bookId);`,
  `CREATE INDEX IF NOT EXISTS idx_reading_progress_date ON ${Tables.READING_PROGRESS}(date);`,
];

// All schemas combined
export const AllSchemas = [
  BookTableSchema,
  CategoryTableSchema,
  BookCategoryTableSchema,
  BookmarkTableSchema,
  AnnotationTableSchema,
  ReadingProgressTableSchema,
  ...IndexSchemas,
];

// Export model types
export type { BookModel } from './models/Book';
export type { CategoryModel, BookCategoryModel } from './models/Category';
export type { BookmarkModel } from './models/Bookmark';
export type { AnnotationModel } from './models/Annotation';
export type { ReadingProgressModel } from './models/ReadingProgress';

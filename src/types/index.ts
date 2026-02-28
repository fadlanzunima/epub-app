export type BookFormat = 'epub' | 'pdf' | 'mobi' | 'azw' | 'azw3';

export interface Book {
  id: string;
  title: string;
  author: string;
  description?: string;
  filePath: string;
  fileType: BookFormat;
  coverImage?: string;
  addedAt: Date;
  lastReadAt?: Date;
  totalPages: number;
  currentPage: number;
  currentCfi?: string;
  readingTime: number;
  isFavorite: boolean;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
}

export interface BookCategory {
  bookId: string;
  categoryId: string;
}

export interface Bookmark {
  id: string;
  bookId: string;
  cfi?: string;
  page?: number;
  createdAt: Date;
  note?: string;
}

export interface Annotation {
  id: string;
  bookId: string;
  cfi: string;
  text: string;
  note?: string;
  color: string;
  createdAt: Date;
}

export interface ReadingProgress {
  id: string;
  bookId: string;
  date: Date;
  pagesRead: number;
  timeSpent: number;
}

export interface ReaderSettings {
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  marginHorizontal: number;
  marginVertical: number;
  theme: 'light' | 'dark' | 'sepia';
  brightness: number;
}

export interface AppSettings {
  reader: ReaderSettings;
  keepScreenOn: boolean;
  showPageNumbers: boolean;
  syncEnabled: boolean;
  backupEnabled: boolean;
}

export interface Statistics {
  totalBooks: number;
  booksRead: number;
  totalReadingTime: number;
  currentStreak: number;
  longestStreak: number;
  pagesReadToday: number;
  weeklyProgress: ReadingProgress[];
}

export interface TocItem {
  label: string;
  href: string;
  subitems?: TocItem[];
}

export interface SearchResult {
  cfi: string;
  excerpt: string;
}

export type ThemeType = 'light' | 'dark' | 'sepia';

export interface ThemeColors {
  background: string;
  text: string;
  textSecondary: string;
  primary: string;
  surface: string;
  border: string;
  accent: string;
}

export const Themes: Record<ThemeType, ThemeColors> = {
  light: {
    background: '#FFFFFF',
    text: '#000000',
    textSecondary: '#666666',
    primary: '#6200EE',
    surface: '#F5F5F5',
    border: '#E0E0E0',
    accent: '#03DAC6',
  },
  dark: {
    background: '#121212',
    text: '#FFFFFF',
    textSecondary: '#AAAAAA',
    primary: '#BB86FC',
    surface: '#1E1E1E',
    border: '#333333',
    accent: '#03DAC6',
  },
  sepia: {
    background: '#F4ECD8',
    text: '#5B4636',
    textSecondary: '#8B7355',
    primary: '#8B4513',
    surface: '#E8DCC8',
    border: '#D4C4A8',
    accent: '#A0522D',
  },
};

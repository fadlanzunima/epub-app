import { create } from 'zustand';
import {
  Book,
  Category,
  ReaderSettings,
  ThemeType,
  Statistics,
} from '../types';

interface AppState {
  // Books
  books: Book[];
  setBooks: (books: Book[]) => void;
  addBook: (book: Book) => void;
  updateBook: (book: Book) => void;
  deleteBook: (id: string) => void;

  // Categories
  categories: Category[];
  setCategories: (categories: Category[]) => void;
  addCategory: (category: Category) => void;

  // Current Book
  currentBook: Book | null;
  setCurrentBook: (book: Book | null) => void;

  // Reader Settings
  readerSettings: ReaderSettings;
  setReaderSettings: (settings: ReaderSettings) => void;
  updateReaderSetting: <K extends keyof ReaderSettings>(
    key: K,
    value: ReaderSettings[K],
  ) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: Book[];
  setSearchResults: (results: Book[]) => void;

  // Statistics
  statistics: Statistics | null;
  setStatistics: (stats: Statistics) => void;

  // Loading
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // Theme
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

const defaultReaderSettings: ReaderSettings = {
  fontSize: 16,
  fontFamily: 'system',
  lineHeight: 1.5,
  marginHorizontal: 20,
  marginVertical: 20,
  theme: 'light',
  brightness: 1,
};

export const useStore = create<AppState>(set => ({
  // Books
  books: [],
  setBooks: books => set({ books }),
  addBook: book => set(state => ({ books: [book, ...state.books] })),
  updateBook: book =>
    set(state => ({
      books: state.books.map(b => (b.id === book.id ? book : b)),
    })),
  deleteBook: id =>
    set(state => ({
      books: state.books.filter(b => b.id !== id),
    })),

  // Categories
  categories: [],
  setCategories: categories => set({ categories }),
  addCategory: category =>
    set(state => ({
      categories: [...state.categories, category],
    })),

  // Current Book
  currentBook: null,
  setCurrentBook: book => set({ currentBook: book }),

  // Reader Settings
  readerSettings: defaultReaderSettings,
  setReaderSettings: settings => set({ readerSettings: settings }),
  updateReaderSetting: (key, value) =>
    set(state => ({
      readerSettings: { ...state.readerSettings, [key]: value },
    })),

  // Search
  searchQuery: '',
  setSearchQuery: query => set({ searchQuery: query }),
  searchResults: [],
  setSearchResults: results => set({ searchResults: results }),

  // Statistics
  statistics: null,
  setStatistics: stats => set({ statistics: stats }),

  // Loading
  isLoading: false,
  setIsLoading: loading => set({ isLoading: loading }),

  // Theme
  theme: 'light',
  setTheme: theme => set({ theme }),
}));

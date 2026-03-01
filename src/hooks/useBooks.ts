import { useState, useEffect, useCallback } from 'react';
import { Book } from '../types';
import BookService from '../services/BookService';

export interface UseBooksReturn {
  books: Book[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  addBook: (fileUri: string, fileType: Book['fileType']) => Promise<Book>;
  updateBook: (book: Book) => Promise<void>;
  deleteBook: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  getBookById: (id: string) => Book | undefined;
  searchBooks: (query: string) => Book[];
}

/**
 * Hook for managing book library
 */
export const useBooks = (): UseBooksReturn => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchBooks = useCallback(async () => {
    try {
      console.log('useBooks: Fetching books...');
      setLoading(true);
      setError(null);
      const fetchedBooks = await BookService.getAllBooks();
      console.log('useBooks: Fetched', fetchedBooks.length, 'books');
      if (fetchedBooks.length > 0) {
        console.log('useBooks: First book:', fetchedBooks[0].title);
      }
      setBooks(fetchedBooks);
    } catch (err) {
      console.error('useBooks: Error fetching books:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch books'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const refresh = useCallback(async () => {
    await fetchBooks();
  }, [fetchBooks]);

  const addBook = useCallback(
    async (fileUri: string, fileType: Book['fileType']): Promise<Book> => {
      const newBook = await BookService.importBook(fileUri, fileType);
      setBooks(prev => [...prev, newBook]);
      return newBook;
    },
    [],
  );

  const updateBook = useCallback(async (book: Book): Promise<void> => {
    await BookService.updateBook(book);
    setBooks(prev => prev.map(b => (b.id === book.id ? book : b)));
  }, []);

  const deleteBook = useCallback(async (id: string): Promise<void> => {
    await BookService.deleteBook(id);
    setBooks(prev => prev.filter(book => book.id !== id));
  }, []);

  const toggleFavorite = useCallback(async (id: string): Promise<void> => {
    await BookService.toggleFavorite(id);
    setBooks(prev =>
      prev.map(book =>
        book.id === id ? { ...book, isFavorite: !book.isFavorite } : book,
      ),
    );
  }, []);

  const getBookById = useCallback(
    (id: string): Book | undefined => {
      return books.find(book => book.id === id);
    },
    [books],
  );

  const searchBooks = useCallback(
    (query: string): Book[] => {
      const lowerQuery = query.toLowerCase();
      return books.filter(
        book =>
          book.title.toLowerCase().includes(lowerQuery) ||
          book.author.toLowerCase().includes(lowerQuery),
      );
    },
    [books],
  );

  return {
    books,
    loading,
    error,
    refresh,
    addBook,
    updateBook,
    deleteBook,
    toggleFavorite,
    getBookById,
    searchBooks,
  };
};

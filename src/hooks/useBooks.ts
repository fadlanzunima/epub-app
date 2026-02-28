import { useState, useEffect, useCallback } from 'react';
import { Book } from '../database/models/Book';
import { BookService } from '../services/BookService';

export interface UseBooksReturn {
  books: Book[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  addBook: (bookData: Partial<Book>) => Promise<Book>;
  updateBook: (id: string, updates: Partial<Book>) => Promise<void>;
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
      setLoading(true);
      setError(null);
      const fetchedBooks = await BookService.getAllBooks();
      setBooks(fetchedBooks);
    } catch (err) {
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

  const addBook = useCallback(async (bookData: Partial<Book>): Promise<Book> => {
    const newBook = await BookService.addBook(bookData);
    setBooks(prev => [...prev, newBook]);
    return newBook;
  }, []);

  const updateBook = useCallback(async (id: string, updates: Partial<Book>): Promise<void> => {
    await BookService.updateBook(id, updates);
    setBooks(prev =>
      prev.map(book =>
        book.id === id ? new Book({ ...book.toJSON(), ...updates }) : book
      )
    );
  }, []);

  const deleteBook = useCallback(async (id: string): Promise<void> => {
    await BookService.deleteBook(id);
    setBooks(prev => prev.filter(book => book.id !== id));
  }, []);

  const toggleFavorite = useCallback(async (id: string): Promise<void> => {
    const book = books.find(b => b.id === id);
    if (book) {
      await updateBook(id, { isFavorite: !book.isFavorite });
    }
  }, [books, updateBook]);

  const getBookById = useCallback((id: string): Book | undefined => {
    return books.find(book => book.id === id);
  }, [books]);

  const searchBooks = useCallback((query: string): Book[] => {
    const lowerQuery = query.toLowerCase();
    return books.filter(
      book =>
        book.title.toLowerCase().includes(lowerQuery) ||
        book.author.toLowerCase().includes(lowerQuery)
    );
  }, [books]);

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

export default useBooks;

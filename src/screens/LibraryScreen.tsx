import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Image,
  ScrollView,
  Animated,
} from 'react-native';
import {
  Text,
  Searchbar,
  IconButton,
  FAB,
  useTheme,
  Portal,
  Dialog,
  Button,
} from 'react-native-paper';
import { Swipeable } from 'react-native-gesture-handler';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';

import { useBooks } from '../hooks/useBooks';
import { StorageService } from '../services/StorageService';
import BookService from '../services/BookService';
import { Book, BookFormat } from '../types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function BookCard({
  book,
  onPress,
  onToggleFavorite,
}: {
  book: Book;
  onPress: () => void;
  onToggleFavorite: (id: string) => void;
}) {
  const theme = useTheme();

  return (
    <TouchableOpacity onPress={onPress} style={styles.bookCard}>
      <View style={styles.coverContainer}>
        {book.coverImage ? (
          <Image
            source={{ uri: book.coverImage }}
            style={styles.coverImage}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.placeholderCover,
              { backgroundColor: theme.colors.surfaceVariant },
            ]}
          >
            <IconButton
              icon="book"
              size={40}
              iconColor={theme.colors.primary}
            />
          </View>
        )}
      </View>
      <View style={styles.bookInfo}>
        <Text numberOfLines={2} style={styles.bookTitle}>
          {book.title}
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.bookAuthor, { color: theme.colors.onSurfaceVariant }]}
        >
          {book.author}
        </Text>
        <Text style={[styles.bookProgress, { color: theme.colors.primary }]}>
          {book.totalPages > 0
            ? `${Math.round((book.currentPage / book.totalPages) * 100)}%`
            : 'New'}
        </Text>
      </View>
      <IconButton
        icon={book.isFavorite ? 'heart' : 'heart-outline'}
        size={20}
        iconColor={
          book.isFavorite ? theme.colors.error : theme.colors.onSurfaceVariant
        }
        onPress={e => {
          e.stopPropagation();
          onToggleFavorite(book.id);
        }}
      />
    </TouchableOpacity>
  );
}

export default function LibraryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();
  const {
    books,
    loading: isLoading,
    refresh: loadBooks,
    toggleFavorite,
    deleteBook,
  } = useBooks();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Initialize storage on mount
    StorageService.initializeStorage();
  }, []);

  // Refresh books when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('LibraryScreen: Focus effect triggered, loading books...');
      loadBooks();
    }, [loadBooks]),
  );

  // Debug: Log books state changes
  useEffect(() => {
    console.log('LibraryScreen: Books updated, count:', books.length);
    if (books.length > 0) {
      console.log(
        'LibraryScreen: First book:',
        books[0].title,
        'ID:',
        books[0].id,
      );
    }
  }, [books]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadBooks();
    setRefreshing(false);
  }, [loadBooks]);

  const handleImportBook = async () => {
    try {
      console.log('LibraryScreen: Starting book import...');
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/epub+zip',
          'application/pdf',
          'application/x-mobipocket-ebook',
        ],
        copyToCacheDirectory: true,
      });

      console.log(
        'LibraryScreen: Document picker result:',
        result.canceled ? 'canceled' : 'success',
      );

      if (result.canceled === false && result.assets && result.assets[0]) {
        const file = result.assets[0];
        const fileName = file.name || '';
        const extension = fileName.split('.').pop()?.toLowerCase();
        console.log(
          'LibraryScreen: Selected file:',
          fileName,
          'extension:',
          extension,
        );

        let fileType: BookFormat | null = null;
        if (extension === 'epub') fileType = 'epub';
        else if (extension === 'pdf') fileType = 'pdf';
        else if (extension === 'mobi') fileType = 'mobi';

        if (fileType && file.uri) {
          console.log('LibraryScreen: Importing book of type:', fileType);
          const book = await BookService.importBook(file.uri, fileType);
          console.log(
            'LibraryScreen: Book imported successfully:',
            book.title,
            'ID:',
            book.id,
          );
          // Refresh book list to show the new book
          await loadBooks();
          console.log(
            'LibraryScreen: Book list refreshed, count after import:',
            books.length,
          );
          // Navigate to reader screen after import
          handleBookPress(book);
        } else {
          console.error('LibraryScreen: Unsupported file type or missing URI');
        }
      }
    } catch (error) {
      console.error('LibraryScreen: Error importing book:', error);
    }
  };

  // Helper to serialize book for navigation (Date -> string)
  const serializeBook = (book: Book): Book => ({
    ...book,
    addedAt:
      book.addedAt instanceof Date
        ? (book.addedAt.toISOString() as unknown as Date)
        : book.addedAt,
    lastReadAt:
      book.lastReadAt instanceof Date
        ? (book.lastReadAt.toISOString() as unknown as Date)
        : book.lastReadAt,
  });

  const handleBookPress = (book: Book) => {
    const serializedBook = serializeBook(book);
    if (book.fileType === 'epub') {
      navigation.navigate('EpubReader', { book: serializedBook });
    } else if (book.fileType === 'pdf') {
      navigation.navigate('PdfReader', { book: serializedBook });
    } else {
      navigation.navigate('BookDetail', { book: serializedBook });
    }
  };

  const filteredBooks = searchQuery
    ? books.filter(
        b =>
          b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.author.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : books;

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Searchbar
        placeholder="Search books..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />

      {filteredBooks.length === 0 && !isLoading ? (
        <ScrollView
          contentContainerStyle={styles.emptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <IconButton
            icon="book-open-variant"
            size={64}
            iconColor={theme.colors.surfaceVariant}
          />
          <Text
            style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}
          >
            No books in your library
          </Text>
          <Text
            style={[
              styles.emptySubtext,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            Tap + to import your first book
          </Text>
        </ScrollView>
      ) : (
        <FlatList
          data={filteredBooks}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const renderRightActions = (
              progress: any,
              dragX: any,
              swipeable: Swipeable,
            ) => {
              return (
                <TouchableOpacity
                  style={[
                    styles.deleteAction,
                    { backgroundColor: theme.colors.error },
                  ]}
                  onPress={() => {
                    swipeable.close();
                    deleteBook(item.id);
                  }}
                >
                  <IconButton icon="delete" iconColor="#fff" size={24} />
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              );
            };

            return (
              <Swipeable renderRightActions={renderRightActions}>
                <BookCard
                  book={item}
                  onPress={() => handleBookPress(item)}
                  onToggleFavorite={toggleFavorite}
                />
              </Swipeable>
            );
          }}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={handleImportBook}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  searchBar: {
    margin: 16,
  },
  list: {
    padding: 16,
  },
  bookCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
  },
  coverContainer: {
    width: 60,
    height: 90,
    borderRadius: 4,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  placeholderCover: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  bookInfo: {
    flex: 1,
    marginLeft: 12,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  bookAuthor: {
    fontSize: 14,
    marginTop: 4,
  },
  bookProgress: {
    fontSize: 12,
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
  },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginBottom: 12,
    borderRadius: 8,
  },
  deleteText: {
    color: '#fff',
    fontSize: 12,
    marginTop: -8,
  },
});

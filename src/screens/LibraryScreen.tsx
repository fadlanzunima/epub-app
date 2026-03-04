import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
import * as FileSystem from 'expo-file-system/legacy';
import { Book, BookFormat } from '../types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { DEFAULT_BOOKS_COVERS } from '../config/defaultBooks';

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
  const [imageError, setImageError] = useState(false);
  const [coverExists, setCoverExists] = useState(!!book.coverImage);

  // Verify cover file exists on filesystem
  useEffect(() => {
    const checkCoverExists = async () => {
      if (!book.coverImage) {
        console.log(`📚 "${book.title}" - no coverImage set`);
        setCoverExists(false);
        return;
      }
      try {
        const fileInfo = await FileSystem.getInfoAsync(book.coverImage);
        console.log(
          `📚 "${book.title}" - cover check:`,
          fileInfo.exists ? 'EXISTS' : 'NOT FOUND',
          book.coverImage,
        );
        setCoverExists(fileInfo.exists);
      } catch (error) {
        console.log(`📚 Cover check failed for "${book.title}":`, error);
        setCoverExists(false);
      }
    };
    checkCoverExists();
  }, [book.coverImage, book.title]);

  // Show placeholder if no cover image, image failed to load, or file doesn't exist
  const showPlaceholder = !coverExists || imageError;

  // Get placeholder based on file type
  const getFileTypePlaceholder = () => {
    switch (book.fileType.toLowerCase()) {
      case 'pdf':
        return (
          <View
            style={[styles.fileTypePlaceholder, { backgroundColor: '#FF6B6B' }]}
          >
            <MaterialCommunityIcons
              name="file-pdf-box"
              size={56}
              color="#FFFFFF"
            />
          </View>
        );
      case 'epub':
        return (
          <View
            style={[styles.fileTypePlaceholder, { backgroundColor: '#4ECDC4' }]}
          >
            <MaterialCommunityIcons
              name="book-open-variant"
              size={56}
              color="#FFFFFF"
            />
          </View>
        );
      case 'mobi':
        return (
          <View
            style={[styles.fileTypePlaceholder, { backgroundColor: '#95E1D3' }]}
          >
            <MaterialCommunityIcons name="book" size={56} color="#FFFFFF" />
          </View>
        );
      default:
        return (
          <View
            style={[
              styles.fileTypePlaceholder,
              { backgroundColor: theme.colors.primaryContainer },
            ]}
          >
            <MaterialCommunityIcons
              name="file-document"
              size={56}
              color={theme.colors.onPrimaryContainer}
            />
          </View>
        );
    }
  };

  // Select a default cover based on book id hash (only for default books)
  const getDefaultCover = () => {
    const covers = [
      DEFAULT_BOOKS_COVERS['default-1'],
      DEFAULT_BOOKS_COVERS['default-2'],
      DEFAULT_BOOKS_COVERS['default-3'],
    ];
    // Use book.id to consistently select the same cover for the same book
    const index =
      book.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) %
      covers.length;
    return covers[index];
  };

  // Check if this is a default book (has a default cover asset)
  const isDefaultBook = book.id.startsWith('default-');

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.bookCard,
        {
          backgroundColor: theme.colors.surface,
          shadowColor: theme.colors.shadow,
        },
      ]}
    >
      <View
        style={
          !showPlaceholder || isDefaultBook
            ? styles.coverContainer
            : styles.placeholderContainer
        }
      >
        {!showPlaceholder ? (
          <Image
            source={{ uri: book.coverImage }}
            style={styles.coverImage}
            resizeMode="cover"
            onError={e => {
              console.log(
                '📚 Image load error for',
                book.title,
                ':',
                e.nativeEvent.error,
              );
              setImageError(true);
            }}
            onLoad={() =>
              console.log('📚 Image loaded successfully for', book.title)
            }
          />
        ) : isDefaultBook ? (
          <Image
            source={getDefaultCover()}
            style={styles.defaultCoverImage}
            resizeMode="cover"
          />
        ) : (
          getFileTypePlaceholder()
        )}
      </View>
      <View style={styles.bookInfo}>
        <Text
          numberOfLines={2}
          variant="titleMedium"
          style={[styles.bookTitle, { color: theme.colors.onSurface }]}
        >
          {book.title || 'NO TITLE'}
        </Text>
        <Text
          numberOfLines={1}
          variant="bodyMedium"
          style={[styles.bookAuthor, { color: theme.colors.onSurfaceVariant }]}
        >
          {book.author || 'NO AUTHOR'}
        </Text>
        <View style={styles.bookMetaRow}>
          <View
            style={[
              styles.formatBadge,
              { backgroundColor: theme.colors.primaryContainer },
            ]}
          >
            <Text
              variant="labelSmall"
              style={{ color: theme.colors.onPrimaryContainer }}
            >
              {book.fileType.toUpperCase()}
            </Text>
          </View>
          <Text
            variant="bodySmall"
            style={[styles.bookProgress, { color: theme.colors.primary }]}
          >
            {book.totalPages > 0
              ? `${Math.round((book.currentPage / book.totalPages) * 100)}%`
              : 'New'}
          </Text>
        </View>
      </View>
      <IconButton
        icon={book.isFavorite ? 'heart' : 'heart-outline'}
        size={22}
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
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);
  const [filter, setFilter] = useState<
    'all' | 'favorites' | 'epub' | 'pdf' | 'mobi'
  >('all');

  const showDeleteDialog = (book: Book) => {
    setBookToDelete(book);
    setDeleteDialogVisible(true);
  };

  const hideDeleteDialog = () => {
    setDeleteDialogVisible(false);
    setBookToDelete(null);
  };

  const confirmDelete = async () => {
    if (bookToDelete) {
      await deleteBook(bookToDelete.id);
      hideDeleteDialog();
    }
  };

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
      const firstBook = books[0];
      console.log('LibraryScreen: First book details:', {
        title: firstBook.title,
        author: firstBook.author,
        id: firstBook.id,
        fileType: firstBook.fileType,
        coverImage: firstBook.coverImage || '(none)',
        filePath: firstBook.filePath?.substring(0, 50) + '...',
      });
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

  const handleBookPress = (book: Book) => {
    if (book.fileType === 'epub') {
      navigation.navigate('EpubReader', { bookId: book.id });
    } else if (book.fileType === 'pdf') {
      navigation.navigate('PdfReader', { bookId: book.id });
    } else {
      navigation.navigate('BookDetail', { bookId: book.id });
    }
  };

  const filteredBooks = books
    .filter(book => {
      if (filter === 'favorites') return book.isFavorite;
      if (filter === 'epub') return book.fileType === 'epub';
      if (filter === 'pdf') return book.fileType === 'pdf';
      if (filter === 'mobi') return book.fileType === 'mobi';
      return true;
    })
    .filter(book => {
      if (!searchQuery) return true;
      return (
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });

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

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === 'all' && { backgroundColor: theme.colors.primary },
          ]}
          onPress={() => setFilter('all')}
        >
          <Text
            style={[
              styles.filterButtonText,
              filter === 'all' && { color: theme.colors.onPrimary },
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === 'favorites' && { backgroundColor: theme.colors.primary },
          ]}
          onPress={() => setFilter('favorites')}
        >
          <Text
            style={[
              styles.filterButtonText,
              filter === 'favorites' && { color: theme.colors.onPrimary },
            ]}
          >
            Favorites
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === 'epub' && { backgroundColor: theme.colors.primary },
          ]}
          onPress={() => setFilter('epub')}
        >
          <Text
            style={[
              styles.filterButtonText,
              filter === 'epub' && { color: theme.colors.onPrimary },
            ]}
          >
            EPUB
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === 'pdf' && { backgroundColor: theme.colors.primary },
          ]}
          onPress={() => setFilter('pdf')}
        >
          <Text
            style={[
              styles.filterButtonText,
              filter === 'pdf' && { color: theme.colors.onPrimary },
            ]}
          >
            PDF
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === 'mobi' && { backgroundColor: theme.colors.primary },
          ]}
          onPress={() => setFilter('mobi')}
        >
          <Text
            style={[
              styles.filterButtonText,
              filter === 'mobi' && { color: theme.colors.onPrimary },
            ]}
          >
            MOBI
          </Text>
        </TouchableOpacity>
      </View>

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
                    showDeleteDialog(item);
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
        color="#FFF"
        onPress={handleImportBook}
      />

      {/* Delete Confirmation Dialog */}
      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={hideDeleteDialog}>
          <Dialog.Title>Delete Book</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Are you sure you want to delete "{bookToDelete?.title}"? This
              action cannot be undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={hideDeleteDialog}>Cancel</Button>
            <Button onPress={confirmDelete} textColor={theme.colors.error}>
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 6,
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(103, 80, 164, 0.1)',
    alignItems: 'center',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  list: {
    padding: 16,
  },
  bookCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  coverContainer: {
    width: 90,
    height: 135,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  placeholderContainer: {
    width: 90,
    height: 135,
    borderRadius: 8,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  defaultCoverImage: {
    width: '100%',
    height: '100%',
  },
  fileTypePlaceholder: {
    flex: 1,
    margin: 4,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
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
    justifyContent: 'center',
  },
  bookTitle: {
    fontWeight: '600',
    lineHeight: 22,
  },
  bookAuthor: {
    marginTop: 2,
  },
  bookMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  formatBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bookProgress: {
    fontWeight: '500',
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

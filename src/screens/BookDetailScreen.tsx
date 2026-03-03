import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Text,
  Button,
  IconButton,
  useTheme,
  Divider,
  Chip,
  Menu,
  Portal,
  Dialog,
} from 'react-native-paper';
import {
  RouteProp,
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '../navigation/AppNavigator';
import BookService from '../services/BookService';
import { useStore } from '../hooks/useStore';
import { Bookmark, Annotation, Category, Book } from '../types';

type RoutePropType = RouteProp<RootStackParamList, 'BookDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function BookDetailScreen() {
  const route = useRoute<RoutePropType>();
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();
  const { bookId } = route.params;
  const { updateBook, deleteBook, categories: allCategories } = useStore();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [bookCategories, setBookCategories] = useState<Category[]>([]);
  const [categoryDialogVisible, setCategoryDialogVisible] = useState(false);

  const loadBook = useCallback(async () => {
    console.log('BookDetail: Loading book', bookId);
    try {
      const loadedBook = await BookService.getBookById(bookId);
      if (loadedBook) {
        setBook(loadedBook);
      } else {
        console.error('BookDetail: Book not found');
        navigation.goBack();
      }
    } catch (error) {
      console.error('BookDetail: Error loading book:', error);
    } finally {
      setLoading(false);
    }
  }, [bookId, navigation]);

  const loadData = useCallback(async () => {
    console.log('BookDetail: Loading data for book', bookId);
    try {
      const [bms, anns, cats] = await Promise.all([
        BookService.getBookmarks(bookId),
        BookService.getAnnotations(bookId),
        BookService.getCategoriesByBook(bookId),
      ]);
      console.log(
        'BookDetail: Loaded bookmarks:',
        bms.length,
        'annotations:',
        anns.length,
        'categories:',
        cats.length,
      );
      console.log('BookDetail: Categories loaded:', cats);
      setBookmarks(bms);
      setAnnotations(anns);
      setBookCategories(cats);
    } catch (error) {
      console.error('BookDetail: Error loading data:', error);
    }
  }, [bookId]);

  useEffect(() => {
    loadBook();
  }, [loadBook]);

  useEffect(() => {
    if (book) {
      loadData();
    }
  }, [book, loadData]);

  // Reload data when screen comes into focus (e.g., after reading)
  useFocusEffect(
    useCallback(() => {
      if (book) {
        loadData();
      }
    }, [book, loadData]),
  );

  const handleAddToCategory = async (categoryId: string) => {
    if (!book) return;
    await BookService.addBookToCategory(book.id, categoryId);
    loadData();
  };

  const handleRemoveFromCategory = async (categoryId: string) => {
    if (!book) return;
    await BookService.removeBookFromCategory(book.id, categoryId);
    loadData();
  };

  const handleRead = () => {
    if (!book) return;
    if (book.fileType === 'epub') {
      navigation.navigate('EpubReader', { bookId: book.id });
    } else if (book.fileType === 'pdf') {
      navigation.navigate('PdfReader', { bookId: book.id });
    }
  };

  const handleToggleFavorite = async () => {
    if (!book) return;
    await BookService.toggleFavorite(book.id);
    const updatedBook = await BookService.getBookById(book.id);
    if (updatedBook) {
      setBook(updatedBook);
      updateBook(updatedBook);
    }
  };

  const handleDelete = async () => {
    if (!book) return;
    await BookService.deleteBook(book.id);
    deleteBook(book.id);
    navigation.goBack();
  };

  // Show loading state or return null if book is not loaded
  if (loading || !book) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.background,
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
      >
        <Text>Loading...</Text>
      </View>
    );
  }

  const progressPercent =
    book.totalPages > 0
      ? Math.round((book.currentPage / book.totalPages) * 100)
      : book.currentPage; // For EPUB location-based reading, currentPage stores the percentage

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.header}>
        {book.coverImage ? (
          <Image
            source={{ uri: `file://${book.coverImage}` }}
            style={styles.coverImage}
          />
        ) : (
          <View
            style={[
              styles.placeholderCover,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Text
              style={[styles.placeholderText, { color: theme.colors.primary }]}
            >
              {book.title.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View style={styles.headerInfo}>
          <Text variant="headlineSmall" style={styles.title}>
            {book.title}
          </Text>
          <Text
            variant="bodyLarge"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {book.author}
          </Text>
          <Chip style={styles.formatChip}>{book.fileType.toUpperCase()}</Chip>
        </View>

        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <IconButton
              icon="dots-vertical"
              onPress={() => setMenuVisible(true)}
            />
          }
        >
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              handleToggleFavorite();
            }}
            title={
              book.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'
            }
            leadingIcon={book.isFavorite ? 'heart-off' : 'heart'}
          />
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              setCategoryDialogVisible(true);
            }}
            title="Manage Categories"
            leadingIcon="tag-multiple"
          />
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              handleDelete();
            }}
            title="Delete Book"
            leadingIcon="delete"
            titleStyle={{ color: theme.colors.error }}
          />
        </Menu>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${progressPercent}%`,
                backgroundColor: theme.colors.primary,
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {book.fileType === 'epub' && book.totalPages === 0
            ? `${progressPercent}% • Location-based reading`
            : `${progressPercent}% • Page ${book.currentPage} of ${book.totalPages}`}
        </Text>
      </View>

      <Divider style={styles.divider} />

      <View style={styles.section}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 8,
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons
              name="tag-multiple"
              size={20}
              color="#6750A4"
              style={{ marginRight: 8 }}
            />
            <Text variant="titleMedium">
              Categories ({bookCategories.length})
            </Text>
          </View>
          <Button
            mode="text"
            compact
            onPress={() => setCategoryDialogVisible(true)}
            icon="tag-plus"
          >
            Manage
          </Button>
        </View>
        <View style={styles.categoriesContainer}>
          {bookCategories.length === 0 ? (
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              No categories assigned
            </Text>
          ) : (
            bookCategories.map(cat => (
              <Chip
                key={cat.id}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: cat.color + '20',
                    borderWidth: 1,
                    borderColor: cat.color,
                  },
                ]}
                textStyle={{ color: cat.color, fontWeight: '500' }}
                icon="tag"
                onClose={() => handleRemoveFromCategory(cat.id)}
              >
                {cat.name}
              </Chip>
            ))
          )}
        </View>
      </View>

      <Divider style={styles.divider} />

      <View style={styles.section}>
        <Text variant="titleMedium">Description</Text>
        <Text
          style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
        >
          {book.description || 'No description available.'}
        </Text>
      </View>

      <Divider style={styles.divider} />

      <View style={styles.section}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <MaterialCommunityIcons
            name="bookmark-multiple"
            size={20}
            color="#6750A4"
            style={{ marginRight: 8 }}
          />
          <Text variant="titleMedium">Bookmarks ({bookmarks.length})</Text>
        </View>
        {bookmarks.map(bm => (
          <TouchableOpacity
            key={bm.id}
            style={styles.listItem}
            onPress={() => {
              // Navigate to reader with bookmark location
              if (book.fileType === 'epub') {
                navigation.navigate('EpubReader', {
                  bookId: book.id,
                  initialLocation: bm.cfi,
                });
              } else if (book.fileType === 'pdf') {
                navigation.navigate('PdfReader', {
                  bookId: book.id,
                  initialPage: bm.page,
                });
              }
            }}
          >
            <Text numberOfLines={1} style={{ fontWeight: '500' }}>
              {bm.note || `Bookmark ${bm.page ? `at page ${bm.page}` : ''}`}
            </Text>
            <Text
              numberOfLines={1}
              style={{ fontSize: 12, color: theme.colors.onSurfaceVariant }}
            >
              {new Date(bm.createdAt).toLocaleDateString()}{' '}
              {new Date(bm.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Divider style={styles.divider} />

      <View style={styles.section}>
        <Text variant="titleMedium">Annotations ({annotations.length})</Text>
        {annotations.map(ann => (
          <View key={ann.id} style={styles.listItem}>
            <Text numberOfLines={2} style={{ color: ann.color }}>
              "{ann.text}"
            </Text>
            {ann.note && (
              <Text
                numberOfLines={1}
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                Note: {ann.note}
              </Text>
            )}
          </View>
        ))}
      </View>

      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={handleRead}
          style={styles.readButton}
          icon="book-open-variant"
        >
          {book.currentPage > 0 ? 'Continue Reading' : 'Start Reading'}
        </Button>
      </View>

      {/* Category Management Dialog */}
      <Portal>
        <Dialog
          visible={categoryDialogVisible}
          onDismiss={() => setCategoryDialogVisible(false)}
        >
          <Dialog.Title>Manage Categories</Dialog.Title>
          <Dialog.Content>
            {allCategories.length === 0 ? (
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                No categories available. Create categories first!
              </Text>
            ) : (
              allCategories.map(cat => {
                const isAssigned = bookCategories.some(bc => bc.id === cat.id);
                return (
                  <View key={cat.id} style={styles.categoryRow}>
                    <View
                      style={[
                        styles.categoryColorDot,
                        { backgroundColor: cat.color },
                      ]}
                    />
                    <Text style={styles.categoryName}>{cat.name}</Text>
                    <Button
                      mode={isAssigned ? 'outlined' : 'contained'}
                      compact
                      onPress={() =>
                        isAssigned
                          ? handleRemoveFromCategory(cat.id)
                          : handleAddToCategory(cat.id)
                      }
                    >
                      {isAssigned ? 'Remove' : 'Add'}
                    </Button>
                  </View>
                );
              })
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCategoryDialogVisible(false)}>
              Done
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
  },
  coverImage: {
    width: 120,
    height: 180,
    borderRadius: 8,
  },
  placeholderCover: {
    width: 120,
    height: 180,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  title: {
    fontWeight: 'bold',
  },
  formatChip: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  progressContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  divider: {
    marginVertical: 8,
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  description: {
    marginTop: 8,
    lineHeight: 20,
  },
  listItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  buttonContainer: {
    padding: 16,
  },
  readButton: {
    paddingVertical: 8,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  categoryColorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  categoryName: {
    flex: 1,
    fontSize: 16,
  },
  debugContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#FFEBEE',
    borderRadius: 4,
  },
  debugText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});

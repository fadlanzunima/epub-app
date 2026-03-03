import React, { useEffect, useState, useCallback, memo } from 'react';
import {
  View,
  StyleSheet,
  Image,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Text,
  IconButton,
  useTheme,
  FAB,
  Portal,
  Dialog,
  Button,
  Icon,
} from 'react-native-paper';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Book } from '../types';
import BookService from '../services/BookService';
import { useStore } from '../hooks/useStore';

type RoutePropType = RouteProp<RootStackParamList, 'CategoryDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Memoized Book Item Component to prevent unnecessary re-renders
interface BookItemProps {
  item: Book;
  onPress: (book: Book) => void;
  onRemove: (bookId: string) => void;
  theme: any;
}

const BookItem = memo(({ item, onPress, onRemove, theme }: BookItemProps) => {
  // Calculate progress with proper validation
  const currentPage = item.currentPage || 0;
  const totalPages = item.totalPages || 0;
  let progress = 0;

  if (totalPages > 0) {
    progress = Math.min(Math.max(currentPage / totalPages, 0), 1);
  } else if (currentPage > 0) {
    // For EPUB or location-based reading, show percentage capped at 99%
    progress = Math.min(currentPage / 100, 0.99);
  }

  const progressPercent = Math.round(progress * 100);

  return (
    <TouchableOpacity
      style={[styles.bookCard, { backgroundColor: theme.colors.surface }]}
      onPress={() => onPress(item)}
    >
      {item.coverImage ? (
        <Image
          source={{ uri: `file://${item.coverImage}` }}
          style={styles.bookCover}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            styles.bookCover,
            {
              backgroundColor: theme.colors.surfaceVariant,
              justifyContent: 'center',
              alignItems: 'center',
            },
          ]}
        >
          <Icon
            source="book-open-variant"
            size={32}
            color={theme.colors.onSurfaceVariant}
          />
        </View>
      )}
      <View style={styles.bookInfo}>
        <Text numberOfLines={2} style={styles.bookTitle}>
          {item.title}
        </Text>
        <Text
          style={[styles.bookAuthor, { color: theme.colors.onSurfaceVariant }]}
        >
          {item.author}
        </Text>
        <View style={styles.progressContainer}>
          <View
            style={[
              styles.progressBarContainer,
              { backgroundColor: theme.colors.surfaceVariant },
            ]}
          >
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${progress * 100}%`,
                  backgroundColor: theme.colors.primary,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: theme.colors.primary }]}>
            {progressPercent}%
          </Text>
        </View>
      </View>
      <IconButton icon="close" size={20} onPress={() => onRemove(item.id)} />
    </TouchableOpacity>
  );
});

export default function CategoryDetailScreen() {
  const route = useRoute<RoutePropType>();
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();
  const { category } = route.params;
  const { books: allBooks } = useStore();

  const [books, setBooks] = useState<Book[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [addDialogVisible, setAddDialogVisible] = useState(false);
  const [availableBooks, setAvailableBooks] = useState<Book[]>([]);

  const loadBooks = useCallback(async () => {
    try {
      const categoryBooks = await BookService.getBooksByCategory(category.id);
      setBooks(categoryBooks);
    } catch (error) {
      console.error('Error loading books:', error);
    }
  }, [category.id]);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBooks();
    setRefreshing(false);
  };

  const handleRemoveBook = useCallback(
    async (bookId: string) => {
      try {
        await BookService.removeBookFromCategory(bookId, category.id);
        loadBooks();
      } catch (error) {
        console.error('Error removing book:', error);
      }
    },
    [category.id, loadBooks],
  );

  const handleAddBook = async (book: Book) => {
    try {
      await BookService.addBookToCategory(book.id, category.id);
      setAddDialogVisible(false);
      loadBooks();
    } catch (error) {
      console.error('Error adding book:', error);
    }
  };

  const showAddDialog = () => {
    // Filter out books already in this category
    const bookIds = new Set(books.map(b => b.id));
    const available = allBooks.filter(b => !bookIds.has(b.id));
    setAvailableBooks(available);
    setAddDialogVisible(true);
  };

  const navigateToBook = useCallback(
    (book: Book) => {
      navigation.navigate('BookDetail', { bookId: book.id });
    },
    [navigation],
  );

  const renderBook = useCallback(
    ({ item }: { item: Book }) => (
      <BookItem
        item={item}
        onPress={navigateToBook}
        onRemove={handleRemoveBook}
        theme={theme}
      />
    ),
    [navigateToBook, handleRemoveBook, theme],
  );

  const renderAvailableBook = ({ item }: { item: Book }) => (
    <TouchableOpacity
      style={[
        styles.availableBookItem,
        { borderBottomColor: theme.colors.outline },
      ]}
      onPress={() => handleAddBook(item)}
    >
      <View>
        <Text numberOfLines={1} style={styles.bookTitle}>
          {item.title}
        </Text>
        <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
          {item.author}
        </Text>
      </View>
      <IconButton icon="plus" size={20} />
    </TouchableOpacity>
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <StatusBar barStyle="light-content" backgroundColor={category.color} />
      <SafeAreaView style={{ backgroundColor: category.color }} edges={['top']}>
        <View style={styles.headerTop}>
          <IconButton
            icon="arrow-left"
            size={24}
            iconColor="#FFFFFF"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          />
          <View style={styles.headerContent}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: 'rgba(255, 255, 255, 0.3)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <IconButton icon="folder-outline" size={24} iconColor="#FFFFFF" />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>{category.name}</Text>
              <Text style={styles.headerSubtitle}>
                {books.length} {books.length === 1 ? 'book' : 'books'}
              </Text>
            </View>
          </View>
        </View>
      </SafeAreaView>

      <FlatList
        data={books}
        keyExtractor={item => item.id}
        renderItem={renderBook}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              No books in this category
            </Text>
            <Text
              style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}
            >
              Tap + to add books
            </Text>
          </View>
        }
      />

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={showAddDialog}
        color="#FFFFFF"
      />

      <Portal>
        <Dialog
          visible={addDialogVisible}
          onDismiss={() => setAddDialogVisible(false)}
        >
          <Dialog.Title>Add Books to {category.name}</Dialog.Title>
          <Dialog.Content>
            {availableBooks.length === 0 ? (
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                No available books to add. Import some books first!
              </Text>
            ) : (
              <FlatList
                data={availableBooks}
                keyExtractor={item => item.id}
                renderItem={renderAvailableBook}
                style={{ maxHeight: 300 }}
              />
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAddDialogVisible(false)}>Done</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  backButton: {
    margin: 0,
    marginLeft: -12,
    marginTop: -4,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  headerTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  list: {
    padding: 16,
  },
  bookCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
  },
  bookInfo: {
    flex: 1,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  bookAuthor: {
    fontSize: 14,
    marginTop: 4,
  },
  bookType: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  bookCover: {
    width: 60,
    height: 90,
    borderRadius: 4,
    marginRight: 16,
    overflow: 'hidden',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    marginRight: 8,
  },
  progressBarContainer: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    marginRight: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 35,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 64,
  },
  availableBookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
});

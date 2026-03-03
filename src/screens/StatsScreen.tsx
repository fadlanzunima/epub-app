import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Text,
  Card,
  useTheme,
  IconButton,
  ProgressBar,
  Avatar,
  Divider,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import BookService from '../services/BookService';
import { Book } from '../types';
import { RootStackParamList } from '../navigation/AppNavigator';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface ReadingStats {
  totalBooks: number;
  booksRead: number;
  booksInProgress: number;
  favoriteBooks: number;
  totalReadingTime: number;
  totalPages: number;
  averageProgress: number;
}

function StatCard({
  icon,
  value,
  label,
  color,
}: {
  icon: string;
  value: string | number;
  label: string;
  color: string;
}) {
  const theme = useTheme();
  return (
    <Card style={styles.statCard}>
      <Card.Content style={styles.statCardContent}>
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <MaterialCommunityIcons
            name={icon as any}
            size={28}
            color={color}
            style={{ opacity: 1 }}
          />
        </View>
        <Text style={[styles.statValue, { color: theme.colors.onSurface }]}>
          {value}
        </Text>
        <Text
          style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}
        >
          {label}
        </Text>
      </Card.Content>
    </Card>
  );
}

function BookProgressItem({
  book,
  onPress,
}: {
  book: Book;
  onPress: () => void;
}) {
  const theme = useTheme();
  // Handle both PDF (totalPages > 0) and EPUB (totalPages = 0, currentPage = percentage)
  const progress =
    book.totalPages > 0
      ? book.currentPage / book.totalPages
      : book.currentPage / 100; // EPUB: currentPage stores percentage (0-100)

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View style={styles.bookItem}>
        <Avatar.Text
          size={40}
          label={book.title.substring(0, 2).toUpperCase()}
          style={{ backgroundColor: theme.colors.primaryContainer }}
          labelStyle={{ color: theme.colors.onPrimaryContainer, fontSize: 14 }}
        />
        <View style={styles.bookInfo}>
          <Text numberOfLines={1} style={styles.bookTitle}>
            {book.title}
          </Text>
          <Text
            style={[
              styles.bookAuthor,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            {book.author}
          </Text>
          <ProgressBar
            progress={progress}
            color={theme.colors.primary}
            style={styles.progressBar}
          />
          <Text
            style={[
              styles.progressText,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            {Math.round(progress * 100)}% • {book.currentPage} /{' '}
            {book.totalPages} pages
          </Text>
        </View>
        <IconButton
          icon={book.isFavorite ? 'heart' : 'heart-outline'}
          size={20}
          iconColor={
            book.isFavorite ? theme.colors.error : theme.colors.onSurfaceVariant
          }
        />
      </View>
    </TouchableOpacity>
  );
}

export default function StatsScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const [books, setBooks] = useState<Book[]>([]);
  const [stats, setStats] = useState<ReadingStats>({
    totalBooks: 0,
    booksRead: 0,
    booksInProgress: 0,
    favoriteBooks: 0,
    totalReadingTime: 0,
    totalPages: 0,
    averageProgress: 0,
  });

  const loadStats = useCallback(async () => {
    // Load books directly from service to ensure fresh data
    const allBooks = await BookService.getAllBooks();
    setBooks(allBooks);

    const readingStats = await BookService.getReadingStats();

    // Helper to calculate progress percentage for both PDF and EPUB books
    const getProgressPercent = (book: Book): number => {
      if (book.totalPages > 0) {
        // PDF: currentPage / totalPages
        return book.currentPage / book.totalPages;
      } else if (book.currentPage > 0) {
        // EPUB: currentPage stores percentage (0-100)
        return book.currentPage / 100;
      }
      return 0;
    };

    const booksRead = books.filter(
      b => b.currentPage > 0 && getProgressPercent(b) >= 0.9,
    ).length;

    const booksInProgress = books.filter(
      b => b.currentPage > 0 && getProgressPercent(b) < 0.9,
    ).length;

    const favoriteBooks = books.filter(b => b.isFavorite).length;

    const totalProgress = books.reduce((acc, b) => {
      return acc + getProgressPercent(b);
    }, 0);
    const averageProgress = books.length > 0 ? totalProgress / books.length : 0;

    setStats({
      totalBooks: books.length,
      booksRead,
      booksInProgress,
      favoriteBooks,
      totalReadingTime: readingStats.totalTime,
      totalPages: readingStats.totalPages,
      averageProgress,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats]),
  );

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
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

  const inProgressBooks = books
    .filter(b => {
      const progress =
        b.totalPages > 0 ? b.currentPage / b.totalPages : b.currentPage / 100; // EPUB: currentPage stores percentage
      return b.currentPage > 0 && progress < 0.9;
    })
    .sort(
      (a, b) => (b.lastReadAt?.getTime() || 0) - (a.lastReadAt?.getTime() || 0),
    )
    .slice(0, 5);

  const recentlyAdded = [...books]
    .sort(
      (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime(),
    )
    .slice(0, 5);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text
          style={[styles.headerTitle, { color: theme.colors.onBackground }]}
        >
          Statistics
        </Text>
        <Text
          style={[
            styles.headerSubtitle,
            { color: theme.colors.onSurfaceVariant },
          ]}
        >
          Your reading journey
        </Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard
          icon="library"
          value={stats.totalBooks}
          label="Total Books"
          color="#6750A4"
        />
        <StatCard
          icon="check-circle"
          value={stats.booksRead}
          label="Completed"
          color="#4CAF50"
        />
        <StatCard
          icon="book-clock"
          value={stats.booksInProgress}
          label="In Progress"
          color="#FF9800"
        />
        <StatCard
          icon="star"
          value={stats.favoriteBooks}
          label="Favorites"
          color="#B3261E"
        />
      </View>

      {/* Reading Summary Card */}
      <Card style={styles.summaryCard}>
        <Card.Content>
          <Text
            variant="titleMedium"
            style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
          >
            Reading Summary
          </Text>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <IconButton
                icon="clock-outline"
                size={32}
                iconColor={theme.colors.primary}
              />
              <Text style={styles.summaryValue}>
                {formatTime(stats.totalReadingTime)}
              </Text>
              <Text
                style={[
                  styles.summaryLabel,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Total Time
              </Text>
            </View>

            <Divider style={styles.verticalDivider} />

            <View style={styles.summaryItem}>
              <IconButton
                icon="file-document-outline"
                size={32}
                iconColor={theme.colors.primary}
              />
              <Text style={styles.summaryValue}>{stats.totalPages}</Text>
              <Text
                style={[
                  styles.summaryLabel,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Pages Read
              </Text>
            </View>
          </View>

          <View style={styles.overallProgress}>
            <Text
              style={[
                styles.overallProgressLabel,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Overall Library Progress
            </Text>
            <ProgressBar
              progress={stats.averageProgress}
              color={theme.colors.primary}
              style={styles.overallProgressBar}
            />
            <Text
              style={[
                styles.overallProgressText,
                { color: theme.colors.onSurface },
              ]}
            >
              {Math.round(stats.averageProgress * 100)}% Average
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Currently Reading */}
      {inProgressBooks.length > 0 && (
        <Card style={styles.sectionCard}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Text
                variant="titleMedium"
                style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
              >
                Currently Reading
              </Text>
              <IconButton
                icon="book-open-variant"
                size={20}
                iconColor={theme.colors.primary}
              />
            </View>
            {inProgressBooks.map((book, index) => (
              <View key={book.id}>
                <BookProgressItem
                  book={book}
                  onPress={() => handleBookPress(book)}
                />
                {index < inProgressBooks.length - 1 && (
                  <Divider style={styles.itemDivider} />
                )}
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      {/* Recently Added */}
      <Card style={styles.sectionCard}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Text
              variant="titleMedium"
              style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
            >
              Recently Added
            </Text>
            <IconButton
              icon="clock-plus"
              size={20}
              iconColor={theme.colors.primary}
            />
          </View>
          {recentlyAdded.length === 0 ? (
            <Text
              style={[
                styles.emptyText,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              No books added yet. Import your first book!
            </Text>
          ) : (
            recentlyAdded.map((book, index) => (
              <View key={book.id}>
                <TouchableOpacity
                  onPress={() => handleBookPress(book)}
                  activeOpacity={0.7}
                >
                  <View style={styles.recentItem}>
                    <Avatar.Text
                      size={36}
                      label={book.title.substring(0, 2).toUpperCase()}
                      style={{
                        backgroundColor: theme.colors.secondaryContainer,
                      }}
                      labelStyle={{
                        color: theme.colors.onSecondaryContainer,
                        fontSize: 12,
                      }}
                    />
                    <View style={styles.recentBookInfo}>
                      <Text numberOfLines={1} style={styles.recentBookTitle}>
                        {book.title}
                      </Text>
                      <Text
                        style={[
                          styles.recentBookDate,
                          { color: theme.colors.onSurfaceVariant },
                        ]}
                      >
                        Added {new Date(book.addedAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <IconButton
                      icon="chevron-right"
                      size={20}
                      iconColor={theme.colors.onSurfaceVariant}
                    />
                  </View>
                </TouchableOpacity>
                {index < recentlyAdded.length - 1 && (
                  <Divider style={styles.itemDivider} />
                )}
              </View>
            ))
          )}
        </Card.Content>
      </Card>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  statCard: {
    width: (width - 48) / 2,
    margin: 4,
    borderRadius: 16,
  },
  statCardContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 13,
    marginTop: 4,
  },
  summaryCard: {
    margin: 16,
    marginTop: 12,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 8,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: -8,
  },
  summaryLabel: {
    fontSize: 13,
    marginTop: 2,
  },
  verticalDivider: {
    width: 1,
    height: 60,
  },
  overallProgress: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  overallProgressLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  overallProgressBar: {
    height: 8,
    borderRadius: 4,
  },
  overallProgressText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  sectionCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  bookInfo: {
    flex: 1,
    marginLeft: 12,
  },
  bookTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  bookAuthor: {
    fontSize: 13,
    marginTop: 2,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginTop: 8,
  },
  progressText: {
    fontSize: 12,
    marginTop: 4,
  },
  itemDivider: {
    marginVertical: 4,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  recentBookInfo: {
    flex: 1,
    marginLeft: 12,
  },
  recentBookTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  recentBookDate: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 24,
    fontSize: 14,
  },
  bottomPadding: {
    height: 32,
  },
});

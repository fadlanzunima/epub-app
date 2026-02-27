import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, useTheme } from 'react-native-paper';
import BookService from '../services/BookService';
import { useStore } from '../hooks/useStore';

export default function StatsScreen() {
  const theme = useTheme();
  const { books } = useStore();
  const [stats, setStats] = useState({
    totalBooks: 0,
    booksRead: 0,
    totalReadingTime: 0,
    totalPages: 0,
  });

  useEffect(() => {
    const loadStats = async () => {
      const readingStats = await BookService.getReadingStats();
      const booksRead = books.filter(
        b => b.currentPage > 0 && b.currentPage >= b.totalPages * 0.9,
      ).length;
      setStats({
        totalBooks: books.length,
        booksRead,
        totalReadingTime: readingStats.totalTime,
        totalPages: readingStats.totalPages,
      });
    };
    loadStats();
  }, [books]);

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.grid}>
        <Card style={styles.card}>
          <Card.Content>
            <Text style={[styles.statNumber, { color: theme.colors.primary }]}>
              {stats.totalBooks}
            </Text>
            <Text style={styles.statLabel}>Total Books</Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={[styles.statNumber, { color: theme.colors.primary }]}>
              {stats.booksRead}
            </Text>
            <Text style={styles.statLabel}>Books Read</Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={[styles.statNumber, { color: theme.colors.primary }]}>
              {formatTime(stats.totalReadingTime)}
            </Text>
            <Text style={styles.statLabel}>Reading Time</Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={[styles.statNumber, { color: theme.colors.primary }]}>
              {stats.totalPages}
            </Text>
            <Text style={styles.statLabel}>Pages Read</Text>
          </Card.Content>
        </Card>
      </View>

      <Card style={styles.fullCard}>
        <Card.Content>
          <Text variant="titleMedium">Recently Added</Text>
          {books.slice(0, 5).map(book => (
            <View key={book.id} style={styles.bookItem}>
              <Text numberOfLines={1} style={styles.bookTitle}>
                {book.title}
              </Text>
              <Text
                style={[
                  styles.bookDate,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {book.addedAt.toLocaleDateString()}
              </Text>
            </View>
          ))}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  card: {
    flex: 1,
    minWidth: '45%',
    margin: 8,
  },
  fullCard: {
    marginTop: 16,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.7,
  },
  bookItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  bookTitle: {
    flex: 1,
    fontSize: 14,
  },
  bookDate: {
    fontSize: 12,
  },
});

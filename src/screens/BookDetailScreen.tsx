import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image, ScrollView } from 'react-native';
import {
  Text,
  Button,
  IconButton,
  useTheme,
  Divider,
  Chip,
  Menu,
} from 'react-native-paper';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as FileSystem from 'expo-file-system';

import { RootStackParamList } from '../navigation/AppNavigator';
import BookService from '../services/BookService';
import { useStore } from '../hooks/useStore';
import { Bookmark, Annotation } from '../types';

type RoutePropType = RouteProp<RootStackParamList, 'BookDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function BookDetailScreen() {
  const route = useRoute<RoutePropType>();
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();
  const { book } = route.params;
  const { updateBook, deleteBook } = useStore();
  const [menuVisible, setMenuVisible] = useState(false);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

  useEffect(() => {
    loadData();
  }, [book.id]);

  const loadData = async () => {
    const [bms, anns] = await Promise.all([
      BookService.getBookmarks(book.id),
      BookService.getAnnotations(book.id),
    ]);
    setBookmarks(bms);
    setAnnotations(anns);
  };

  const handleRead = () => {
    if (book.fileType === 'epub') {
      navigation.navigate('EpubReader', { book });
    } else if (book.fileType === 'pdf') {
      navigation.navigate('PdfReader', { book });
    }
  };

  const handleToggleFavorite = async () => {
    await BookService.toggleFavorite(book.id);
    const updatedBook = await BookService.getBookById(book.id);
    if (updatedBook) {
      updateBook(updatedBook);
    }
  };

  const handleDelete = async () => {
    await BookService.deleteBook(book.id);
    deleteBook(book.id);
    navigation.goBack();
  };

  const progressPercent =
    book.totalPages > 0
      ? Math.round((book.currentPage / book.totalPages) * 100)
      : 0;

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
          {progressPercent}% • Page {book.currentPage} of {book.totalPages}
        </Text>
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
        <Text variant="titleMedium">Bookmarks ({bookmarks.length})</Text>
        {bookmarks.map(bm => (
          <View key={bm.id} style={styles.listItem}>
            <Text numberOfLines={1}>{bm.note || `Page ${bm.page || '?'}`}</Text>
          </View>
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
});

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text, Appbar, useTheme } from 'react-native-paper';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useReader } from '../hooks/useReader';
import { Book } from '../database/models/Book';

type ReaderScreenRouteProp = RouteProp<RootStackParamList, 'Reader'>;

/**
 * Generic Reader Screen
 * This screen acts as a router to format-specific readers (EPUB/PDF)
 * or provides a unified reading interface.
 */
const ReaderScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute<ReaderScreenRouteProp>();
  const { book } = route.params;

  const [isLoading, setIsLoading] = useState(true);
  const { state, loadBook } = useReader();

  useEffect(() => {
    initializeReader();
  }, []);

  const initializeReader = async () => {
    try {
      setIsLoading(true);
      await loadBook(book.id);

      // Route to format-specific reader
      if (book.fileType === 'epub') {
        navigation.navigate('EpubReader', { book } as any);
      } else if (book.fileType === 'pdf') {
        navigation.navigate('PdfReader', { book } as any);
      }
    } catch (error) {
      console.error('Failed to initialize reader:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Opening book...</Text>
      </View>
    );
  }

  if (state.error) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Text style={styles.errorText}>Failed to open book</Text>
        <Text style={styles.errorSubtext}>{state.error.message}</Text>
      </View>
    );
  }

  // This screen typically redirects to format-specific readers
  // But can also provide a unified interface
  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={book.title} subtitle={book.author} />
      </Appbar.Header>

      <View style={styles.content}>
        <Text>Redirecting to {book.fileType.toUpperCase()} reader...</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    opacity: 0.7,
  },
});

export default ReaderScreen;

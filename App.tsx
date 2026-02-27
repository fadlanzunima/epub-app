import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

import AppNavigator from './src/navigation/AppNavigator';
import { useStore } from './src/hooks/useStore';
import SettingsService from './src/services/SettingsService';
import BookService from './src/services/BookService';

function AppContent() {
  const { theme, setTheme, setReaderSettings, setBooks } = useStore();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize database
        await BookService.initialize();

        // Load settings
        const settings = await SettingsService.getSettings();
        setTheme(settings.reader.theme);
        setReaderSettings(settings.reader);

        // Load books
        const books = await BookService.getAllBooks();
        setBooks(books);
      } catch (error) {
        console.error('Error initializing app:', error);
      }
    };

    initializeApp();
  }, [setTheme, setReaderSettings, setBooks]);

  const paperTheme = theme === 'dark' ? MD3DarkTheme : MD3LightTheme;

  return (
    <PaperProvider theme={paperTheme}>
      <StatusBar
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={paperTheme.colors.background}
      />
      <AppNavigator />
    </PaperProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <AppContent />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

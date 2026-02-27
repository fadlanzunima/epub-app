import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { WebView } from 'react-native-webview';
import { Text, IconButton, useTheme, Menu, Divider } from 'react-native-paper';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';

import { RootStackParamList } from '../navigation/AppNavigator';
import { useStore } from '../hooks/useStore';
import BookService from '../services/BookService';

type RoutePropType = RouteProp<RootStackParamList, 'PdfReader'>;

export default function PdfReaderScreen() {
  const route = useRoute<RoutePropType>();
  const navigation = useNavigation();
  const theme = useTheme();
  const { book } = route.params;
  const { readerSettings } = useStore();

  const [controlsVisible, setControlsVisible] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(book.currentPage || 1);
  const fadeAnim = useState(new Animated.Value(1))[0];

  const currentTheme =
    readerSettings.theme === 'dark'
      ? { background: '#121212', text: '#FFFFFF' }
      : readerSettings.theme === 'sepia'
      ? { background: '#F4ECD8', text: '#5B4636' }
      : { background: '#FFFFFF', text: '#000000' };

  const hideControls = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setControlsVisible(false));
  };

  const showControls = () => {
    setControlsVisible(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const addBookmark = () => {
    BookService.addBookmark(book.id, '', currentPage, `Page ${currentPage}`);
    setMenuVisible(false);
  };

  const openInBrowser = async () => {
    await WebBrowser.openBrowserAsync(book.filePath);
    setMenuVisible(false);
  };

  // For Expo Go, we'll use a simple WebView with Google Docs viewer as fallback
  const pdfUri = `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(
    book.filePath,
  )}`;

  return (
    <View
      style={[styles.container, { backgroundColor: currentTheme.background }]}
    >
      <TouchableOpacity
        style={styles.touchArea}
        activeOpacity={1}
        onPress={showControls}
      >
        <WebView
          originWhitelist={['*']}
          source={{ uri: pdfUri }}
          style={{ backgroundColor: currentTheme.background }}
        />
      </TouchableOpacity>

      {controlsVisible && (
        <Animated.View style={[styles.controls, { opacity: fadeAnim }]}>
          {/* Top Bar */}
          <View
            style={[styles.topBar, { backgroundColor: theme.colors.surface }]}
          >
            <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
            <Text numberOfLines={1} style={styles.title}>
              {book.title}
            </Text>
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
                onPress={addBookmark}
                title="Add Bookmark"
                leadingIcon="bookmark"
              />
              <Menu.Item
                onPress={openInBrowser}
                title="Open in Browser"
                leadingIcon="open-in-new"
              />
              <Divider />
            </Menu>
          </View>

          {/* Bottom Bar */}
          <View
            style={[
              styles.bottomBar,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Text style={styles.pageInfo}>PDF Viewer</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  touchArea: {
    flex: 1,
  },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 40,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 8,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  pageInfo: {
    fontSize: 14,
  },
});

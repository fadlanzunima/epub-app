import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
} from 'react-native';
import Pdf from 'react-native-pdf';
import { Text, IconButton, useTheme, Menu, Divider } from 'react-native-paper';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';

import { RootStackParamList } from '../navigation/AppNavigator';
import { useStore } from '../hooks/useStore';
import BookService from '../services/BookService';

type RoutePropType = RouteProp<RootStackParamList, 'PdfReader'>;

const { height } = Dimensions.get('window');

export default function PdfReaderScreen() {
  const route = useRoute<RoutePropType>();
  const navigation = useNavigation();
  const theme = useTheme();
  const { book } = route.params;
  const { readerSettings } = useStore();
  const pdfRef = useRef<Pdf>(null);

  const [controlsVisible, setControlsVisible] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(book.currentPage || 1);
  const [totalPages, setTotalPages] = useState(book.totalPages || 0);
  const [scale, setScale] = useState(1.0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

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

  const handlePageChange = (page: number, total: number) => {
    setCurrentPage(page);
    setTotalPages(total);
    BookService.updateReadingProgress(book.id, page);
  };

  const addBookmark = () => {
    BookService.addBookmark(
      book.id,
      undefined,
      currentPage,
      `Page ${currentPage}`,
    );
    setMenuVisible(false);
  };

  const zoomIn = () => {
    setScale(Math.min(scale + 0.5, 3.0));
  };

  const zoomOut = () => {
    setScale(Math.max(scale - 0.5, 0.5));
  };

  return (
    <View
      style={[styles.container, { backgroundColor: currentTheme.background }]}
    >
      <TouchableOpacity
        style={styles.touchArea}
        activeOpacity={1}
        onPress={showControls}
      >
        <Pdf
          ref={pdfRef}
          source={{ uri: `file://${book.filePath}` }}
          page={currentPage}
          scale={scale}
          onPageChanged={handlePageChange}
          onError={error => console.error('PDF Error:', error)}
          style={[styles.pdf, { backgroundColor: currentTheme.background }]}
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
              <Divider />
              <Menu.Item
                onPress={zoomIn}
                title="Zoom In"
                leadingIcon="magnify-plus"
              />
              <Menu.Item
                onPress={zoomOut}
                title="Zoom Out"
                leadingIcon="magnify-minus"
              />
            </Menu>
          </View>

          {/* Bottom Bar */}
          <View
            style={[
              styles.bottomBar,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Text style={styles.pageInfo}>
              Page {currentPage} of {totalPages}
            </Text>
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
  pdf: {
    flex: 1,
    width: '100%',
    height: '100%',
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

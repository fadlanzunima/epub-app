import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import {
  Text,
  IconButton,
  useTheme,
  Menu,
  Portal,
  Modal,
  List,
  Divider,
} from 'react-native-paper';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';

import { RootStackParamList } from '../navigation/AppNavigator';
import { useStore } from '../hooks/useStore';
import BookService from '../services/BookService';
import { TocItem, Themes, ThemeType } from '../types';

type RoutePropType = RouteProp<RootStackParamList, 'EpubReader'>;

const { width, height } = Dimensions.get('window');

const EPUB_JS = `
  <script src="https://cdnjs.cloudflare.com/ajax/libs/epub.js/0.3.93/epub.min.js"></script>
`;

export default function EpubReaderScreen() {
  const route = useRoute<RoutePropType>();
  const navigation = useNavigation();
  const theme = useTheme();
  const { book } = route.params;
  const { readerSettings } = useStore();
  const webviewRef = useRef<WebView>(null);

  const [controlsVisible, setControlsVisible] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [tocVisible, setTocVisible] = useState(false);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [currentLocation, setCurrentLocation] = useState(book.currentCfi || '');
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const currentTheme = Themes[readerSettings.theme];

  useEffect(() => {
    // Check if file exists
    const checkFile = async () => {
      try {
        const fileInfo = await FileSystem.getInfoAsync(book.filePath);
        if (!fileInfo.exists) {
          throw new Error(`File not found: ${book.filePath}`);
        }
        console.log('EPUB file found:', book.filePath, 'Size:', fileInfo.size);
        setError(null);
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Failed to load EPUB';
        console.error('Error checking EPUB file:', err);
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };
    checkFile();
  }, [book.filePath]);

  useEffect(() => {
    // Auto-hide controls after 3 seconds
    const timer = setTimeout(() => {
      if (controlsVisible) {
        hideControls();
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [controlsVisible]);

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

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      switch (data.type) {
        case 'location':
          setCurrentLocation(data.cfi);
          setProgress(data.progress);
          BookService.updateReadingProgress(
            book.id,
            Math.floor(data.progress * 100),
            data.cfi,
          );
          break;
        case 'toc':
          setToc(data.toc);
          break;
        case 'selected':
          // Handle text selection for annotation
          break;
        case 'console':
          // Log WebView console messages
          if (data.level === 'error') {
            console.error('[WebView]', data.message);
          } else {
            console.log('[WebView]', data.message);
          }
          break;
        case 'error':
          console.error('[WebView Error]', data.message);
          break;
      }
    } catch (e) {
      console.error('WebView message error:', e);
    }
  };

  const goToLocation = (href: string) => {
    webviewRef.current?.injectJavaScript(`
      rendition.display('${href}');
      true;
    `);
    setTocVisible(false);
  };

  const goNext = () => {
    webviewRef.current?.injectJavaScript(`
      rendition.next();
      true;
    `);
  };

  const goPrev = () => {
    webviewRef.current?.injectJavaScript(`
      rendition.prev();
      true;
    `);
  };

  const addBookmark = () => {
    BookService.addBookmark(book.id, currentLocation, undefined, 'Bookmark');
    setMenuVisible(false);
  };

  const changeTheme = (themeName: ThemeType) => {
    const t = Themes[themeName];
    webviewRef.current?.injectJavaScript(`
      document.body.style.backgroundColor = '${t.background}';
      document.body.style.color = '${t.text}';
      true;
    `);
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <meta http-equiv="Content-Security-Policy" content="default-src * 'unsafe-inline' 'unsafe-eval' data: blob: file:;">
      <script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/epubjs@0.3.93/dist/epub.min.js"></script>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background-color: ${currentTheme.background};
          color: ${currentTheme.text};
        }
        #viewer {
          width: 100vw;
          height: 100vh;
          overflow: hidden;
        }
      </style>
    </head>
    <body>
      <div id="viewer"></div>
      <script>
        function initReader() {
          console.log('EPUB Reader: Starting initialization');

          if (!window.ePub) {
            console.error('EPUB Reader: ePub.js not available yet, retrying...');
            setTimeout(initReader, 500);
            return;
          }
          if (!window.JSZip) {
            console.error('EPUB Reader: JSZip not available yet, retrying...');
            setTimeout(initReader, 500);
            return;
          }

          console.log('EPUB Reader: Libraries loaded');

          try {
            // Use the file path directly
            var filePath = '${book.filePath}';
            console.log('EPUB Reader: Opening file:', filePath);

            // Try to fetch the file first to verify access
            fetch(filePath)
              .then(response => {
                console.log('EPUB Reader: Fetch response:', response.status, response.statusText);
                if (!response.ok) {
                  throw new Error('HTTP ' + response.status);
                }
                return response.arrayBuffer();
              })
              .then(arrayBuffer => {
                console.log('EPUB Reader: File loaded, size:', arrayBuffer.byteLength);
                // Use the arrayBuffer with epub.js
                var book = ePub(arrayBuffer);
                setupBook(book);
              })
              .catch(err => {
                console.error('EPUB Reader: Fetch error:', err.message);
                // Fallback: try direct file path
                console.log('EPUB Reader: Trying direct file path...');
                var book = ePub(filePath);
                setupBook(book);
              });
          } catch(e) {
            console.error('EPUB Reader: Fatal error:', e.message);
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              message: e.message
            }));
          }
        }

        function setupBook(book) {
          try {
            var rendition = book.renderTo("viewer", {
              width: "100%",
              height: "100%",
              spread: "none"
            });
            console.log('EPUB Reader: Rendition created');

            rendition.display('${book.currentCfi || ''}');
            console.log('EPUB Reader: Display called');

            rendition.on("relocated", function(location) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'location',
                cfi: location.start.cfi,
                progress: location.start.percentage
              }));
            });

            book.loaded.navigation.then(function(nav) {
              console.log('EPUB Reader: Navigation loaded');
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'toc',
                toc: nav.toc
              }));
            }).catch(function(err) {
              console.error('EPUB Reader: Navigation error:', err);
            });

            book.opened.then(function() {
              console.log('EPUB Reader: Book opened successfully');
            }).catch(function(err) {
              console.error('EPUB Reader: Open error:', err);
            });

            document.addEventListener('click', function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'click'
              }));
            });
          } catch(e) {
            console.error('EPUB Reader: Fatal error:', e.message);
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              message: e.message
            }));
          }
        }

        // Start initialization when page loads
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', initReader);
        } else {
          initReader();
        }
      </script>
    </body>
    </html>
  `;

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          {
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: currentTheme.background,
          },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[
          styles.container,
          {
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: currentTheme.background,
            padding: 20,
          },
        ]}
      >
        <Text style={{ color: theme.colors.error, textAlign: 'center' }}>
          Error loading book:
        </Text>
        <Text
          style={{
            color: currentTheme.text,
            textAlign: 'center',
            marginTop: 8,
          }}
        >
          {error}
        </Text>
      </View>
    );
  }

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
          ref={webviewRef}
          originWhitelist={['*']}
          source={{
            html: htmlContent || '<html><body>Loading...</body></html>',
          }}
          onMessage={handleWebViewMessage}
          injectedJavaScript={`
            (function() {
              // Capture console logs and send to React Native
              const originalLog = console.log;
              const originalError = console.error;
              console.log = function(...args) {
                originalLog.apply(console, args);
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'console',
                  level: 'log',
                  message: args.map(a => String(a)).join(' ')
                }));
              };
              console.error = function(...args) {
                originalError.apply(console, args);
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'console',
                  level: 'error',
                  message: args.map(a => String(a)).join(' ')
                }));
              };
            })();
            document.addEventListener('message', function(e) {
              eval(e.data);
            });
          `}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          onError={e => console.error('WebView error:', e.nativeEvent)}
          onHttpError={e => console.error('WebView HTTP error:', e.nativeEvent)}
          onLoadStart={() => console.log('WebView: load start')}
          onLoadEnd={() => console.log('WebView: load end')}
          onLoadProgress={e =>
            console.log('WebView: load progress', e.nativeEvent.progress)
          }
          renderError={errorName => (
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: 'red' }}>Failed to load: {errorName}</Text>
            </View>
          )}
          style={{ backgroundColor: currentTheme.background }}
          allowFileAccess
          allowUniversalAccessFromFileURLs
          mixedContentMode="always"
          mediaPlaybackRequiresUserAction={false}
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
                onPress={() => setTocVisible(true)}
                title="Table of Contents"
                leadingIcon="table-of-contents"
              />
              <Divider />
              <Menu.Item
                onPress={() => changeTheme('light')}
                title="Light Theme"
              />
              <Menu.Item
                onPress={() => changeTheme('dark')}
                title="Dark Theme"
              />
              <Menu.Item
                onPress={() => changeTheme('sepia')}
                title="Sepia Theme"
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
            <IconButton icon="chevron-left" size={32} onPress={goPrev} />
            <Text style={styles.progress}>{Math.round(progress * 100)}%</Text>
            <IconButton icon="chevron-right" size={32} onPress={goNext} />
          </View>
        </Animated.View>
      )}

      {/* TOC Modal */}
      <Portal>
        <Modal
          visible={tocVisible}
          onDismiss={() => setTocVisible(false)}
          contentContainerStyle={[
            styles.tocModal,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Text variant="titleLarge" style={styles.tocTitle}>
            Table of Contents
          </Text>
          <Divider />
          {toc.map((item, index) => (
            <List.Item
              key={index}
              title={item.label}
              onPress={() => goToLocation(item.href)}
            />
          ))}
        </Modal>
      </Portal>
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
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    pointerEvents: 'box-none',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 40,
    pointerEvents: 'auto',
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 20,
    pointerEvents: 'auto',
  },
  progress: {
    fontSize: 14,
  },
  tocModal: {
    margin: 20,
    padding: 20,
    borderRadius: 8,
    maxHeight: height * 0.7,
  },
  tocTitle: {
    marginBottom: 16,
  },
});

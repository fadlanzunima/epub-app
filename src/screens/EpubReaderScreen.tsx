import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
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

const { height } = Dimensions.get('window');

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
  const [webviewLoading, setWebviewLoading] = useState(true);
  const [webviewError, setWebviewError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadProgress, setLoadProgress] = useState('Initializing...');
  const [jszipSource, setJszipSource] = useState<string>('');
  const [epubSource, setEpubSource] = useState<string>('');
  const [librariesLoaded, setLibrariesLoaded] = useState(false);
  const [epubData, setEpubData] = useState<string>('');
  const [epubLoaded, setEpubLoaded] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const currentTheme = Themes[readerSettings.theme];

  // Load library sources
  useEffect(() => {
    async function loadLibraries() {
      try {
        // Load JSZip
        const jszipAsset = Asset.fromModule(
          require('../assets/js/jszip.min.txt'),
        );
        await jszipAsset.downloadAsync();
        console.log('JSZip asset URI:', jszipAsset.localUri || jszipAsset.uri);
        const jszipContent = await FileSystem.readAsStringAsync(
          jszipAsset.localUri || jszipAsset.uri,
        );
        console.log('JSZip content length:', jszipContent.length);
        setJszipSource(jszipContent);

        // Load EPub.js
        const epubAsset = Asset.fromModule(
          require('../assets/js/epub.min.txt'),
        );
        await epubAsset.downloadAsync();
        console.log('EPUB asset URI:', epubAsset.localUri || epubAsset.uri);
        const epubContent = await FileSystem.readAsStringAsync(
          epubAsset.localUri || epubAsset.uri,
        );
        console.log('EPUB content length:', epubContent.length);
        setEpubSource(epubContent);

        setLibrariesLoaded(true);
        console.log('Libraries loaded successfully');
      } catch (err) {
        console.error('Failed to load libraries:', err);
        setError('Failed to load reader libraries');
      }
    }
    loadLibraries();
  }, []);

  useEffect(() => {
    console.log('EPUB file path:', book.filePath);

    // Read EPUB file as base64
    async function loadEpubFile() {
      try {
        const base64Data = await FileSystem.readAsStringAsync(book.filePath, {
          encoding: FileSystem.EncodingType.Base64,
        });
        setEpubData(base64Data);
        setEpubLoaded(true);
        console.log('EPUB file loaded, size:', base64Data.length);
      } catch (err) {
        console.error('Failed to load EPUB file:', err);
        setError('Failed to load EPUB file');
      }
    }
    loadEpubFile();

    setLoading(false);
    console.log('Set loading to false');

    // Force clear webview loading after 3 seconds
    const timer = setTimeout(() => {
      console.log('Force clearing webview loading after 3s');
      setWebviewLoading(false);
      console.log('Set webviewLoading to false');
    }, 3000);
    return () => clearTimeout(timer);
  }, [book.filePath]);

  // Consider WebView loaded when progress > 50%
  const handleLoadProgress = (progress: number) => {
    const percent = Math.round(progress * 100);
    console.log('WebView: load progress', percent + '%');
    setLoadProgress(`Loading: ${percent}%`);

    // Consider loaded earlier (progress > 0.5)
    if (progress > 0.5 && webviewLoading) {
      console.log('WebView: HTML loaded, allowing display');
      setWebviewLoading(false);
    }
  };

  useEffect(() => {
    // Auto-hide controls after 5 seconds (increased from 3)
    const timer = setTimeout(() => {
      if (controlsVisible) {
        hideControls();
      }
    }, 5000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlsVisible]);

  const hideControls = () => {
    console.log('Hiding controls');
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setControlsVisible(false));
  };

  const showControls = () => {
    console.log('Showing controls');
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
        case 'rendered':
          console.log('WebView rendered section:', data.section);
          break;
        case 'click':
          // Toggle controls when user taps in WebView
          console.log(
            'WebView click received, controlsVisible:',
            controlsVisible,
          );
          if (controlsVisible) {
            hideControls();
          } else {
            showControls();
          }
          break;
        case 'selected':
          // Handle text selection for annotation
          break;
        case 'loaded':
          setWebviewLoading(false);
          setWebviewError(null);
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
          setWebviewError(data.message);
          setWebviewLoading(false);
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
    BookService.addBookmark(book.id, currentLocation, 'Bookmark');
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
      <script>
        // EPUB data passed from React Native
        window.epubBase64Data = '${epubData}';
        console.log('TEST: Script started, epub data length:', window.epubBase64Data ? window.epubBase64Data.length : 0);
      </script>
      <script>${jszipSource}</script>
      <script>${epubSource}</script>
      <script>
        console.log('EPUB Reader: Inline libraries loaded. ePub available:', typeof ePub !== 'undefined', 'JSZip available:', typeof JSZip !== 'undefined');
        console.log('EPUB Reader: EPUB data available:', !!window.epubBase64Data, 'Length:', window.epubBase64Data ? window.epubBase64Data.length : 0);
      </script>
      <style>
        html, body {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background-color: ${currentTheme.background};
          color: ${currentTheme.text};
        }
        #viewer {
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          position: relative;
          z-index: 1;
          background-color: ${currentTheme.background};
        }
        #loading-indicator {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          background-color: ${currentTheme.background};
          z-index: 9999;
        }
        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid ${currentTheme.text}33;
          border-top-color: ${currentTheme.text};
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        #error-display {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: none;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          background-color: ${currentTheme.background};
          color: #ff4444;
          padding: 20px;
          text-align: center;
          z-index: 9998;
        }
        #error-display.visible {
          display: flex;
        }
      </style>
    </head>
    <body>
      <div id="loading-indicator">
        <div class="spinner"></div>
        <p style="margin-top: 16px; color: ${
          currentTheme.text
        };">Loading book...</p>
      </div>
      <div id="error-display">
        <h3>Failed to load book</h3>
        <p id="error-message"></p>
      </div>
      <div id="viewer"></div>
      <script>
        function showError(message) {
          console.error('EPUB Reader Error:', message);
          var errorDisplay = document.getElementById('error-display');
          var errorMessage = document.getElementById('error-message');
          var loadingIndicator = document.getElementById('loading-indicator');
          if (errorDisplay && errorMessage) {
            errorMessage.textContent = message;
            errorDisplay.classList.add('visible');
          }
          if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
          }
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'error',
            message: message
          }));
        }

        function hideLoading() {
          console.log('EPUB Reader: hideLoading called');
          var loadingIndicator = document.getElementById('loading-indicator');
          if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
            loadingIndicator.style.visibility = 'hidden';
            loadingIndicator.style.zIndex = '-1';
            console.log('EPUB Reader: Loading indicator hidden');
          } else {
            console.log('EPUB Reader: Loading indicator not found');
          }
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'loaded'
          }));
        }

        // Timeout detection - fail if not loaded within 30 seconds
        var initTimeout = setTimeout(function() {
          showError('Timeout: Failed to load book within 30 seconds. Please check your connection and try again.');
        }, 30000);

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
            // Use base64 data passed from React Native
            console.log('EPUB Reader: Using base64 data, length:', window.epubBase64Data ? window.epubBase64Data.length : 0);

            if (!window.epubBase64Data || window.epubBase64Data.length === 0) {
              showError('EPUB data not available');
              return;
            }

            // Convert base64 to ArrayBuffer
            console.log('EPUB Reader: Converting base64 to ArrayBuffer...');
            var binaryString = atob(window.epubBase64Data);
            var bytes = new Uint8Array(binaryString.length);
            for (var i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            var arrayBuffer = bytes.buffer;
            console.log('EPUB Reader: ArrayBuffer created, size:', arrayBuffer.byteLength);

            // Open EPUB with ArrayBuffer
            console.log('EPUB Reader: Opening EPUB with ArrayBuffer...');
            var book = ePub(arrayBuffer);
            console.log('EPUB Reader: Book object created, waiting for open...');

            // Wait for book to open before setting up
            book.opened.then(function() {
              console.log('EPUB Reader: Book opened, now setting up...');
              setupBook(book);
            }).catch(function(err) {
              showError('Failed to open book: ' + err.message);
            });
          } catch(e) {
            showError('Fatal error: ' + e.message);
          }
        }

        function setupBook(book) {
          try {
            console.log('EPUB Reader: Setting up book...');
            var viewer = document.getElementById("viewer");
            console.log('EPUB Reader: Viewer element:', viewer ? 'found' : 'NOT FOUND');

            // Store book and rendition globally so injected JS can access them
            window.book = book;
            window.rendition = book.renderTo("viewer", {
              width: "100%",
              height: "100%",
              spread: "none"
            });
            console.log('EPUB Reader: Rendition created');

            // Check if we have a current location to display
            var currentCfi = '${book.currentCfi || ''}';
            console.log('EPUB Reader: Displaying at CFI:', currentCfi || 'start');

            window.rendition.display(currentCfi || undefined).then(function() {
              console.log('EPUB Reader: Display completed successfully');
              // DEBUG: Check what's in the viewer
              var viewer = document.getElementById("viewer");
              console.log('EPUB Reader: Viewer children count:', viewer.children.length);
              console.log('EPUB Reader: Viewer innerHTML length:', viewer.innerHTML.length);
            }).catch(function(err) {
              console.error('EPUB Reader: Display failed:', err);
              showError('Failed to display book: ' + (err.message || err));
            });
            console.log('EPUB Reader: Display called');

            // Add rendered event to confirm content is showing
            window.rendition.on("rendered", function(section) {
              console.log('EPUB Reader: Section rendered:', section ? section.idref : 'unknown');
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'rendered',
                section: section ? section.idref : 'unknown'
              }));

              // Make sure iframe is visible and has proper styling
              var iframes = document.querySelectorAll('iframe');
              if (iframes.length > 0) {
                var iframe = iframes[0];
                // Force iframe visibility
                iframe.style.visibility = 'visible';
                iframe.style.display = 'block';
                iframe.style.opacity = '1';
                iframe.style.border = 'none';
                iframe.style.backgroundColor = '${currentTheme.background}';

                // Try to access iframe content to ensure it's loaded
                try {
                  var iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                  console.log('EPUB Reader: Iframe content accessible, body exists:', !!iframeDoc.body);
                  if (iframeDoc.body) {
                    iframeDoc.body.style.backgroundColor = '${
                      currentTheme.background
                    }';
                    iframeDoc.body.style.color = '${currentTheme.text}';
                  }
                } catch(e) {
                  console.log('EPUB Reader: Cannot access iframe content (cross-origin)');
                }
              }
            });

            // Add displayError event
            window.rendition.on("displayError", function(err) {
              console.error('EPUB Reader: Display error:', err);
              showError('Display error: ' + (err.message || err));
            });

            window.rendition.on("relocated", function(location) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'location',
                cfi: location.start.cfi,
                progress: location.start.percentage
              }));
            });

            // Add swipe gesture support for page turning (on document for full coverage)
            var touchStartX = 0;
            var touchStartY = 0;
            var touchEndX = 0;
            var isSwipe = false;

            document.addEventListener('touchstart', function(e) {
              touchStartX = e.changedTouches[0].screenX;
              touchStartY = e.changedTouches[0].screenY;
              isSwipe = false;
              console.log('EPUB Reader: touchstart at', touchStartX, touchStartY);
            }, {passive: true});

            document.addEventListener('touchmove', function(e) {
              // Detect if user is swiping horizontally
              var diffX = Math.abs(e.changedTouches[0].screenX - touchStartX);
              var diffY = Math.abs(e.changedTouches[0].screenY - touchStartY);
              if (diffX > 10 && diffX > diffY) {
                isSwipe = true;
              }
            }, {passive: true});

            document.addEventListener('touchend', function(e) {
              touchEndX = e.changedTouches[0].screenX;
              var swipeThreshold = 50;
              var diff = touchStartX - touchEndX;

              console.log('EPUB Reader: touchend, diff:', diff, 'isSwipe:', isSwipe);

              if (Math.abs(diff) > swipeThreshold && isSwipe) {
                e.preventDefault();
                if (diff > 0) {
                  // Swipe left - go to next page
                  console.log('EPUB Reader: Swipe left detected, going next');
                  window.rendition.next();
                } else {
                  // Swipe right - go to previous page
                  console.log('EPUB Reader: Swipe right detected, going prev');
                  window.rendition.prev();
                }
              }
            }, {passive: false});

            // Add keyboard navigation support
            document.addEventListener('keydown', function(e) {
              if (e.key === 'ArrowLeft') {
                window.rendition.prev();
              } else if (e.key === 'ArrowRight') {
                window.rendition.next();
              }
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

            // Book is already opened when setupBook is called, hide loading
            console.log('EPUB Reader: Book setup complete, hiding loading');
            clearTimeout(initTimeout);
            hideLoading();

            // Tap to toggle controls - use document for full coverage
            document.addEventListener('click', function(e) {
              // Only trigger if not swiping (isSwipe will be true if user swiped)
              if (!isSwipe) {
                console.log('EPUB Reader: Tap detected, toggling controls');
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'click'
                }));
              }
              // Reset isSwipe for next interaction
              isSwipe = false;
            });
          } catch(e) {
            showError('Setup error: ' + e.message);
          }
        }

        // Start initialization when page loads
        console.log('EPUB Reader: Document readyState:', document.readyState);
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', function() {
            console.log('EPUB Reader: DOMContentLoaded fired');
            initReader();
          });
        } else {
          console.log('EPUB Reader: Calling initReader immediately');
          initReader();
        }
      </script>
    </body>
    </html>
  `;

  console.log(
    'Render - loading:',
    loading,
    'webviewLoading:',
    webviewLoading,
    '- SKIPPED',
  );
  // DEBUG: Always show WebView
  // if (loading || webviewLoading) { ... }

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
      {/* WebView - placed first and outside TouchableOpacity to receive touch events */}
      {!librariesLoaded || !epubData ? (
        <View style={styles.loadingContainer}>
          <Text style={{ color: currentTheme.text }}>
            {!librariesLoaded
              ? 'Loading reader libraries...'
              : 'Loading EPUB file...'}
          </Text>
        </View>
      ) : (
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
          onError={e => {
            console.error('WebView error:', e.nativeEvent);
            setWebviewError(e.nativeEvent.description || 'WebView error');
            setLoadProgress(
              'Error: ' + (e.nativeEvent.description || 'WebView error'),
            );
            setWebviewLoading(false);
          }}
          onHttpError={e => {
            console.error('WebView HTTP error:', e.nativeEvent);
            setLoadProgress('HTTP Error: ' + e.nativeEvent.statusCode);
          }}
          onLoadStart={() => {
            console.log('WebView: load start');
            setLoadProgress('Loading WebView...');
            setWebviewLoading(true);
          }}
          onLoadEnd={() => {
            console.log('WebView: load end');
            setLoadProgress('WebView loaded, initializing EPUB...');
            setWebviewLoading(false);
          }}
          onLoadProgress={e => handleLoadProgress(e.nativeEvent.progress)}
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
          style={{ flex: 1, backgroundColor: currentTheme.background }}
          scrollEnabled={false}
          scalesPageToFit={false}
          bounces={false}
          overScrollMode="never"
          allowsInlineMediaPlayback
          allowFileAccess
          allowUniversalAccessFromFileURLs
          mixedContentMode="always"
          mediaPlaybackRequiresUserAction={false}
        />
      )}

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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

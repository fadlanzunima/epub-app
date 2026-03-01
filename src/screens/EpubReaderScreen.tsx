import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Animated,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
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
  Divider,
  Snackbar,
  TextInput,
  Button,
  Surface,
} from 'react-native-paper';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';

import { RootStackParamList } from '../navigation/AppNavigator';
import { useStore } from '../hooks/useStore';
import BookService from '../services/BookService';
import SettingsService from '../services/SettingsService';
import { TocItem, Themes, ThemeType, Bookmark } from '../types';

type RoutePropType = RouteProp<RootStackParamList, 'EpubReader'>;

const { height } = Dimensions.get('window');

// Helper function to highlight search term in text
function highlightSearchTerm(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.toLowerCase() === query.toLowerCase()) {
      return (
        <Text
          key={index}
          style={{
            fontWeight: 'bold',
            backgroundColor: '#FFD700',
            color: '#000',
          }}
        >
          {part}
        </Text>
      );
    }
    return part;
  });
}

export default function EpubReaderScreen() {
  const route = useRoute<RoutePropType>();
  const navigation = useNavigation();
  const theme = useTheme();
  const { book } = route.params;
  const { readerSettings, updateReaderSetting } = useStore();
  const webviewRef = useRef<WebView>(null);

  const [controlsVisible, setControlsVisible] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [tocVisible, setTocVisible] = useState(false);
  const [bookmarksVisible, setBookmarksVisible] = useState(false);
  const [bookmarkDialogVisible, setBookmarkDialogVisible] = useState(false);
  const [bookmarkTitle, setBookmarkTitle] = useState('');
  const [bookmarkDescription, setBookmarkDescription] = useState('');
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
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

  // Apply reader settings to WebView in real-time
  const applyReaderSettingsToWebView = useCallback(() => {
    const settings = readerSettings;
    console.log('⚙️ Applying reader settings to WebView:', settings);

    const theme = Themes[settings.theme];

    webviewRef.current?.injectJavaScript(`
      (function() {
        console.log('⚙️ [WebView] Applying reader settings');

        // Update theme colors
        document.body.style.backgroundColor = '${theme.background}';
        document.body.style.color = '${theme.text}';

        // Update viewer background
        var viewer = document.getElementById('viewer');
        if (viewer) {
          viewer.style.backgroundColor = '${theme.background}';
        }

        // Apply settings to iframe content
        var iframes = document.querySelectorAll('iframe');
        iframes.forEach(function(iframe) {
          try {
            var doc = iframe.contentDocument || iframe.contentWindow.document;
            if (doc && doc.body) {
              // Apply font size
              doc.body.style.fontSize = '${settings.fontSize}px';

              // Apply line height
              doc.body.style.lineHeight = '${settings.lineHeight}';

              // Apply margins (padding on body)
              doc.body.style.paddingLeft = '${settings.marginHorizontal}px';
              doc.body.style.paddingRight = '${settings.marginHorizontal}px';
              doc.body.style.paddingTop = '${settings.marginVertical}px';
              doc.body.style.paddingBottom = '${settings.marginVertical}px';

              // Apply theme colors
              doc.body.style.backgroundColor = '${theme.background}';
              doc.body.style.color = '${theme.text}';

              // Apply to all text elements for consistency
              var allText = doc.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, li, td, th');
              allText.forEach(function(el) {
                el.style.color = '${theme.text}';
              });

              console.log('⚙️ [WebView] Settings applied to iframe:', {
                fontSize: '${settings.fontSize}px',
                lineHeight: '${settings.lineHeight}',
                margins: '${settings.marginHorizontal}px/${settings.marginVertical}px'
              });
            }
          } catch(e) {
            console.error('⚙️ [WebView] Error applying settings to iframe:', e);
          }
        });

        // Store settings globally for new sections
        window.readerSettings = {
          fontSize: ${settings.fontSize},
          lineHeight: ${settings.lineHeight},
          marginHorizontal: ${settings.marginHorizontal},
          marginVertical: ${settings.marginVertical},
          theme: '${settings.theme}'
        };
      })();
      true;
    `);
  }, [readerSettings]);

  // Listen for reader settings changes and apply them immediately
  useEffect(() => {
    if (librariesLoaded && epubData) {
      applyReaderSettingsToWebView();
    }
  }, [readerSettings, librariesLoaded, epubData, applyReaderSettingsToWebView]);

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
            'WebView CLICK received, controlsVisible:',
            controlsVisible,
          );
          if (controlsVisible) {
            console.log('Hiding controls from click');
            hideControls();
          } else {
            console.log('Showing controls from click');
            showControls();
          }
          break;
        case 'cycleTheme':
          console.log('WebView: Cycle theme request received');
          // Cycle through themes: light -> dark -> sepia -> light
          const themeOrder: ThemeType[] = ['light', 'dark', 'sepia'];
          const currentThemeName = readerSettings.theme;
          const currentIndex = themeOrder.indexOf(currentThemeName);
          const nextIndex = (currentIndex + 1) % themeOrder.length;
          const nextTheme = themeOrder[nextIndex];
          console.log(
            'WebView: Cycling theme from',
            currentThemeName,
            'to',
            nextTheme,
          );
          changeTheme(nextTheme);
          break;
        case 'selected':
          // Handle text selection for annotation
          break;
        case 'searchResults':
          console.log(
            '🔍 [React Native] Search results received:',
            data.results?.length,
          );
          console.log(
            '🔍 [React Native] Results data:',
            JSON.stringify(data.results?.slice(0, 3), null, 2),
          );
          if (data.error) {
            console.error(
              '🔍 [React Native] Search error from WebView:',
              data.error,
            );
          }
          setIsSearching(false);
          setSearchResults(data.results || []);
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
    console.log('Navigating to TOC item:', href);
    // Escape single quotes and backslashes in href to prevent breaking the JavaScript string
    const escapedHref = href.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    webviewRef.current?.injectJavaScript(`
      (function() {
        try {
          if (window.rendition && window.book) {
            console.log('EPUB Reader: Attempting to navigate to: ${escapedHref}');
            // Try direct href first (more reliable for TOC items)
            window.rendition.display('${escapedHref}').then(function() {
              console.log('EPUB Reader: Successfully navigated to: ${escapedHref}');
              // Force iframe visibility after navigation
              setTimeout(function() {
                var iframes = document.querySelectorAll('iframe');
                if (iframes.length > 0) {
                  var iframe = iframes[0];
                  iframe.style.visibility = 'visible';
                  iframe.style.opacity = '1';
                  iframe.style.display = 'block';
                  iframe.style.width = '100%';
                  iframe.style.height = '100%';
                  console.log('EPUB Reader: Forced iframe visibility after nav');
                  // Check content and force text color
                  try {
                    var doc = iframe.contentDocument || iframe.contentWindow.document;
                    console.log('EPUB Reader: Post-nav body content length:', doc.body.innerHTML.length);
                    // Force text color on body
                    doc.body.style.color = '${currentTheme.text}';
                    doc.body.style.backgroundColor = '${currentTheme.background}';
                    // Force all text elements to have visible color
                    var allElements = doc.querySelectorAll('*');
                    for (var i = 0; i < allElements.length; i++) {
                      allElements[i].style.color = '${currentTheme.text}';
                    }
                    console.log('EPUB Reader: Applied text colors to', allElements.length, 'elements');
                  } catch(e) {
                    console.log('EPUB Reader: Error applying post-nav styles:', e.message);
                  }
                }
              }, 100);
            }).catch(function(err) {
              console.error('EPUB Reader: Failed with direct href:', err);
              // Fallback: try resolved href
              try {
                var resolved = window.book.resolve('${escapedHref}');
                console.log('EPUB Reader: Trying resolved href:', resolved);
                window.rendition.display(resolved);
              } catch(resolveErr) {
                console.error('EPUB Reader: Resolve also failed:', resolveErr);
              }
            });
          } else {
            console.error('EPUB Reader: Rendition or book not available');
          }
        } catch(e) {
          console.error('EPUB Reader: Navigation error:', e.message);
        }
      })();
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
    console.log(
      'Opening bookmark dialog for book:',
      book.id,
      'at location:',
      currentLocation,
    );
    if (!currentLocation) {
      console.error('Cannot add bookmark: no current location');
      return;
    }
    // Pre-fill with default title
    setBookmarkTitle(`Bookmark at ${Math.round(progress * 100)}%`);
    setBookmarkDescription('');
    setMenuVisible(false);
    setBookmarkDialogVisible(true);
  };

  const saveBookmark = async () => {
    if (!currentLocation) return;

    try {
      await BookService.addBookmark(
        book.id,
        currentLocation,
        bookmarkTitle || `Bookmark at ${Math.round(progress * 100)}%`,
      );
      console.log('Bookmark added successfully');
      setToastMessage('Bookmark saved successfully');
      setToastVisible(true);
      // Reload bookmarks after adding
      loadBookmarks();
    } catch (error) {
      console.error('Failed to add bookmark:', error);
      setToastMessage('Failed to save bookmark');
      setToastVisible(true);
    }
    setBookmarkDialogVisible(false);
  };

  const loadBookmarks = async () => {
    try {
      const bookBookmarks = await BookService.getBookmarks(book.id);
      console.log('Loaded bookmarks:', bookBookmarks.length);
      setBookmarks(bookBookmarks);
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
    }
  };

  const goToBookmark = (cfi: string) => {
    console.log('Navigating to bookmark:', cfi);
    webviewRef.current?.injectJavaScript(`
      (function() {
        try {
          if (window.rendition) {
            window.rendition.display('${cfi}').then(function() {
              console.log('EPUB Reader: Navigated to bookmark');
            }).catch(function(err) {
              console.error('EPUB Reader: Failed to navigate to bookmark:', err);
            });
          }
        } catch(e) {
          console.error('EPUB Reader: Bookmark navigation error:', e.message);
        }
      })();
      true;
    `);
    setBookmarksVisible(false);
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;

    console.log('🔍 Search started for:', searchQuery);
    setIsSearching(true);
    setSearchResults([]);

    const escapedQuery = searchQuery.replace(/'/g, "\\'");
    console.log('🔍 Escaped query:', escapedQuery);

    webviewRef.current?.injectJavaScript(`
      (function() {
        console.log('🔍 [WebView] Starting search for: ${escapedQuery}');
        if (window.book) {
          console.log('🔍 [WebView] Book available, calling search...');
          window.book.search('${escapedQuery}').then(function(results) {
            console.log('🔍 [WebView] Search completed. Results:', JSON.stringify(results, null, 2));
            console.log('🔍 [WebView] Found', results.length, 'matches');
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'searchResults',
              results: results,
              query: '${escapedQuery}'
            }));
          }).catch(function(err) {
            console.error('🔍 [WebView] Search error:', err);
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'searchResults',
              results: [],
              error: err.message
            }));
          });
        } else {
          console.error('🔍 [WebView] Book not available for search');
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'searchResults',
            results: [],
            error: 'Book not loaded'
          }));
        }
      })();
      true;
    `);
  };

  const goToSearchResult = (cfi: string) => {
    console.log('Navigating to search result:', cfi);
    webviewRef.current?.injectJavaScript(`
      (function() {
        try {
          if (window.rendition) {
            window.rendition.display('${cfi}').then(function() {
              console.log('EPUB Reader: Navigated to search result');
            }).catch(function(err) {
              console.error('EPUB Reader: Failed to navigate:', err);
            });
          }
        } catch(e) {
          console.error('EPUB Reader: Navigation error:', e.message);
        }
      })();
      true;
    `);
    setSearchVisible(false);
  };

  const changeTheme = async (themeName: ThemeType) => {
    console.log('Changing theme to:', themeName);
    const t = Themes[themeName];

    // Update WebView body
    webviewRef.current?.injectJavaScript(`
      (function() {
        document.body.style.backgroundColor = '${t.background}';
        document.body.style.color = '${t.text}';
        // Update iframe content if exists
        var iframes = document.querySelectorAll('iframe');
        if (iframes.length > 0) {
          var iframe = iframes[0];
          try {
            var doc = iframe.contentDocument || iframe.contentWindow.document;
            doc.body.style.backgroundColor = '${t.background}';
            doc.body.style.color = '${t.text}';
            // Force all elements to have new text color
            var allElements = doc.querySelectorAll('*');
            for (var i = 0; i < allElements.length; i++) {
              allElements[i].style.color = '${t.text}';
            }
            console.log('EPUB Reader: Theme updated to ${themeName}');
          } catch(e) {
            console.log('EPUB Reader: Could not update iframe theme:', e.message);
          }
        }
      })();
      true;
    `);

    // Save theme setting to both service and store
    try {
      await SettingsService.updateReaderSettings({ theme: themeName });
      updateReaderSetting('theme', themeName);
      console.log('Theme saved to settings and store:', themeName);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }

    setMenuVisible(false);
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html dir="auto">
    <head>
      <meta charset="UTF-8">
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
        @import url('https://fonts.googleapis.com/css2?family=Amiri&family=Noto+Naskh+Arabic&display=swap');

        html, body {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Naskh Arabic', 'Amiri', serif;
          background-color: ${currentTheme.background};
          color: ${currentTheme.text};
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
        }

        /* RTL Support for Arabic text */
        [dir="rtl"] {
          direction: rtl;
          text-align: right;
        }

        /* Arabic text styling */
        .arabic, [lang="ar"], .quran-text {
          font-family: 'Amiri', 'Noto Naskh Arabic', 'Traditional Arabic', serif;
          font-size: 1.2em;
          line-height: 2;
          direction: rtl;
          text-align: right;
        }
        #viewer {
          width: 100vw;
          height: 100vh;
          overflow: auto;
          position: relative;
          z-index: 1;
          background-color: ${currentTheme.background};
        }
        #viewer iframe {
          overflow-y: auto !important;
          overflow-x: hidden !important;
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
              spread: "none",
              flow: "scrolled-doc"
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
                // Force iframe visibility and dimensions
                iframe.style.visibility = 'visible';
                iframe.style.display = 'block';
                iframe.style.opacity = '1';
                iframe.style.border = 'none';
                iframe.style.backgroundColor = '${currentTheme.background}';
                iframe.style.width = '100%';
                // For scrolled mode, height should be auto to show full content
                iframe.style.height = 'auto';
                iframe.style.minHeight = '100%';
                iframe.style.position = 'relative';
                iframe.style.top = '0';
                iframe.style.left = '0';
                iframe.style.overflow = 'visible';

                // Try to access iframe content to ensure it's loaded
                try {
                  var iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                  console.log('EPUB Reader: Iframe content accessible, body exists:', !!iframeDoc.body);
                  if (iframeDoc.body) {
                    // DEBUG: Check body content
                    console.log('EPUB Reader: Body text length:', iframeDoc.body.innerText ? iframeDoc.body.innerText.length : 0);
                    console.log('EPUB Reader: Body innerHTML length:', iframeDoc.body.innerHTML.length);

                    iframeDoc.body.style.backgroundColor = '${
                      currentTheme.background
                    }';
                    iframeDoc.body.style.color = '${currentTheme.text}';

                    // Add RTL and Arabic font support to iframe - use system fonts for reliability
                    var style = iframeDoc.createElement('style');
                    style.textContent = \`
                      * {
                        visibility: visible !important;
                        opacity: 1 !important;
                        color: ${currentTheme.text} !important;
                        background-color: transparent !important;
                      }

                      body, html {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Arabic', 'Arial', sans-serif !important;
                        -webkit-font-smoothing: antialiased;
                        -moz-osx-font-smoothing: grayscale;
                        text-rendering: optimizeLegibility;
                        visibility: visible !important;
                        opacity: 1 !important;
                        display: block !important;
                        color: ${currentTheme.text} !important;
                        background-color: ${currentTheme.background} !important;
                      }

                      p, span, div, h1, h2, h3, h4, h5, h6, li, td, th, label {
                        color: ${currentTheme.text} !important;
                      }

                      [dir="rtl"], [lang="ar"] {
                        direction: rtl;
                        text-align: right;
                        font-family: 'Noto Sans Arabic', 'Arial', sans-serif !important;
                      }

                      .arabic, .quran-text, [lang="ar"] {
                        font-family: 'Noto Sans Arabic', 'Traditional Arabic', 'Arial', sans-serif !important;
                        font-size: 1.2em;
                        line-height: 2;
                        direction: rtl;
                        text-align: right;
                        color: ${currentTheme.text} !important;
                      }

                      a {
                        color: ${currentTheme.text} !important;
                        text-decoration: underline;
                      }
                    \`;
                    iframeDoc.head.appendChild(style);

                    // Apply stored reader settings if available
                    if (window.readerSettings) {
                      console.log('EPUB Reader: Applying stored reader settings to new section');
                      var rs = window.readerSettings;

                      // Apply font size
                      iframeDoc.body.style.fontSize = rs.fontSize + 'px';

                      // Apply line height
                      iframeDoc.body.style.lineHeight = rs.lineHeight;

                      // Apply margins
                      iframeDoc.body.style.paddingLeft = rs.marginHorizontal + 'px';
                      iframeDoc.body.style.paddingRight = rs.marginHorizontal + 'px';
                      iframeDoc.body.style.paddingTop = rs.marginVertical + 'px';
                      iframeDoc.body.style.paddingBottom = rs.marginVertical + 'px';

                      console.log('EPUB Reader: Settings applied - fontSize:', rs.fontSize, 'lineHeight:', rs.lineHeight);
                    }

                    // Add click handler to iframe body for toggling controls
                    var clickHandler = function(e) {
                      console.log('EPUB Reader: CLICK detected on', e.target.tagName, 'isSwipe:', isSwipe);
                      // Don't trigger if a swipe was detected
                      if (isSwipe !== false) {
                        console.log('EPUB Reader: Ignoring click because swipe was detected');
                        return;
                      }
                      // Don't trigger if clicking on a link or interactive element
                      var tagName = e.target.tagName.toLowerCase();
                      if (tagName === 'a' || tagName === 'button' || tagName === 'input') {
                        console.log('EPUB Reader: Ignoring click on interactive element:', tagName);
                        return;
                      }
                      // Check if clicked element is inside a link
                      var parentLink = e.target.closest('a');
                      if (parentLink) {
                        console.log('EPUB Reader: Ignoring click inside link');
                        return;
                      }
                      console.log('EPUB Reader: Sending click message to RN');
                      window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'click'
                      }));
                    };

                    // Add to body - only use click event, not touchend (to avoid swipe conflicts)
                    iframeDoc.body.addEventListener('click', clickHandler);
                    console.log('EPUB Reader: Click handlers added to iframe body');

                    // Also add to document for better coverage
                    iframeDoc.addEventListener('click', clickHandler);
                    console.log('EPUB Reader: Click handler also added to iframe document');
                  }
                } catch(e) {
                  console.log('EPUB Reader: Cannot access iframe content (cross-origin):', e.message);
                }

                // Fallback: add click handler to iframe element itself
                iframe.addEventListener('click', function(e) {
                  console.log('EPUB Reader: Fallback iframe click detected, isSwipe:', isSwipe);
                  if (isSwipe !== false) {
                    console.log('EPUB Reader: Ignoring fallback click because swipe was detected');
                    return;
                  }
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'click'
                  }));
                });
              }
            });

            // Add displayError event
            window.rendition.on("displayError", function(err) {
              console.error('EPUB Reader: Display error:', err);
              showError('Display error: ' + (err.message || err));
            });

            // Store spine items for progress calculation
            var spineItems = [];
            book.loaded.spine.then(function(spine) {
              spineItems = spine.spineItems || [];
              console.log('EPUB Reader: Spine loaded with', spineItems.length, 'items');
            });

            window.rendition.on("relocated", function(location) {
              console.log('EPUB Reader: Relocated event:', JSON.stringify(location));

              // Calculate book-level progress based on current section
              var currentSectionIndex = 0;
              var totalSections = spineItems.length || 1;

              // Find current section index
              if (location.start && location.start.index !== undefined) {
                currentSectionIndex = location.start.index;
              } else if (window.rendition && window.rendition.location) {
                var currentHref = window.rendition.location.start.href;
                for (var i = 0; i < spineItems.length; i++) {
                  if (spineItems[i].href === currentHref) {
                    currentSectionIndex = i;
                    break;
                  }
                }
              }

              // Calculate overall progress: (current section / total sections) + (position within section)
              var sectionProgress = currentSectionIndex / totalSections;
              var withinSectionProgress = (1 / totalSections) * (location.start.percentage || 0);
              var overallProgress = sectionProgress + withinSectionProgress;

              console.log('EPUB Reader: Progress calculated - Section:', currentSectionIndex, '/', totalSections, '= ', overallProgress);

              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'location',
                cfi: location.start.cfi,
                progress: overallProgress
              }));
            });

            // For scrolled mode, also listen to scroll events for progress updates
            window.rendition.on("rendered", function(section) {
              var iframe = document.querySelector('iframe');
              if (iframe && iframe.contentDocument) {
                var iframeDoc = iframe.contentDocument;
                var scrollHandler = function() {
                  var scrollTop = iframeDoc.documentElement.scrollTop || iframeDoc.body.scrollTop;
                  var scrollHeight = iframeDoc.documentElement.scrollHeight || iframeDoc.body.scrollHeight;
                  var clientHeight = iframeDoc.documentElement.clientHeight || iframeDoc.body.clientHeight;
                  var scrollPercentage = scrollHeight > clientHeight ? scrollTop / (scrollHeight - clientHeight) : 0;

                  // Calculate overall progress
                  var currentSectionIndex = 0;
                  var totalSections = spineItems.length || 1;

                  // Find current section index
                  if (section && section.href) {
                    for (var i = 0; i < spineItems.length; i++) {
                      if (spineItems[i].href === section.href) {
                        currentSectionIndex = i;
                        break;
                      }
                    }
                  }

                  var sectionProgress = currentSectionIndex / totalSections;
                  var withinSectionProgress = (1 / totalSections) * scrollPercentage;
                  var overallProgress = sectionProgress + withinSectionProgress;

                  // Get current location
                  var currentLocation = window.rendition.currentLocation();
                  if (currentLocation && currentLocation.start) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'location',
                      cfi: currentLocation.start.cfi,
                      progress: overallProgress
                    }));
                  }
                };
                iframeDoc.addEventListener('scroll', scrollHandler, { passive: true });
              }
            });

            // Add swipe gesture support for page turning (on document for full coverage)
            var touchStartX = 0;
            var touchStartY = 0;
            var touchEndX = 0;
            var touchEndY = 0;
            var isSwipe = false;
            var swipeDebug = true; // Enable swipe debugging

            function handleTouchStart(e) {
              touchStartX = e.changedTouches[0].screenX;
              touchStartY = e.changedTouches[0].screenY;
              isSwipe = false;
              if (swipeDebug) console.log('EPUB Swipe: touchstart at', touchStartX.toFixed(0), touchStartY.toFixed(0));
            }

            function handleTouchMove(e) {
              var diffX = Math.abs(e.changedTouches[0].screenX - touchStartX);
              var diffY = Math.abs(e.changedTouches[0].screenY - touchStartY);
              // Only detect horizontal swipes for page navigation
              // Vertical swipes are left free for content scrolling
              if (diffX > 25 && diffX > diffY * 1.2) {
                isSwipe = 'horizontal';
              }
            }

            function handleTouchEnd(e) {
              touchEndX = e.changedTouches[0].screenX;
              touchEndY = e.changedTouches[0].screenY;
              // Threshold for triggering swipe action (lower than move detection for responsiveness)
              var swipeThreshold = 60;
              var diffX = touchStartX - touchEndX;
              var diffY = touchStartY - touchEndY;
              var absDiffX = Math.abs(diffX);
              var absDiffY = Math.abs(diffY);

              if (swipeDebug) {
                console.log('EPUB Swipe: touchend, diffX:', diffX.toFixed(0),
                  'diffY:', diffY.toFixed(0),
                  'isSwipe:', isSwipe);
              }

              // Horizontal swipe - page navigation
              if (absDiffX > swipeThreshold && isSwipe === 'horizontal') {
                e.preventDefault();
                e.stopPropagation();
                if (diffX > 0) {
                  console.log('EPUB Swipe: >>> SWIPE LEFT detected, going NEXT');
                  window.rendition.next();
                } else {
                  console.log('EPUB Swipe: <<< SWIPE RIGHT detected, going PREV');
                  window.rendition.prev();
                }
              }
              else if (swipeDebug && (absDiffX > 20 || absDiffY > 20)) {
                console.log('EPUB Swipe: Swipe detected but below threshold, ignoring');
              }
            }

            // Attach to document
            document.addEventListener('touchstart', handleTouchStart, {passive: true});
            document.addEventListener('touchmove', handleTouchMove, {passive: true});
            document.addEventListener('touchend', handleTouchEnd, {passive: false});

            // Also attach to iframe when content loads
            window.rendition.on('rendered', function(section) {
              console.log('EPUB Swipe: Section rendered, attaching touch handlers to iframe');
              var iframe = document.querySelector('iframe');
              if (iframe && iframe.contentDocument) {
                var iframeDoc = iframe.contentDocument;
                iframeDoc.addEventListener('touchstart', handleTouchStart, {passive: true});
                iframeDoc.addEventListener('touchmove', handleTouchMove, {passive: true});
                iframeDoc.addEventListener('touchend', handleTouchEnd, {passive: false});
                console.log('EPUB Swipe: Touch handlers attached to iframe');
              }
            });

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
              // Only trigger if not swiping (isSwipe will be false if no swipe occurred)
              if (isSwipe === false) {
                console.log('EPUB Reader: Tap detected, toggling controls');
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'click'
                }));
              } else {
                console.log('EPUB Reader: Ignoring tap because swipe was detected:', isSwipe);
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

  // Recursive function to render TOC items with proper nesting
  const renderTocItems = (items: TocItem[], level: number) => {
    return items.map((item, index) => (
      <View key={`${level}-${index}`}>
        <Pressable
          onPress={() => {
            console.log('TOC item PRESSED:', item.label, 'href:', item.href);
            goToLocation(item.href);
            setTocVisible(false);
          }}
          style={({ pressed }) => [
            styles.tocItem,
            { paddingLeft: 16 + level * 20 },
            pressed && { backgroundColor: theme.colors.primary + '20' },
          ]}
          android_ripple={{ color: theme.colors.primary + '20' }}
        >
          <View style={styles.tocItemContent}>
            <Text
              style={[styles.tocItemText, { color: theme.colors.onSurface }]}
              numberOfLines={2}
            >
              {item.label}
            </Text>
          </View>
        </Pressable>
        {item.subitems &&
          item.subitems.length > 0 &&
          renderTocItems(item.subitems, level + 1)}
      </View>
    ));
  };

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
            {/* Title Row */}
            <View style={styles.topBarRow}>
              <IconButton
                icon="arrow-left"
                onPress={() => navigation.goBack()}
              />
              <Text
                numberOfLines={1}
                style={[styles.title, { color: theme.colors.onSurface }]}
              >
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
                  onPress={() => {
                    loadBookmarks();
                    setBookmarksVisible(true);
                  }}
                  title="View Bookmarks"
                  leadingIcon="bookmark-multiple"
                />
                <Menu.Item
                  onPress={() => {
                    setMenuVisible(false);
                    setTocVisible(true);
                  }}
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
            {/* Search Row */}
            <View style={styles.searchBarRow}>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                mode="flat"
                dense
                placeholder="Search in book..."
                onSubmitEditing={handleSearch}
                style={[
                  styles.topSearchInput,
                  { backgroundColor: theme.colors.surfaceVariant },
                ]}
                left={<TextInput.Icon icon="magnify" />}
                right={
                  searchQuery ? (
                    <TextInput.Icon
                      icon="close"
                      onPress={() => setSearchQuery('')}
                    />
                  ) : undefined
                }
              />
            </View>
            {/* Search Results Dropdown */}
            {/* Search Loading Indicator */}
            {isSearching && (
              <View style={styles.searchLoadingContainer}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text
                  style={[
                    styles.searchLoadingText,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Searching...
                </Text>
              </View>
            )}

            {/* Search Results Dropdown */}
            {!isSearching && searchResults.length > 0 && (
              <Surface
                style={[
                  styles.searchResultsDropdown,
                  { backgroundColor: theme.colors.surface },
                ]}
                elevation={4}
              >
                <View style={styles.searchResultsHeader}>
                  <View style={styles.searchResultsTitle}>
                    <IconButton
                      icon="magnify"
                      size={16}
                      iconColor={theme.colors.primary}
                    />
                    <Text
                      variant="labelMedium"
                      style={{ color: theme.colors.primary }}
                    >
                      {searchResults.length} result
                      {searchResults.length !== 1 ? 's' : ''} found
                    </Text>
                  </View>
                  <IconButton
                    icon="close"
                    size={16}
                    onPress={() => setSearchResults([])}
                  />
                </View>
                <ScrollView style={styles.searchResultsList}>
                  {searchResults.map((result, index) => (
                    <Pressable
                      key={index}
                      onPress={() => {
                        console.log('🔍 Result clicked:', result.cfi);
                        if (result.cfi) {
                          goToSearchResult(result.cfi);
                        }
                      }}
                      style={({ pressed }) => [
                        styles.searchResultRow,
                        pressed && {
                          backgroundColor: theme.colors.primary + '15',
                        },
                      ]}
                      android_ripple={{ color: theme.colors.primary + '20' }}
                    >
                      <View style={styles.searchResultContent}>
                        <Text
                          style={[
                            styles.searchResultSnippet,
                            { color: theme.colors.onSurface },
                          ]}
                          numberOfLines={2}
                        >
                          {highlightSearchTerm(
                            result.excerpt || result.text || 'No preview',
                            searchQuery,
                          )}
                        </Text>
                        {result.section && (
                          <Text
                            style={[
                              styles.searchResultSection,
                              { color: theme.colors.onSurfaceVariant },
                            ]}
                            numberOfLines={1}
                          >
                            {result.section}
                          </Text>
                        )}
                      </View>
                      <IconButton
                        icon="chevron-right"
                        size={16}
                        iconColor={theme.colors.onSurfaceVariant}
                      />
                    </Pressable>
                  ))}
                </ScrollView>
              </Surface>
            )}

            {/* No Results Message */}
            {!isSearching && searchQuery && searchResults.length === 0 && (
              <Surface
                style={[
                  styles.searchNoResults,
                  { backgroundColor: theme.colors.surface },
                ]}
                elevation={2}
              >
                <IconButton
                  icon="magnify-close"
                  size={24}
                  iconColor={theme.colors.onSurfaceVariant}
                />
                <Text
                  style={[
                    styles.searchNoResultsText,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  No results found for "{searchQuery}"
                </Text>
              </Surface>
            )}
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
          dismissable
          dismissableBackButton
          contentContainerStyle={[
            styles.tocModal,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Text variant="titleLarge" style={styles.tocTitle}>
            Table of Contents
          </Text>
          <Divider />
          <ScrollView style={styles.tocScrollView}>
            {toc.length === 0 ? (
              <Text style={styles.emptyTocText}>
                No table of contents available
              </Text>
            ) : (
              renderTocItems(toc, 0)
            )}
          </ScrollView>
        </Modal>
      </Portal>

      {/* Bookmarks Modal */}
      <Portal>
        <Modal
          visible={bookmarksVisible}
          onDismiss={() => setBookmarksVisible(false)}
          dismissable
          dismissableBackButton
          contentContainerStyle={[
            styles.tocModal,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Text variant="titleLarge" style={styles.tocTitle}>
            Bookmarks
          </Text>
          <Divider />
          <ScrollView style={styles.tocScrollView}>
            {bookmarks.length === 0 ? (
              <Text style={styles.emptyTocText}>No bookmarks yet</Text>
            ) : (
              bookmarks.map((bookmark, index) => (
                <View key={bookmark.id || index}>
                  <View style={styles.bookmarkRow}>
                    <Pressable
                      onPress={() => {
                        console.log(
                          'Bookmark pressed:',
                          bookmark.note || 'Bookmark',
                          'cfi:',
                          bookmark.cfi,
                        );
                        if (bookmark.cfi) {
                          goToBookmark(bookmark.cfi);
                          setBookmarksVisible(false);
                        }
                      }}
                      style={({ pressed }) => [
                        styles.bookmarkInfo,
                        pressed && {
                          backgroundColor: theme.colors.primary + '20',
                        },
                      ]}
                      android_ripple={{ color: theme.colors.primary + '20' }}
                    >
                      <Text
                        style={[
                          styles.tocItemText,
                          { color: theme.colors.onSurface },
                        ]}
                        numberOfLines={1}
                      >
                        {bookmark.note ||
                          `Bookmark at ${
                            bookmark.createdAt
                              ? new Date(
                                  bookmark.createdAt,
                                ).toLocaleDateString()
                              : 'unknown'
                          }`}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        if (bookmark.id) {
                          console.log('Deleting bookmark:', bookmark.id);
                          BookService.deleteBookmark(bookmark.id);
                          setBookmarks(prev =>
                            prev.filter(b => b.id !== bookmark.id),
                          );
                        }
                      }}
                      style={styles.bookmarkDelete}
                    >
                      <IconButton
                        icon="delete"
                        size={20}
                        iconColor={theme.colors.error}
                      />
                    </Pressable>
                  </View>
                  <Divider />
                </View>
              ))
            )}
          </ScrollView>
        </Modal>
      </Portal>

      {/* Add Bookmark Dialog */}
      <Portal>
        <Modal
          visible={bookmarkDialogVisible}
          onDismiss={() => setBookmarkDialogVisible(false)}
          dismissable
          dismissableBackButton
          contentContainerStyle={[
            styles.bookmarkDialog,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Text variant="titleLarge" style={styles.dialogTitle}>
            Add Bookmark
          </Text>
          <TextInput
            label="Title"
            value={bookmarkTitle}
            onChangeText={setBookmarkTitle}
            mode="outlined"
            style={styles.dialogInput}
            placeholder="Enter bookmark title"
          />
          <TextInput
            label="Description (optional)"
            value={bookmarkDescription}
            onChangeText={setBookmarkDescription}
            mode="outlined"
            style={styles.dialogInput}
            placeholder="Enter description"
            multiline
            numberOfLines={2}
          />
          <View style={styles.dialogButtons}>
            <Button
              mode="outlined"
              onPress={() => setBookmarkDialogVisible(false)}
              style={styles.dialogButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={saveBookmark}
              style={styles.dialogButton}
            >
              Save
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* Search Modal */}
      <Portal>
        <Modal
          visible={searchVisible}
          onDismiss={() => setSearchVisible(false)}
          dismissable
          dismissableBackButton
          contentContainerStyle={[
            styles.searchModal,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Text variant="titleLarge" style={styles.dialogTitle}>
            Search
          </Text>
          <View style={styles.searchInputRow}>
            <TextInput
              label="Search text"
              value={searchQuery}
              onChangeText={setSearchQuery}
              mode="outlined"
              style={styles.searchInput}
              placeholder="Enter search term"
              onSubmitEditing={handleSearch}
            />
            <Button
              mode="contained"
              onPress={handleSearch}
              style={styles.searchButton}
            >
              Search
            </Button>
          </View>
          <Divider style={styles.searchDivider} />
          <ScrollView style={styles.searchResults}>
            {searchResults.length === 0 ? (
              searchQuery ? (
                <Text style={styles.emptySearchText}>No results found</Text>
              ) : (
                <Text style={styles.emptySearchText}>Enter a search term</Text>
              )
            ) : (
              searchResults.map((result, index) => (
                <Pressable
                  key={index}
                  onPress={() => {
                    if (result.cfi) {
                      goToSearchResult(result.cfi);
                    }
                  }}
                  style={({ pressed }) => [
                    styles.searchResultItem,
                    pressed && {
                      backgroundColor: theme.colors.primary + '20',
                    },
                  ]}
                  android_ripple={{ color: theme.colors.primary + '20' }}
                >
                  <Text
                    style={[
                      styles.searchResultText,
                      { color: theme.colors.onSurface },
                    ]}
                    numberOfLines={2}
                  >
                    {result.excerpt || result.text || 'Result'}
                  </Text>
                </Pressable>
              ))
            )}
          </ScrollView>
        </Modal>
      </Portal>

      {/* Toast Notification */}
      <Snackbar
        visible={toastVisible}
        onDismiss={() => setToastVisible(false)}
        duration={2000}
        style={{ backgroundColor: theme.colors.primary }}
      >
        {toastMessage}
      </Snackbar>
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
    flexDirection: 'column',
    paddingHorizontal: 8,
    paddingTop: 40,
    pointerEvents: 'auto',
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 8,
  },
  searchBarRow: {
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  topSearchInput: {
    height: 40,
  },
  searchResultsDropdown: {
    marginHorizontal: 8,
    marginBottom: 8,
    borderRadius: 8,
    maxHeight: 200,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  searchResultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  searchResultsList: {
    maxHeight: 160,
  },
  searchResultRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  searchResultSnippet: {
    fontSize: 13,
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
  tocItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  tocItemText: {
    fontSize: 16,
  },
  emptyTocText: {
    textAlign: 'center',
    paddingVertical: 20,
    opacity: 0.6,
  },
  tocScrollView: {
    maxHeight: height * 0.5,
  },
  tocItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bookmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bookmarkInfo: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  bookmarkDelete: {
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookmarkDialog: {
    margin: 20,
    padding: 20,
    borderRadius: 8,
  },
  dialogTitle: {
    marginBottom: 16,
  },
  dialogInput: {
    marginBottom: 12,
  },
  dialogButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  dialogButton: {
    marginLeft: 8,
  },
  searchModal: {
    margin: 20,
    padding: 20,
    borderRadius: 8,
    maxHeight: height * 0.8,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    marginRight: 8,
  },
  searchButton: {
    marginTop: 6,
  },
  searchDivider: {
    marginVertical: 12,
  },
  searchResults: {
    maxHeight: height * 0.5,
  },
  emptySearchText: {
    textAlign: 'center',
    paddingVertical: 20,
    opacity: 0.6,
  },
  searchResultItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  searchResultText: {
    fontSize: 14,
  },
  // New search UI styles
  searchLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 8,
  },
  searchLoadingText: {
    marginLeft: 8,
    fontSize: 14,
  },
  searchResultsTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchResultContent: {
    flex: 1,
    marginRight: 8,
  },
  searchResultSection: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.7,
  },
  searchNoResults: {
    marginHorizontal: 8,
    marginBottom: 8,
    paddingVertical: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  searchNoResultsText: {
    fontSize: 14,
    marginTop: 8,
  },
});

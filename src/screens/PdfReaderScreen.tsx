import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import {
  Text,
  IconButton,
  useTheme,
  Menu,
  Divider,
  Button,
} from 'react-native-paper';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import * as FileSystem from 'expo-file-system/legacy';

import { RootStackParamList } from '../navigation/AppNavigator';
import { useStore } from '../hooks/useStore';
import BookService from '../services/BookService';
import { Book } from '../types';

type RoutePropType = RouteProp<RootStackParamList, 'PdfReader'>;

export default function PdfReaderScreen() {
  const route = useRoute<RoutePropType>();
  const navigation = useNavigation();
  const theme = useTheme();
  const { bookId, initialPage } = route.params;
  const { readerSettings } = useStore();
  const webViewRef = useRef<WebView>(null);

  const [book, setBook] = useState<Book | null>(null);
  const [bookLoading, setBookLoading] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [pdfPath, setPdfPath] = useState<string>('');
  const [pdfBase64, setPdfBase64] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Load book data
  useEffect(() => {
    const loadBook = async () => {
      try {
        const loadedBook = await BookService.getBookById(bookId);
        if (loadedBook) {
          setBook(loadedBook);
          setCurrentPage(initialPage || loadedBook.currentPage || 1);
          setTotalPages(loadedBook.totalPages || 0);
          setPdfPath(loadedBook.filePath);

          // For local files, read as base64
          if (loadedBook.filePath.startsWith('file://')) {
            try {
              // Get file info first to check size
              const fileInfo = await FileSystem.getInfoAsync(
                loadedBook.filePath,
              );
              if (fileInfo.exists && fileInfo.size > 30 * 1024 * 1024) {
                // File larger than 30MB - warn user
                const sizeMB = (fileInfo.size / 1024 / 1024).toFixed(1);
                console.warn(`Large PDF detected: ${sizeMB}MB`);
              }

              // For files >50MB, suggest alternatives but still try to load
              if (fileInfo.exists && fileInfo.size > 50 * 1024 * 1024) {
                setError(
                  'PDF is very large (>50MB). This may cause memory issues.\n\n' +
                    'Solutions:\n' +
                    '1. Use smaller PDF (<30MB)\n' +
                    '2. Compress PDF online\n' +
                    '3. Use Expo Dev Client (see docs)',
                );
                // Don't return - let user decide to retry
              }

              const base64 = await FileSystem.readAsStringAsync(
                loadedBook.filePath,
                { encoding: 'base64' },
              );
              setPdfBase64(base64);
              setError(null); // Clear any warnings
            } catch (fileErr: any) {
              console.error('Error reading PDF file:', fileErr);
              if (fileErr?.message?.includes('OutOfMemoryError')) {
                setError(
                  'Out of Memory! PDF too large for Expo Go.\n\n' +
                    'Solutions:\n' +
                    '1. Compress PDF at ilovepdf.com/compress-pdf\n' +
                    '2. Split PDF into smaller parts\n' +
                    '3. Use Expo Dev Client:\n' +
                    '   npx expo prebuild\n' +
                    '   npx expo run:android',
                );
              } else {
                setError('Failed to read PDF file');
              }
            }
          }
        } else {
          console.error('PdfReader: Book not found');
          navigation.goBack();
        }
      } catch (err) {
        console.error('PdfReader: Error loading book:', err);
        navigation.goBack();
      } finally {
        setBookLoading(false);
      }
    };
    loadBook();
  }, [bookId, navigation, initialPage]);

  // Save progress every 5 seconds or when page changes
  const lastSavedPage = useRef(currentPage);
  const saveProgressTimeout = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const saveProgress = useCallback(async () => {
    if (!book) return;
    try {
      if (currentPage !== lastSavedPage.current) {
        await BookService.updateReadingProgress(book.id, currentPage);
        lastSavedPage.current = currentPage;
      }
    } catch (err) {
      console.error('Error saving progress:', err);
    }
  }, [currentPage, book]);

  // Save progress when page changes
  useEffect(() => {
    if (currentPage !== lastSavedPage.current) {
      // Debounce save
      if (saveProgressTimeout.current) {
        clearTimeout(saveProgressTimeout.current);
      }
      saveProgressTimeout.current = setTimeout(() => {
        saveProgress();
      }, 2000);
    }

    return () => {
      if (saveProgressTimeout.current) {
        clearTimeout(saveProgressTimeout.current);
      }
    };
  }, [currentPage, saveProgress]);

  // Save progress on unmount
  useEffect(() => {
    return () => {
      saveProgress();
    };
  }, [saveProgress]);

  const addBookmark = useCallback(async () => {
    if (!book) return;
    try {
      await BookService.addBookmark(book.id, '', `Page ${currentPage}`);
      setMenuVisible(false);
    } catch (err) {
      console.error('Error adding bookmark:', err);
    }
  }, [book, currentPage]);

  const openInBrowser = useCallback(async () => {
    if (!book) return;
    await WebBrowser.openBrowserAsync(book.filePath);
    setMenuVisible(false);
  }, [book]);

  const goToPreviousPage = useCallback(() => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      // Send message to WebView to navigate to page
      webViewRef.current?.injectJavaScript(`
        window.scrollTo(0, (document.body.scrollHeight / ${totalPages}) * (${newPage} - 1));
        true;
      `);
    }
  }, [currentPage, totalPages]);

  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      // Send message to WebView to navigate to page
      webViewRef.current?.injectJavaScript(`
        window.scrollTo(0, (document.body.scrollHeight / ${totalPages}) * (${newPage} - 1));
        true;
      `);
    }
  }, [currentPage, totalPages]);

  const currentTheme =
    readerSettings.theme === 'dark'
      ? { background: '#121212', text: '#FFFFFF' }
      : readerSettings.theme === 'sepia'
      ? { background: '#F4ECD8', text: '#5B4636' }
      : { background: '#FFFFFF', text: '#000000' };

  // Generate PDF viewer HTML
  const getPdfViewerHtml = (pdfUrl: string) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
        <style>
          body {
            margin: 0;
            padding: 0;
            background-color: #525659;
            overflow-x: hidden;
          }
          #pdf-container {
            width: 100%;
            height: 100vh;
          }
          iframe {
            width: 100%;
            height: 100%;
            border: none;
          }
        </style>
      </head>
      <body>
        <div id="pdf-container">
          <iframe src="https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(
            pdfUrl,
          )}" type="application/pdf"></iframe>
        </div>
      </body>
      </html>
    `;
  };

  // Alternative: Use Mozilla PDF.js viewer for local files
  const getLocalPdfViewerHtml = (base64Data: string) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
        <style>
          * {
            box-sizing: border-box;
          }
          body {
            margin: 0;
            padding: 0;
            background-color: #525659;
            overflow-x: auto;
          }
          #viewer {
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 10px 0;
            min-width: min-content;
          }
          canvas {
            margin: 5px auto;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            max-width: none;
            height: auto;
          }
          .loading {
            color: white;
            text-align: center;
            padding: 20px;
            font-family: sans-serif;
            font-size: 16px;
          }
        </style>
      </head>
      <body>
        <div id="viewer"><div class="loading">Loading PDF...</div></div>
        <script>
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

          const pdfData = atob('${base64Data}');
          const pdfDataArray = new Uint8Array(pdfData.length);
          for (let i = 0; i < pdfData.length; i++) {
            pdfDataArray[i] = pdfData.charCodeAt(i);
          }

          const loadingTask = pdfjsLib.getDocument({ data: pdfDataArray });
          loadingTask.promise.then(async function(pdf) {
            window.pdfDocument = pdf;
            window.totalPages = pdf.numPages;

            const viewer = document.getElementById('viewer');
            viewer.innerHTML = '';

            const pixelRatio = window.devicePixelRatio || 1;
            // Render at 1.5x, display at 0.67x for sharp text at target size
            const renderScale = 1.5;
            const cssScale = 0.67 / 1.5; // 0.447 - scales 1.5x render to 0.67x display
            const logMsg = 'PDF Render - DPR:' + pixelRatio + ' RenderScale:' + renderScale + ' Pages:' + pdf.numPages;
            console.log(logMsg);
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage('LOG:' + logMsg);
            }

            // Render only first page initially, then load others on demand
            const renderPage = async (pageNum) => {
              const page = await pdf.getPage(pageNum);
              const viewport = page.getViewport({ scale: renderScale });

              const canvas = document.createElement('canvas');
              canvas.id = 'page-' + pageNum;
              const context = canvas.getContext('2d');
              // Render at 1.5x for quality
              canvas.height = viewport.height;
              canvas.width = viewport.width;
              // Scale down to 0.67 display size
              canvas.style.width = (viewport.width * 0.447) + 'px';
              canvas.style.height = (viewport.height * 0.447) + 'px';

              const renderContext = {
                canvasContext: context,
                viewport: viewport
              };
              await page.render(renderContext).promise;
              viewer.appendChild(canvas);

              const pageLog = 'Rendered page ' + pageNum;
              console.log(pageLog);
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage('LOG:' + pageLog);
              }
            };

            // Render first 3 pages only
            const pagesToRender = Math.min(3, pdf.numPages);
            for (let i = 1; i <= pagesToRender; i++) {
              await renderPage(i);
            }

            // Notify React Native that loading is complete
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage('PDF_LOADED');
            }
          }).catch(function(error) {
            console.error('Error loading PDF:', error);
            document.getElementById('viewer').innerHTML = '<div class="loading">Error loading PDF: ' + error.message + '</div>';
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage('PDF_ERROR:' + error.message);
            }
          });
        </script>
      </body>
      </html>
    `;
  };

  if (bookLoading || !book) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <Text>Loading book...</Text>
      </View>
    );
  }

  if (isLoading && !pdfPath) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: currentTheme.background,
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 16, color: currentTheme.text }}>
          Loading PDF...
        </Text>
      </View>
    );
  }

  if (error) {
    const isLargeFileError =
      error.includes('large') || error.includes('Memory');
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: currentTheme.background,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          },
        ]}
      >
        <Text
          style={{
            color: theme.colors.error,
            textAlign: 'left',
            marginBottom: 24,
            fontSize: 14,
            lineHeight: 22,
          }}
        >
          {error}
        </Text>
        <View style={{ gap: 12, width: '100%' }}>
          <Button
            mode="contained"
            onPress={() => {
              setError(null);
              setIsLoading(true);
            }}
          >
            Retry
          </Button>
          {isLargeFileError && (
            <Button
              mode="outlined"
              onPress={() =>
                WebBrowser.openBrowserAsync(
                  'https://www.ilovepdf.com/compress-pdf',
                )
              }
            >
              Compress PDF Online
            </Button>
          )}
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: currentTheme.background }]}
    >
      {/* Header - Toggleable */}
      {controlsVisible && (
        <SafeAreaView
          style={[
            styles.headerContainer,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <View style={styles.headerContent}>
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
        </SafeAreaView>
      )}

      {/* PDF Viewer */}
      <View style={styles.pdfContainer}>
        <WebView
          ref={webViewRef}
          source={{
            html: pdfPath.startsWith('http')
              ? getPdfViewerHtml(pdfPath)
              : getLocalPdfViewerHtml(pdfBase64),
          }}
          style={styles.pdf}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          onError={syntheticEvent => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView error:', nativeEvent);
            setError(nativeEvent.description || 'Failed to load PDF');
            setIsLoading(false);
          }}
          originWhitelist={['*']}
          allowFileAccess={true}
          allowUniversalAccessFromFileURLs={true}
          allowFileAccessFromFileURLs={true}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          onMessage={event => {
            const message = event.nativeEvent.data;
            if (message?.startsWith('LOG:')) {
              console.log('[PDF.js]', message.replace('LOG:', ''));
            } else if (message === 'PDF_LOADED') {
              console.log('[PDF.js] PDF loaded successfully');
              setIsLoading(false);
            } else if (message?.startsWith('PDF_ERROR:')) {
              console.error('[PDF.js]', message.replace('PDF_ERROR:', ''));
              setError(message.replace('PDF_ERROR:', ''));
              setIsLoading(false);
            } else {
              console.log('[PDF.js]', message);
            }
          }}
        />
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        )}
        {/* Floating Toggle Button */}
        <TouchableOpacity
          style={[
            styles.toggleButton,
            {
              backgroundColor: controlsVisible
                ? theme.colors.primary
                : theme.colors.surfaceVariant,
            },
          ]}
          onPress={() => setControlsVisible(!controlsVisible)}
        >
          <Text
            style={[
              styles.toggleButtonText,
              {
                color: controlsVisible
                  ? theme.colors.onPrimary
                  : theme.colors.onSurfaceVariant,
              },
            ]}
          >
            {controlsVisible ? '🙈' : '🙉'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Footer */}
      {controlsVisible && (
        <View
          style={[
            styles.footerContainer,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <SafeAreaView style={styles.footerContent}>
            {/* Combined Controls Row */}
            <View style={styles.footerControlsRow}>
              {/* Previous Page */}
              <IconButton
                icon="chevron-left"
                onPress={goToPreviousPage}
                disabled={currentPage <= 1}
              />

              {/* Page Info */}
              <View style={styles.pageInfoContainer}>
                {readerSettings.showPageNumbers !== false && (
                  <Text style={styles.pageInfo}>
                    {currentPage} / {totalPages > 0 ? totalPages : '-'}
                  </Text>
                )}
              </View>

              {/* Next Page */}
              <IconButton
                icon="chevron-right"
                onPress={goToNextPage}
                disabled={totalPages > 0 && currentPage >= totalPages}
              />
            </View>
          </SafeAreaView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    pointerEvents: 'auto',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    height: 56,
  },
  pdfContainer: {
    flex: 1,
    position: 'relative',
  },
  pdf: {
    flex: 1,
    backgroundColor: '#525659',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(82, 86, 89, 0.8)',
  },
  toggleButton: {
    position: 'absolute',
    right: 16,
    bottom: 125,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  toggleButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 8,
  },
  footerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'auto',
  },
  footerContent: {
    pointerEvents: 'auto',
  },
  footerControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  pageInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pageInfo: {
    fontSize: 14,
    fontWeight: '500',
    marginHorizontal: 8,
  },
});

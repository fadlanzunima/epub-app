import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from 'react-native';
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
import * as FileSystem from 'expo-file-system/legacy';
import * as WebBrowser from 'expo-web-browser';

import { RootStackParamList } from '../navigation/AppNavigator';
import { useStore } from '../hooks/useStore';
import BookService from '../services/BookService';

type RoutePropType = RouteProp<RootStackParamList, 'PdfReader'>;

// HTML template for PDF.js viewer with base64 support
// Margins will be injected via string replacement
const PDF_VIEWER_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #333;
      overflow: hidden;
    }
    #container {
      width: 100vw;
      height: 100vh;
      display: flex;
      flex-direction: column;
      background: #525659;
      padding-top: 60px; /* Header padding */
    }
    #viewer {
      flex: 1;
      overflow: auto;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: __MARGIN_VERTICAL__px __MARGIN_HORIZONTAL__px;
    }
    #canvas {
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      max-width: 100%;
    }
    .loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: white;
      font-size: 16px;
    }
    .error {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #ff6b6b;
      text-align: center;
      padding: 20px;
    }
  </style>
</head>
<body>
  <div id="container">
    <div id="viewer">
      <div id="loading" class="loading">Loading PDF...</div>
      <canvas id="canvas"></canvas>
    </div>
  </div>
  <script>
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    let pdfDoc = null;
    let currentPage = 1;
    let totalPages = 0;
    let scale = 1.5;
    let pdfDataBase64 = null;

    // Listen for messages from React Native
    document.addEventListener('message', function(e) {
      console.log('WebView: Received message:', e.data);
      const data = JSON.parse(e.data);

      if (data.type === 'loadPdf') {
        console.log('WebView: Loading PDF, base64 length:', data.base64Data ? data.base64Data.length : 0);
        pdfDataBase64 = data.base64Data;
        loadPDF(pdfDataBase64, data.startPage || 1);
      } else if (data.type === 'nextPage') {
        changePage(currentPage + 1);
      } else if (data.type === 'prevPage') {
        changePage(currentPage - 1);
      } else if (data.type === 'goToPage') {
        changePage(data.page);
      } else if (data.type === 'zoomIn') {
        scale *= 1.2;
        renderPage(currentPage);
      } else if (data.type === 'zoomOut') {
        scale /= 1.2;
        renderPage(currentPage);
      }
    });

    function loadPDF(base64Data, startPage) {
      console.log('WebView: loadPDF called');
      try {
        const uint8Array = base64ToUint8Array(base64Data);
        console.log('WebView: Converted base64 to Uint8Array, length:', uint8Array.length);

        console.log('WebView: Checking pdfjsLib...', typeof pdfjsLib);
        const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
        console.log('WebView: Created loading task');

        loadingTask.promise.then(function(pdf) {
          console.log('WebView: PDF loaded successfully, pages:', pdf.numPages);
          pdfDoc = pdf;
          totalPages = pdf.numPages;
          currentPage = Math.min(Math.max(startPage, 1), totalPages);

          // Send total pages to React Native
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'pdfLoaded',
            totalPages: totalPages,
            currentPage: currentPage
          }));

          renderPage(currentPage);
        }).catch(function(error) {
          console.error('WebView: Error loading PDF:', error.message);
          document.getElementById('loading').innerHTML = '<div class="error">Error loading PDF:<br>' + error.message + '</div>';
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'error',
            message: error.message
          }));
        });
      } catch (err) {
        console.error('WebView: Error in loadPDF:', err.message);
        document.getElementById('loading').innerHTML = '<div class="error">Error: ' + err.message + '</div>';
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'error',
          message: err.message
        }));
      }
    }

    function base64ToUint8Array(base64) {
      console.log('WebView: Converting base64, input length:', base64 ? base64.length : 0);
      try {
        const binaryString = atob(base64);
        console.log('WebView: atob successful, binary length:', binaryString.length);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        console.log('WebView: Uint8Array created, length:', bytes.length);
        return bytes;
      } catch (err) {
        console.error('WebView: base64ToUint8Array error:', err.message);
        throw err;
      }
    }

    function renderPage(pageNum) {
      if (!pdfDoc) return;

      pdfDoc.getPage(pageNum).then(function(page) {
        const canvas = document.getElementById('canvas');
        const context = canvas.getContext('2d');

        const viewport = page.getViewport({ scale: scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        document.getElementById('loading').style.display = 'none';

        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };

        page.render(renderContext).promise.then(function() {
          currentPage = pageNum;
          // Send page change to React Native
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'pageChanged',
            currentPage: currentPage,
            totalPages: totalPages
          }));
        });
      });
    }

    function changePage(newPage) {
      if (newPage < 1 || newPage > totalPages) return;
      renderPage(newPage);
    }

    // Send ready message when page is loaded
    window.onload = function() {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'ready'
        }));
      }
    };
  </script>
</body>
</html>
`;

export default function PdfReaderScreen() {
  const route = useRoute<RoutePropType>();
  const navigation = useNavigation();
  const theme = useTheme();
  const { book } = route.params;
  const { readerSettings } = useStore();
  const webViewRef = useRef<WebView>(null);

  const [controlsVisible, setControlsVisible] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(book.currentPage || 1);
  const [totalPages, setTotalPages] = useState(book.totalPages || 0);
  const [isLoading, setIsLoading] = useState(true);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [webViewReady, setWebViewReady] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Save progress every 5 seconds or when page changes
  const lastSavedPage = useRef(currentPage);
  const saveProgressTimeout = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Load PDF file as base64
  useEffect(() => {
    const loadPdfFile = async () => {
      try {
        console.log('📄 PdfReader: Loading PDF file...', {
          filePath: book.filePath,
          currentPage: book.currentPage,
          totalPages: book.totalPages,
        });
        setIsLoading(true);
        setError(null);

        // Verify file exists
        const fileInfo = await FileSystem.getInfoAsync(book.filePath);
        console.log('📄 PdfReader: File info:', fileInfo);

        if (!fileInfo.exists) {
          throw new Error(`PDF file not found: ${book.filePath}`);
        }

        // Read PDF file as base64
        console.log('📄 PdfReader: Reading file as base64...');
        const base64 = await FileSystem.readAsStringAsync(book.filePath, {
          encoding: FileSystem.EncodingType.Base64,
        });

        console.log('📄 PdfReader: File loaded, base64 length:', base64.length);
        setPdfBase64(base64);
        setIsLoading(false);
      } catch (err: any) {
        console.error('📄 PdfReader: Error loading PDF:', err);
        setError(err.message || 'Failed to load PDF file');
        setIsLoading(false);
      }
    };

    loadPdfFile();
  }, [book.filePath]);

  // Save progress function
  const saveProgress = useCallback(async () => {
    try {
      if (currentPage !== lastSavedPage.current) {
        await BookService.updateReadingProgress(book.id, currentPage);
        lastSavedPage.current = currentPage;
      }
    } catch (err) {
      console.error('Error saving progress:', err);
    }
  }, [currentPage, book.id]);

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

  const sendMessageToWebView = useCallback((data: any) => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify(data));
    }
  }, []);

  // Send PDF data to WebView once WebView is ready
  useEffect(() => {
    if (pdfBase64 && webViewReady && webViewRef.current) {
      console.log(
        '📄 PdfReader: Sending PDF to WebView, base64 length:',
        pdfBase64.length,
      );
      sendMessageToWebView({
        type: 'loadPdf',
        base64Data: pdfBase64,
        startPage: currentPage,
      });
    }
  }, [pdfBase64, webViewReady, currentPage, sendMessageToWebView]);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('📄 PdfReader: Message from WebView:', data.type, data);

      switch (data.type) {
        case 'ready':
          console.log('📄 PdfReader: WebView is ready');
          setWebViewReady(true);
          break;
        case 'pdfLoaded':
          console.log(
            '📄 PdfReader: PDF loaded, total pages:',
            data.totalPages,
          );
          setTotalPages(data.totalPages);
          break;
        case 'pageChanged':
          console.log('📄 PdfReader: Page changed to:', data.currentPage);
          setCurrentPage(data.currentPage);
          break;
        case 'error':
          console.error('📄 PdfReader: Error from WebView:', data.message);
          setError(data.message);
          break;
      }
    } catch (err) {
      console.error('📄 PdfReader: Error parsing WebView message:', err);
    }
  };

  const hideControls = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setControlsVisible(false));
  }, [fadeAnim]);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const addBookmark = useCallback(async () => {
    try {
      await BookService.addBookmark(book.id, '', `Page ${currentPage}`);
      setMenuVisible(false);
    } catch (err) {
      console.error('Error adding bookmark:', err);
    }
  }, [book.id, currentPage]);

  const openInBrowser = useCallback(async () => {
    await WebBrowser.openBrowserAsync(book.filePath);
    setMenuVisible(false);
  }, [book.filePath]);

  const goToPreviousPage = useCallback(() => {
    if (currentPage > 1) {
      sendMessageToWebView({ type: 'prevPage' });
    }
  }, [currentPage, sendMessageToWebView]);

  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      sendMessageToWebView({ type: 'nextPage' });
    }
  }, [currentPage, totalPages, sendMessageToWebView]);

  const currentTheme =
    readerSettings.theme === 'dark'
      ? { background: '#121212', text: '#FFFFFF' }
      : readerSettings.theme === 'sepia'
      ? { background: '#F4ECD8', text: '#5B4636' }
      : { background: '#FFFFFF', text: '#000000' };

  if (isLoading) {
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
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: currentTheme.background,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          },
        ]}
      >
        <Text
          style={{
            color: theme.colors.error,
            textAlign: 'center',
            marginBottom: 16,
          }}
        >
          Error loading PDF: {error}
        </Text>
        <Button mode="contained" onPress={() => setIsLoading(true)}>
          Retry
        </Button>
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
        onPress={() => {
          if (controlsVisible) {
            hideControls();
          } else {
            showControls();
          }
        }}
      >
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{
            html: PDF_VIEWER_HTML.replace(
              /__MARGIN_HORIZONTAL__/g,
              String(readerSettings.marginHorizontal || 20),
            ).replace(
              /__MARGIN_VERTICAL__/g,
              String(readerSettings.marginVertical || 20),
            ),
          }}
          style={{ backgroundColor: currentTheme.background, flex: 1 }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowFileAccess={true}
          allowUniversalAccessFromFileURLs={true}
          onMessage={handleMessage}
          onLoad={() => {
            console.log('📄 PdfReader: WebView onLoad triggered');
            // Fallback: if ready message not received, mark as ready after load
            if (!webViewReady) {
              setWebViewReady(true);
            }
          }}
          onError={syntheticEvent => {
            const { nativeEvent } = syntheticEvent;
            console.error('📄 PdfReader: WebView error:', nativeEvent);
            setError(nativeEvent.description || 'WebView error');
          }}
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
            <IconButton
              icon="chevron-left"
              onPress={goToPreviousPage}
              disabled={currentPage <= 1}
            />
            {readerSettings.showPageNumbers !== false && (
              <Text style={styles.pageInfo}>
                Page {currentPage} {totalPages > 0 && `of ${totalPages}`}
              </Text>
            )}
            <IconButton
              icon="chevron-right"
              onPress={goToNextPage}
              disabled={totalPages > 0 && currentPage >= totalPages}
            />
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
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 20,
    pointerEvents: 'auto',
  },
  pageInfo: {
    fontSize: 14,
    fontWeight: '500',
    marginHorizontal: 16,
  },
});

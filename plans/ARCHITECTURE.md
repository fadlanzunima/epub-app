# E-Reader App Architecture

## Project Overview
A cross-platform e-reader app built with React Native supporting EPUB, MOBI, and PDF formats.

## Technology Stack

### Core Framework
- **React Native 0.84+** with TypeScript
- **Expo SDK 55+** - Using Expo Go for rapid development and testing

### Navigation
- **React Navigation 6+** (Stack + Tab + Drawer navigators)

### State Management
- **Zustand** for global state (lightweight, TypeScript-friendly)
- **React Query (TanStack Query)** for server state (if using cloud sync)

### Database & Storage
- **Expo SQLite** for local book library (native SQLite via Expo SDK)
- **MMKV** for fast key-value storage (settings, reading progress)
- **Expo FileSystem** for file system operations
- **React Native AsyncStorage** for persistent app state

### UI Components
- **React Native Paper** (Material Design) or **NativeBase**
- **React Native Reanimated** for smooth animations

### File Format Support

#### EPUB
- **epub.js** (via WebView) - Most mature EPUB rendering
- Alternative: **react-native-epub-creator** + custom renderer

#### PDF
- **react-native-pdf** (based on Pdfium/iOS PDFKit)
- **react-native-pdf-lib** for manipulation

#### MOBI/AZW
- **mobi.js** or custom converter to EPUB
- Alternative: Convert server-side or use native libraries

### File Import
- **Expo Document Picker** - File selection via Expo SDK
- **Expo FileSystem** - File operations via Expo SDK
- **react-native-fs** - Additional file system operations
- **react-native-extract-archive** - Handle .epub (zip) files

### Additional Libraries
- **react-native-webview** - For EPUB rendering
- **react-native-gesture-handler** - Gestures
- **react-native-orientation-locker** - Screen rotation control

## Project Structure

```
src/
├── assets/                 # Images, fonts, default covers
├── components/             # Reusable UI components
│   ├── common/            # Buttons, inputs, etc.
│   ├── reader/            # Reader-specific components
│   └── library/           # Library view components
├── screens/               # Screen components
│   ├── LibraryScreen.tsx
│   ├── ReaderScreen.tsx
│   ├── CategoriesScreen.tsx
│   ├── SettingsScreen.tsx
│   └── StatsScreen.tsx
├── navigation/            # Navigation configuration
│   └── AppNavigator.tsx
├── hooks/                 # Custom React hooks
│   ├── useBooks.ts
│   ├── useReader.ts
│   └── useSettings.ts
├── services/              # Business logic
│   ├── BookService.ts     # Book CRUD operations
│   ├── ReaderService.ts   # Reading session management
│   ├── StorageService.ts  # File storage operations
│   └── SyncService.ts     # Cloud sync (optional)
├── database/              # Database models & config
│   ├── models/
│   │   ├── Book.ts
│   │   ├── Category.ts
│   │   ├── Bookmark.ts
│   │   ├── Annotation.ts
│   │   └── ReadingProgress.ts
│   └── schema.ts
├── utils/                 # Utility functions
│   ├── fileHelpers.ts
│   ├── epubParser.ts
│   └── pdfHelpers.ts
├── types/                 # TypeScript types
│   └── index.ts
├── constants/             # App constants
│   ├── colors.ts
│   ├── fonts.ts
│   └── settings.ts
└── context/               # React contexts (if needed)
    └── ThemeContext.tsx
```

## Database Schema

### Book
- id: string (primary key)
- title: string
- author: string
- description: string
- filePath: string
- fileType: 'epub' | 'pdf' | 'mobi'
- coverImage: string (path or base64)
- addedAt: Date
- lastReadAt: Date
- totalPages: number
- currentPage: number
- currentCfi: string (EPUB location)
- readingTime: number (minutes)
- isFavorite: boolean

### Category
- id: string
- name: string
- color: string
- sortOrder: number

### BookCategory (junction table)
- bookId: string
- categoryId: string

### Bookmark
- id: string
- bookId: string
- cfi: string (EPUB) / page: number (PDF)
- createdAt: Date
- note: string

### Annotation
- id: string
- bookId: string
- cfi: string
- text: string (highlighted text)
- note: string (user note)
- color: string
- createdAt: Date

### ReadingProgress
- id: string
- bookId: string
- date: Date
- pagesRead: number
- timeSpent: number

## Key Features Implementation

### 1. EPUB Reader
- Use WebView with epub.js for rendering
- Inject CSS for theming (day/night/sepia)
- JavaScript bridge for React Native <-> WebView communication
- Track reading position via CFI (Canonical Fragment Identifier)

### 2. PDF Reader
- Use react-native-pdf for rendering
- Horizontal/vertical scroll modes
- Text search using pdf-lib
- Page thumbnails for navigation

### 3. MOBI Support
- Convert MOBI to EPUB format on import
- Store converted file alongside original
- Render using EPUB reader

### 4. Library Management
- Grid/List view toggle
- Sort by: recent, title, author, added date
- Filter by: category, format, favorites
- Search by title/author

### 5. Cloud Sync (Phase 10)
- Firebase Auth for authentication
- Firestore for book metadata sync
- Firebase Storage for cover images
- Conflict resolution: server wins or manual merge

## Performance Considerations

1. **Lazy loading**: Load book list incrementally
2. **Image optimization**: Resize cover images to thumbnails
3. **Memory management**: Unload inactive books from memory
4. **Background tasks**: Import books in background
5. **Caching**: Cache parsed EPUB structures

## Security

1. Store sensitive data (cloud tokens) in Keychain/Keystore
2. Sanitize imported file paths
3. Validate file formats before processing
4. Handle corrupted files gracefully

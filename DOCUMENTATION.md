# EReader App - Complete Documentation

## 📚 Table of Contents

1. [Overview](#overview)
2. [Package Explanation](#package-explanation)
3. [Architecture Overview](#architecture-overview)
4. [Project Structure](#project-structure)
5. [Data Flow](#data-flow)
6. [How to Use](#how-to-use)
7. [Onboarding Flow](#onboarding-flow)
8. [Development Guide](#development-guide)

---

## Overview

This is a **cross-platform E-Book Reader application** built with React Native that supports reading **EPUB**, **PDF**, and **MOBI** formats. The app provides a complete digital reading experience with library management, reading progress tracking, bookmarks, annotations, and customizable reading settings.

### Key Features

| Feature | Description | Status |
|---------|-------------|--------|
| 📚 Library Management | Import, organize, and manage your e-book collection | ✅ Implemented |
| 📖 EPUB Reader | Full-featured EPUB rendering using WebView + epub.js | ✅ Implemented |
| 📄 PDF Reader | PDF rendering with PDF.js, page navigation, progress saving | ✅ Implemented |
| ⭐ Favorites | Mark books as favorites for quick access | ✅ Implemented |
| 📑 Bookmarks | Save and manage bookmarks within books | ✅ Implemented |
| ✏️ Annotations | Highlight text and add personal notes | ✅ Implemented |
| 📊 Statistics | Track reading progress and reading habits | ✅ Implemented |
| 🎨 Customization | Multiple themes, font sizes, and reading preferences | ✅ Implemented |
| 🚀 Onboarding | 8-slide tutorial for new users | ✅ Implemented |

### Recent Features (Latest Update)

#### Onboarding Flow (March 2026)

| Feature | Description | Status |
|---------|-------------|--------|
| 8-Slide Tutorial | Welcome, Library, Import, Reading, Bookmarks, Organization, Statistics, Get Started | ✅ Completed |
| Interactive Import | Users can import their first book during onboarding | ✅ Completed |
| Skip Option | Users can skip onboarding at any time | ✅ Completed |
| Persistence | Onboarding state saved in AsyncStorage | ✅ Completed |
| Settings Integration | "Show Tutorial Again" option in Settings | ✅ Completed |

### Recent Fixes (Latest Update)

#### UI/UX Improvements (March 2026)

| Fix | Description | Status |
|-----|-------------|--------|
| Statistics Icons | Fixed all stat card icons (Total Books, Completed, In Progress, Favorites) using MaterialCommunityIcons with hardcoded colors | ✅ Completed |
| BookDetail Header | Added bookmark icon to section header | ✅ Completed |
| BookDetail Debug | Removed debug text banner | ✅ Completed |
| Bookmark Display | Enhanced bookmark display with note/location and creation date/time | ✅ Completed |
| Bookmark Navigation | Made bookmark items clickable for navigation to bookmark location | ✅ Completed |
| EPUB Progress | Fixed EPUB progress calculation for location-based reading | ✅ Completed |
| Categories UI | Improved Categories section with icons and better chip styling | ✅ Completed |
| CategoryDetail Header | Fixed status bar overlap using SafeAreaView, added back button and category avatar | ✅ Completed |
| CategoryDetail Cards | Improved book cards with cover images/avatars and progress bars | ✅ Completed |
| FAB Icons | Fixed FAB icon color to white for better visibility | ✅ Completed |

#### Device Tracking System (March 2026)

| Feature | Description | Status |
|---------|-------------|--------|
| Device Info Collection | Created DeviceInfoService to collect device info (ID, brand, model, OS, app version) | ✅ Completed |
| Telegram Integration | Created TrackingService to send installation data to Telegram bot | ✅ Completed |
| Discord Integration | Support for sending data to Discord webhook (optional) | ✅ Completed |
| First Launch Only | AsyncStorage-based tracking to prevent duplicate notifications | ✅ Completed |
| Configuration | Added TrackingConfig in settings.ts with bot token and chat ID | ✅ Completed |

#### Previous Fixes

| Fix | Description |
|-----|-------------|
| EPUB Import | Fixed to use `BookService.importBook()` instead of `StorageService.importBook()` |
| Navigation | Auto-navigate to reader screen after successful import |
| Crypto Polyfill | Added `react-native-get-random-values` for UUID generation |
| File Loading | Changed from base64 data URL to `fetch()` API with ArrayBuffer fallback |
| WebView Debugging | Added comprehensive console logging and error handling |
| EPUB Rendering | Uses CDN-loaded epub.js with retry logic |
| **PDF Rendering** | **Replaced Google Docs viewer with PDF.js + base64 rendering (Expo-compatible)** |
| **PDF Progress Saving** | **Added auto-save reading progress every 2 seconds + on unmount** |
| **PDF Navigation** | **Added page navigation controls (prev/next buttons, page counter)** |
| **PDF Metadata** | **Implemented PDF metadata extraction (title, author, page count)** |

**Note:** EPUB reader uses `fetch()` to load files as ArrayBuffer, with fallback to direct file path. Both phone and laptop must be on same WiFi for Expo Go testing.

**PDF Reader Note:** Uses Mozilla's PDF.js library loaded from CDN. PDF files are read as base64 and rendered directly in WebView - fully compatible with Expo Go, no native modules required.

---

## Package Explanation

### Core Framework Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| [`react`](package.json:30) | 19.2.3 | Core React library for building UI components |
| [`react-native`](package.json:31) | 0.84.0 | Framework for building native mobile apps with React |
| [`expo`](package.json:25) | ~54.0.0 | Development platform for React Native with managed workflow |
| [`typescript`](package.json:66) | ^5.8.3 | Type-safe JavaScript with static typing |

**What is Expo?**
Expo is a framework and platform for universal React applications. It provides:
- Managed workflow (no need to touch native iOS/Android code)
- Pre-built native modules (camera, file system, SQLite, etc.)
- Over-the-air updates
- Easy building and deployment

### Navigation Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| [`@react-navigation/native`](package.json:19) | ^7.1.31 | Core navigation library |
| [`@react-navigation/native-stack`](package.json:20) | ^7.14.2 | Stack navigator for screen transitions |
| [`@react-navigation/bottom-tabs`](package.json:17) | ^7.15.2 | Bottom tab navigator for main navigation |
| [`@react-navigation/drawer`](package.json:18) | ^7.9.2 | Drawer navigator for side menu |
| [`react-native-screens`](package.json:40) | ^4.24.0 | Native screen optimization |
| [`react-native-safe-area-context`](package.json:39) | ^5.7.0 | Handle safe areas (notch, status bar) |

**Navigation Architecture:**
```
Root Stack Navigator
├── Main Tabs (Bottom Tab Navigator)
│   ├── Library Screen (Stack)
│   ├── Categories Screen
│   ├── Stats Screen
│   └── Settings Screen
├── EPUB Reader Screen
├── PDF Reader Screen
└── Book Detail Screen
```

### UI Component Libraries

| Package | Version | Purpose |
|---------|---------|---------|
| [`react-native-paper`](package.json:36) | ^5.15.0 | Material Design 3 components for React Native |
| [`react-native-vector-icons`](package.json:42) | ^10.3.0 | Icon library (Material Icons, FontAwesome, etc.) |
| [`react-native-reanimated`](package.json:38) | ^4.2.2 | Smooth animations and gestures |
| [`react-native-gesture-handler`](package.json:34) | ^2.30.0 | Native gesture handling |

**React Native Paper Components Used:**
- [`Searchbar`](src/screens/LibraryScreen.tsx:12) - For searching books
- [`IconButton`](src/screens/LibraryScreen.tsx:13) - Action buttons
- [`FAB`](src/screens/LibraryScreen.tsx:14) - Floating Action Button for importing
- [`Menu`](src/screens/LibraryScreen.tsx:15) - Dropdown menus
- [`Text`](src/screens/LibraryScreen.tsx:11) - Typography

### State Management

| Package | Version | Purpose |
|---------|---------|---------|
| [`zustand`](package.json:46) | ^5.0.11 | Lightweight state management library |

**Why Zustand?**
- Simple API (no providers needed)
- TypeScript-friendly
- Small bundle size
- No boilerplate code

**Store Structure:** [`useStore.ts`](src/hooks/useStore.ts:1)
```typescript
interface AppState {
  books: Book[];                    // All books in library
  categories: Category[];           // Book categories
  currentBook: Book | null;         // Currently selected book
  readerSettings: ReaderSettings;   // Font, theme, margins
  searchQuery: string;              // Current search text
  theme: ThemeType;                 // 'light' | 'dark' | 'sepia'
  // ... and actions to update state
}
```

### Database & Storage

| Package | Version | Purpose |
|---------|---------|---------|
| [`expo-sqlite`](package.json:28) | ~16.0.0 | SQLite database for local storage |
| [`react-native-mmkv`](package.json:35) | ^4.1.2 | Fast key-value storage (settings, cache) |
| [`@react-native-async-storage/async-storage`](package.json:15) | ^3.0.1 | Persistent storage for app settings |

**Storage Strategy:**

| Data Type | Storage | Reason |
|-----------|---------|--------|
| Books, Bookmarks, Annotations, Progress | **SQLite** | Structured data, complex queries |
| Settings (theme, fonts) | **AsyncStorage** | Simple key-value, persistent |
| Reading position cache | **MMKV** | Fast access, temporary data |
| Book files | **File System** | Large binary files |

### File Handling

| Package | Version | Purpose |
|---------|---------|---------|
| [`expo-document-picker`](package.json:26) | ~13.0.0 | File selection from device |
| [`expo-file-system`](package.json:27) | ~19.0.0 | Read/write files on device |
| [`react-native-fs`](package.json:33) | ^2.20.0 | Additional file system operations |
| [`react-native-document-picker`](package.json:32) | ^9.3.1 | Alternative document picker |

**File Import Flow:**
1. User taps import button → [`expo-document-picker`](src/screens/LibraryScreen.tsx:20) opens
2. User selects EPUB/PDF/MOBI file
3. File is copied to app's private storage: [`BOOKS_DIR`](src/services/BookService.ts:13)
4. Metadata is extracted from file
5. Book record is saved to SQLite database

### Reader-Specific Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| [`react-native-webview`](package.json:43) | ^13.16.0 | Render EPUB content using HTML/JS |
| [`react-native-pdf`](package.json:37) | ^7.0.3 | Native PDF rendering |
| [`react-native-worklets-core`](package.json:44) | ^1.5.0 | Background thread support |

**EPUB Rendering:**
- Uses [`WebView`](src/screens/EpubReaderScreen.tsx:9) component
- Loads [epub.js](https://github.com/futurepress/epub.js/) library (loaded from CDN)
- Renders EPUB content as HTML
- JavaScript bridge enables React Native ↔ WebView communication

**PDF Rendering:**
- Uses [`react-native-pdf`](src/screens/PdfReaderScreen.tsx) component
- Native rendering using iOS PDFKit / Android Pdfium
- Supports zoom, scroll, page navigation

### Utility Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| [`uuid`](package.json:45) | ^13.0.0 | Generate unique IDs for books, bookmarks |
| [`date-fns`](package.json:24) | ^4.1.0 | Date formatting and manipulation |

---

## Architecture Overview

### 3-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Screens    │  │  Components  │  │ Navigation   │      │
│  │  (UI/View)   │  │   (Reusable) │  │  (Routing)   │      │
│  └──────┬───────┘  └──────────────┘  └──────────────┘      │
└─────────┼────────────────────────────────────────────────────┘
          │ uses
┌─────────▼────────────────────────────────────────────────────┐
│                 BUSINESS LOGIC LAYER                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    Hooks     │  │   Services   │  │    Store     │      │
│  │ (State/Logic)│  │ (Operations) │  │  (Zustand)   │      │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘      │
└─────────┼─────────────────┼──────────────────────────────────┘
          │                 │
┌─────────▼─────────────────▼──────────────────────────────────┐
│                     DATA LAYER                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   SQLite     │  │ File System  │  │ AsyncStorage │      │
│  │  (Database)  │  │  (Book Files)│  │  (Settings)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Key Architectural Patterns

#### 1. **Custom Hooks Pattern** [`useBooks.ts`](src/hooks/useBooks.ts:1)

Encapsulates data fetching and business logic:

```typescript
// Instead of calling service directly in components:
const { books, importBook, deleteBook } = useBooks();
```

**Benefits:**
- Reusable logic across screens
- Separation of concerns
- Easier testing

#### 2. **Service Pattern** [`BookService.ts`](src/services/BookService.ts:16)

Encapsulates external operations (database, files, network):

```typescript
class BookService {
  async importBook(sourcePath: string, fileType: BookFormat): Promise<Book>
  async getAllBooks(): Promise<Book[]>
  async deleteBook(id: string): Promise<void>
}
```

**Benefits:**
- Single source of truth for operations
- Easy to mock for testing
- Can swap implementations

#### 3. **Repository Pattern** [`DatabaseService.ts`](src/services/DatabaseService.ts:12)

Abstracts database operations:

```typescript
class DatabaseService {
  async addBook(book: Book): Promise<void>
  async getBooks(): Promise<Book[]>
  // ...
}
```

---

## Project Structure

```
epub-app/
├── App.tsx                      # App entry point
├── index.js                     # Bundle entry
├── package.json                 # Dependencies
├── app.json                     # Expo configuration
│
├── src/
│   ├── components/              # Reusable UI components
│   │   ├── common/              # Buttons, inputs, modals
│   │   ├── library/             # Book cards, grids, lists
│   │   └── reader/              # Reader toolbar, TOC, etc.
│   │
│   ├── screens/                 # Full-screen components
│   │   ├── LibraryScreen.tsx    # Main library view
│   │   ├── CategoriesScreen.tsx # Category management
│   │   ├── StatsScreen.tsx      # Reading statistics
│   │   ├── SettingsScreen.tsx   # App settings
│   │   ├── BookDetailScreen.tsx # Book information
│   │   ├── EpubReaderScreen.tsx # EPUB reading
│   │   ├── PdfReaderScreen.tsx  # PDF reading
│   │   ├── ReaderScreen.tsx     # Generic reader wrapper
│   │   └── onboarding/          # Onboarding flow
│   │       ├── OnboardingScreen.tsx
│   │       └── slides/
│   │           ├── WelcomeSlide.tsx
│   │           ├── FeatureSlide.tsx
│   │           └── GetStartedSlide.tsx
│   │
│   ├── navigation/              # Navigation configuration
│   │   └── AppNavigator.tsx     # Stack & Tab navigators
│   │
│   ├── hooks/                   # Custom React hooks
│   │   ├── useBooks.ts          # Book operations hook
│   │   ├── useReader.ts         # Reader state hook
│   │   ├── useSettings.ts       # Settings hook
│   │   └── useStore.ts          # Zustand store hook
│   │
│   ├── services/                # Business logic services
│   │   ├── DatabaseService.ts   # SQLite operations
│   │   ├── BookService.ts       # Book CRUD operations
│   │   ├── ReaderService.ts     # Reading session management
│   │   ├── SettingsService.ts   # Settings persistence
│   │   ├── StorageService.ts    # File storage operations
│   │   ├── OnboardingService.ts # Onboarding state management
│   │   └── SyncService.ts       # Cloud sync (future)
│   │
│   ├── database/                # Database layer
│   │   ├── schema.ts            # SQL table definitions
│   │   └── models/              # Data models
│   │       ├── Book.ts
│   │       ├── Category.ts
│   │       ├── Bookmark.ts
│   │       ├── Annotation.ts
│   │       └── ReadingProgress.ts
│   │
│   ├── utils/                   # Utility functions
│   │   ├── epubParser.ts        # EPUB file parsing
│   │   ├── pdfHelpers.ts        # PDF utilities
│   │   └── fileHelpers.ts       # File operations helpers
│   │
│   ├── types/                   # TypeScript definitions
│   │   └── index.ts             # All type definitions
│   │
│   ├── constants/               # App constants
│   │   ├── colors.ts            # Theme colors
│   │   ├── fonts.ts             # Typography
│   │   ├── settings.ts          # Default settings
│   │   └── onboarding.ts        # Onboarding content
│   │
│   ├── context/                 # React contexts
│   │   └── ThemeContext.tsx     # Theme provider (if needed)
│   │
│   └── assets/                  # Static assets
│       ├── images/
│       ├── fonts/
│       └── covers/              # Default book covers
│
├── plans/                       # Documentation
│   ├── ARCHITECTURE.md          # Architecture decisions
│   ├── SYSTEM_DIAGRAM.md        # System diagrams
│   └── ONBOARDING_FLOW.md       # Onboarding flow design
│
└── .expo/                       # Expo generated files
```

---

## Data Flow

### Book Import Flow

```
User taps Import (FAB)
       │
       ▼
┌─────────────────┐
│ Document Picker │  ← expo-document-picker
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Copy to App    │  ← expo-file-system
│   Storage       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Extract Metadata│  ← epubParser.ts / pdfHelpers.ts
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Save to DB     │  ← DatabaseService.addBook()
│  (SQLite)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Update Store    │  ← Zustand store
└────────┬────────┘
         │
         ▼
    Library Screen Re-renders
```

### Reading Session Flow

```
User opens book
       │
       ▼
┌─────────────────┐
│ Load Reader     │  ← EpubReaderScreen / PdfReaderScreen
│ Screen          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Render Content  │  ← WebView (EPUB) or PDF Viewer
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Track Position  │  ← JavaScript bridge messages
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Save Progress   │  ← BookService.updateReadingProgress()
│ (Every 30s or   │
│  on change)     │
└─────────────────┘
```

---

## Onboarding Flow

The app features an 8-slide interactive onboarding tutorial for new users.

### Onboarding Screens

| Slide | Title | Description |
|-------|-------|-------------|
| 1 | Welcome | App introduction with feature highlights |
| 2 | Your Library | Digital bookshelf overview |
| 3 | Import Books | How to add books to your collection |
| 4 | Reading Experience | Customization options (themes, fonts) |
| 5 | Bookmarks & Annotations | Advanced reading features |
| 6 | Organization | Categories and favorites |
| 7 | Statistics | Reading progress tracking |
| 8 | Get Started | Final CTAs to import first book or explore |

### Implementation

- **Persistence**: Onboarding state stored in AsyncStorage
- **Navigation**: Conditional routing in AppNavigator - shows onboarding on first launch
- **Skip Option**: Users can skip at any time via top-right button
- **Reset**: "Show Tutorial Again" button available in Settings

### Files

```
src/
├── screens/onboarding/
│   ├── OnboardingScreen.tsx      # Main container with pager
│   └── slides/
│       ├── WelcomeSlide.tsx      # Animated intro
│       ├── FeatureSlide.tsx      # Reusable feature slides
│       └── GetStartedSlide.tsx   # Final slide with CTAs
├── services/OnboardingService.ts # State persistence
└── constants/onboarding.ts       # Slide content
```

---

## How to Use

### For End Users

#### 1. Adding Books to Your Library

1. Open the app - you'll see the **Library** tab (home icon)
2. Tap the **+** button (Floating Action Button) at the bottom right
3. Browse and select an EPUB, PDF, or MOBI file from your device
4. The book will appear in your library with extracted cover and metadata

#### 2. Reading a Book

1. Tap any book cover in the library
2. For **EPUB** books:
   - Tap center to show/hide controls
   - Swipe left/right to turn pages
   - Tap top-right menu for settings (font, theme, etc.)
   - Tap top-left to go back
3. For **PDF** books:
   - Use pinch gesture to zoom
   - Scroll vertically through pages

#### 3. Managing Your Library

| Action | How To |
|--------|--------|
| Search books | Use search bar at top |
| Sort books | Tap menu (⋮) and select sort option |
| Mark favorite | Tap heart icon on book card |
| Delete book | Long-press book → Delete |
| View details | Long-press book → Details |

#### 4. Reading Settings

Tap the **Settings** tab (gear icon) to customize:

| Setting | Options |
|---------|---------|
| Theme | Light, Dark, Sepia |
| Font Size | 12px - 32px |
| Line Height | 1.2 - 2.0 |
| Margins | Small, Medium, Large |

#### 5. Bookmarks & Annotations

While reading:
1. **Add Bookmark**: Tap bookmark icon in toolbar
2. **Add Highlight**: Select text → Highlight
3. **Add Note**: Select text → Add Note
4. **View all**: Open book details → Bookmarks/Annotations tab

---

### For Developers

#### Running the App Locally

**Prerequisites:**
- Node.js >= 22.11.0
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- Android Studio (for Android)
- Xcode (for iOS, macOS only)

**Installation:**

```bash
# 1. Clone the repository
git clone https://github.com/fadlanzunima/epub-app.git
cd epub-app

# 2. Install dependencies
npm install

# 3. Start the development server
npm start
# or
npx expo start
```

**Running on Android:**
```bash
# Start Android emulator first, then:
npm run android
# or press 'a' in the Expo terminal
```

**Running on iOS:**
```bash
# macOS only
npm run ios
# or press 'i' in the Expo terminal
```

**Running on Web:**
```bash
npm run web
# or press 'w' in the Expo terminal
```

#### Development Workflow

**1. Making Changes:**
- Edit files in `src/` directory
- The app will hot-reload automatically

**2. Adding a New Screen:**
```typescript
// 1. Create screen component
// src/screens/NewScreen.tsx

// 2. Add to navigation
// src/navigation/AppNavigator.tsx
<Stack.Screen name="NewScreen" component={NewScreen} />

// 3. Navigate to it
navigation.navigate('NewScreen');
```

**3. Adding a Database Table:**
```typescript
// 1. Define schema in src/database/schema.ts
export const NewTableSchema = `
  CREATE TABLE IF NOT EXISTS new_table (
    id TEXT PRIMARY KEY,
    name TEXT
  );
`;

// 2. Add methods to DatabaseService.ts
async addNewItem(item: NewItem): Promise<void>

// 3. Create model in src/database/models/NewModel.ts
```

#### Key Commands

| Command | Purpose |
|---------|---------|
| `npm start` | Start Expo development server |
| `npm run android` | Run on Android |
| `npm run ios` | Run on iOS |
| `npm run lint` | Run ESLint |
| `npm test` | Run Jest tests |

#### Debugging

**Enable Debug Mode:**
1. Shake device or press `Ctrl + M` (Android) / `Cmd + D` (iOS)
2. Select "Debug" or "Open Debugger"

**Useful Tools:**
- **React Native Debugger**: Standalone app with Redux DevTools
- **Flipper**: Facebook's mobile app debugger
- **Chrome DevTools**: Press `Ctrl + Shift + J` in debug mode

---

## Database Schema

### Entity Relationship Diagram

```
┌───────────────┐       ┌─────────────────┐
│     BOOK      │       │    CATEGORY     │
├───────────────┤       ├─────────────────┤
│ id (PK)       │       │ id (PK)         │
│ title         │       │ name            │
│ author        │       │ color           │
│ description   │       │ sortOrder       │
│ filePath      │       └────────┬────────┘
│ fileType      │                │
│ coverImage    │       ┌────────▼────────┐
│ addedAt       │       │  BOOK_CATEGORY  │
│ lastReadAt    │       │  (junction)     │
│ totalPages    │       ├─────────────────┤
│ currentPage   │◄──────┤ bookId (FK)     │
│ currentCfi    │       │ categoryId (FK) │
│ readingTime   │       └─────────────────┘
│ isFavorite    │
└───────┬───────┘
        │
        │ 1:N
        │
   ┌────┴────┬────────────┐
   ▼         ▼            ▼
┌────────┐ ┌──────────┐ ┌────────────────┐
│BOOKMARK│ │ANNOTATION│ │ READING_PROGRESS│
├────────┤ ├──────────┤ ├────────────────┤
│id (PK) │ │id (PK)   │ │ id (PK)        │
│bookId  │ │bookId    │ │ bookId         │
│cfi     │ │cfi       │ │ date           │
│page    │ │text      │ │ pagesRead      │
│note    │ │note      │ │ timeSpent      │
│createdAt│ │color     │ └────────────────┘
└────────┘ │createdAt │
           └──────────┘
```

### Table Definitions

See [`src/database/schema.ts`](src/database/schema.ts:1) for full SQL definitions.

---

## TypeScript Type Definitions

### Core Types [`src/types/index.ts`](src/types/index.ts:1)

```typescript
// Book format support
export type BookFormat = 'epub' | 'pdf' | 'mobi' | 'azw' | 'azw3';

// Main book interface
export interface Book {
  id: string;
  title: string;
  author: string;
  description?: string;
  filePath: string;
  fileType: BookFormat;
  coverImage?: string;
  addedAt: Date;
  lastReadAt?: Date;
  totalPages: number;
  currentPage: number;
  currentCfi?: string;  // EPUB location
  readingTime: number;
  isFavorite: boolean;
}

// Reader customization
export interface ReaderSettings {
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  marginHorizontal: number;
  marginVertical: number;
  theme: 'light' | 'dark' | 'sepia';
  brightness: number;
}
```

---

## Contributing

### Code Style

- **ESLint**: Configuration in [`.eslintrc.js`](.eslintrc.js)
- **Prettier**: Configuration in [`.prettierrc.js`](.prettierrc.js)

### Commit Message Format

```
feat: add new feature
fix: fix a bug
docs: update documentation
style: formatting changes
refactor: code restructuring
test: add tests
chore: maintenance tasks
```

---

## License

This project is licensed under the MIT License.

---

## Support

For issues and feature requests, please use the GitHub issue tracker.

---

*Generated documentation for the EReader App - A React Native e-book reader application.*

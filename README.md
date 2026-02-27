# EReader App

A cross-platform e-reader application built with React Native that supports EPUB, PDF, and MOBI formats.

## Features

### Core Features
- 📚 **Library Management**: Import and organize your e-books
- 📖 **EPUB Reader**: Full-featured EPUB reading with WebView and epub.js
- 📄 **PDF Reader**: Native PDF rendering with zoom and navigation
- 📘 **MOBI Support**: MOBI format support (converted to EPUB)
- 🔍 **Search**: Search books by title or author
- ⭐ **Favorites**: Mark books as favorites
- 📑 **Bookmarks**: Save and manage bookmarks
- ✏️ **Annotations**: Highlight text and add notes
- 📊 **Statistics**: Track reading progress and statistics

### Reader Features
- 🎨 **Multiple Themes**: Light, Dark, and Sepia themes
- 🔤 **Text Customization**: Adjustable font size and line height
- 📐 **Margins**: Customizable page margins
- 🌓 **Brightness Control**: Screen brightness adjustment
- 📍 **Progress Tracking**: Automatic reading progress saving
- 📋 **Table of Contents**: Navigate chapters easily

## Tech Stack

- **Framework**: React Native 0.74+ with TypeScript
- **Navigation**: React Navigation v6
- **UI Components**: React Native Paper (Material Design 3)
- **State Management**: Zustand
- **Database**: SQLite (react-native-sqlite-storage)
- **Storage**: AsyncStorage for settings
- **EPUB Rendering**: WebView with epub.js
- **PDF Rendering**: react-native-pdf

## Project Structure

```
src/
├── components/        # Reusable UI components
├── screens/          # Screen components
│   ├── LibraryScreen.tsx
│   ├── CategoriesScreen.tsx
│   ├── SettingsScreen.tsx
│   ├── StatsScreen.tsx
│   ├── BookDetailScreen.tsx
│   ├── EpubReaderScreen.tsx
│   └── PdfReaderScreen.tsx
├── navigation/       # Navigation configuration
├── hooks/           # Custom React hooks
├── services/        # Business logic
│   ├── DatabaseService.ts
│   ├── BookService.ts
│   └── SettingsService.ts
├── types/           # TypeScript type definitions
└── constants/       # App constants
```

## Getting Started

### Prerequisites
- Node.js 18+
- React Native development environment
- Android Studio (for Android)
- Xcode (for iOS, macOS only)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/fadlanzunima/epub-app.git
cd epub-app
```

2. Install dependencies:
```bash
npm install
```

3. For iOS, install pods:
```bash
cd ios && pod install && cd ..
```

### Running the App

#### Android
```bash
npx react-native run-android
```

#### iOS
```bash
npx react-native run-ios
```

## Building for Production

### Android
```bash
cd android
./gradlew assembleRelease
```

The APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

### iOS
Use Xcode to archive and distribute the app.

## Supported Formats

| Format | Support Level | Notes |
|--------|---------------|-------|
| EPUB | ✅ Full | Best reading experience |
| PDF | ✅ Full | Native rendering |
| MOBI | ⚠️ Partial | Converted to EPUB |

## Roadmap

- [ ] Cloud sync with Firebase
- [ ] Full-text search within books
- [ ] Text-to-speech
- [ ] Reading goals
- [ ] Social features (sharing quotes)
- [ ] More format support (CBZ, CBR)
- [ ] Custom fonts support
- [ ] Advanced annotation features

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

## Acknowledgments

- [epub.js](https://github.com/futurepress/epub.js/) for EPUB rendering
- [React Native Paper](https://reactnativepaper.com/) for UI components
- [React Navigation](https://reactnavigation.org/) for navigation

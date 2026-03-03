/**
 * Configuration for default books
 *
 * This file controls whether default books are bundled with the app
 * or downloaded from a server.
 *
 * For development: Set BUNDLE_DEFAULT_BOOKS = false for fast bundling
 * For production: Set BUNDLE_DEFAULT_BOOKS = true to include EPUBs in the app
 */

// Set this to true for production builds with bundled EPUBs
// Set to false for development to skip bundling EPUBs (faster builds)
//
// Current setting: Using GitHub URLs (download mode)
// Change to 'true' if you want to bundle EPUBs with the app instead
export const BUNDLE_DEFAULT_BOOKS = false;

// Server URLs for downloading default books (used when BUNDLE_DEFAULT_BOOKS = false)
//
// Your GitHub Repo: https://github.com/fadlanzunima/EPUB-File
// NOTE: Repository must be PUBLIC for these URLs to work
//
// Raw GitHub URLs format:
// https://raw.githubusercontent.com/username/repo/branch/filename
export const DEFAULT_BOOKS_URLS = {
  'default-1':
    'https://raw.githubusercontent.com/fadlanzunima/EPUB-File/master/Al-Quran-Arabic-Only-Kindle.epub',
  'default-2':
    'https://raw.githubusercontent.com/fadlanzunima/EPUB-File/master/Al-Quran-Terjemahan-Indonesia.epub',
  'default-3':
    'https://raw.githubusercontent.com/fadlanzunima/EPUB-File/master/Al-Quran-Terjemahan-Perkata-Indonesia.epub',
} as const;

// Bundled asset modules (used when BUNDLE_DEFAULT_BOOKS = true)
// NOTE: Currently using GitHub URLs only (DEFAULT_BOOKS_URLS below)
// Set BUNDLE_DEFAULT_BOOKS = true and add require() statements here to use local EPUB files
export const DEFAULT_BOOKS_ASSETS = {} as const;

// Cover images for default books
export const DEFAULT_BOOKS_COVERS = {
  'default-1': require('../../assets/books/covers/default-1-cover.png'),
  'default-2': require('../../assets/books/covers/default-2-cover.png'),
  'default-3': require('../../assets/books/covers/default-3-cover.png'),
} as const;

// Book metadata
export const DEFAULT_BOOKS_METADATA = [
  {
    id: 'default-1',
    fileName: 'Al-Quran-Arabic-Only-Kindle.epub',
    title: 'Al-Quran (Arabic Only)',
    author: 'Mushaf Al-Quran',
    description: 'The Holy Quran in Arabic text only edition',
    fileSize: 421826,
    coverAsset: DEFAULT_BOOKS_COVERS['default-1'],
  },
  {
    id: 'default-2',
    fileName: 'Al-Quran-Terjemahan-Indonesia.epub',
    title: 'Al-Quran (Terjemahan Indonesia)',
    author: 'Mushaf Al-Quran',
    description: 'The Holy Quran with Indonesian translation',
    fileSize: 1474696,
    coverAsset: DEFAULT_BOOKS_COVERS['default-2'],
  },
  {
    id: 'default-3',
    fileName: 'Al-Quran-Terjemahan-Perkata-Indonesia.epub',
    title: 'Al-Quran (Terjemahan Perkata)',
    author: 'Mushaf Al-Quran',
    description: 'The Holy Quran with word-by-word Indonesian translation',
    fileSize: 1440405,
    coverAsset: DEFAULT_BOOKS_COVERS['default-3'],
  },
];

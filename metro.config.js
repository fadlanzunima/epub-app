const { getDefaultConfig } = require('expo/metro-config');

/**
 * Metro configuration
 * https://docs.expo.dev/guides/customizing-metro/
 *
 * @type {import('expo/metro-config').MetroConfig}
 */
const config = getDefaultConfig(__dirname);

// Add WASM file support for expo-sqlite
config.resolver.assetExts.push('wasm');
config.resolver.assetExts.push('txt');

// EPUB asset support (for local EPUB files)
// Currently using GitHub URLs for default books (BUNDLE_DEFAULT_BOOKS = false)
// Uncomment below to enable EPUB bundling when switching to local assets:
// config.resolver.assetExts.push('epub');

console.log(
  'Metro: Using GitHub URLs for default books (EPUB bundling disabled)',
);

module.exports = config;

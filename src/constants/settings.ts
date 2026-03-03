import { ThemeType } from './colors';
import { ReaderFontSize } from './fonts';

// Default app settings
export const DefaultSettings = {
  // Reader settings
  reader: {
    theme: 'day' as ThemeType,
    fontSize: 'md' as ReaderFontSize,
    fontFamily: 'System',
    lineHeight: 1.5,
    margins: 20,
    textAlign: 'justify' as 'left' | 'right' | 'center' | 'justify',
    brightness: 100,
    keepScreenOn: true,
    showPageNumbers: true,
    showProgress: true,
  },

  // Library settings
  library: {
    viewMode: 'grid' as 'grid' | 'list',
    sortBy: 'recent' as 'recent' | 'title' | 'author' | 'added',
    sortOrder: 'desc' as 'asc' | 'desc',
    showCovers: true,
  },

  // App settings
  app: {
    language: 'en',
    enableSync: false,
    autoImport: false,
    backupEnabled: true,
    backupInterval: 7, // days
  },

  // Notification settings
  notifications: {
    readingReminders: false,
    reminderTime: '20:00',
    goalAlerts: true,
  },
} as const;

// Storage keys
export const StorageKeys = {
  SETTINGS: '@app_settings',
  READING_PROGRESS: '@reading_progress',
  BOOKMARKS: '@bookmarks',
  ANNOTATIONS: '@annotations',
  READING_STATS: '@reading_stats',
  LAST_SYNC: '@last_sync',
  TRACKING_SENT: '@tracking_sent',
  DEVICE_ID: '@device_id',
} as const;

// Tracking configuration
// Replace these values with your actual Telegram bot token, chat ID, and Discord webhook URL
export const TrackingConfig = {
  TELEGRAM_BOT_TOKEN: '8428988458:AAHWl9wEfZ1ikwJT9Hw0z5iHUPUGS6FzfNE', // Your Telegram bot token from @BotFather
  TELEGRAM_CHAT_ID: '652113159', // Your Telegram chat ID (@fdlnzunima)
  DISCORD_WEBHOOK_URL: '', // Your Discord webhook URL
  ENABLE_TELEGRAM: true, // Telegram tracking enabled
  ENABLE_DISCORD: false, // Set to true to enable Discord notifications
} as const;

// File type mappings
export const FileTypes = {
  EPUB: 'epub',
  PDF: 'pdf',
  MOBI: 'mobi',
  AZW: 'azw',
  AZW3: 'azw3',
} as const;

export const SupportedFormats = [
  '.epub',
  '.pdf',
  '.mobi',
  '.azw',
  '.azw3',
] as const;

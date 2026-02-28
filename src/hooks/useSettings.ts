import { useState, useEffect, useCallback } from 'react';
import SettingsService from '../services/SettingsService';
import { DefaultSettings } from '../constants/settings';
import type { ThemeType } from '../constants/colors';
import type { ReaderFontSize } from '../constants/fonts';

export interface ReaderSettings {
  theme: ThemeType;
  fontSize: ReaderFontSize;
  fontFamily: string;
  lineHeight: number;
  margins: number;
  textAlign: 'left' | 'right' | 'center' | 'justify';
  brightness: number;
  keepScreenOn: boolean;
  showPageNumbers: boolean;
  showProgress: boolean;
}

export interface LibrarySettings {
  viewMode: 'grid' | 'list';
  sortBy: 'recent' | 'title' | 'author' | 'added';
  sortOrder: 'asc' | 'desc';
  showCovers: boolean;
}

export interface AppSettings {
  language: string;
  enableSync: boolean;
  autoImport: boolean;
  backupEnabled: boolean;
  backupInterval: number;
}

export interface NotificationSettings {
  readingReminders: boolean;
  reminderTime: string;
  goalAlerts: boolean;
}

export interface UseSettingsReturn {
  reader: ReaderSettings;
  library: LibrarySettings;
  app: AppSettings;
  notifications: NotificationSettings;
  loading: boolean;
  updateReaderSettings: (settings: Partial<ReaderSettings>) => Promise<void>;
  updateLibrarySettings: (settings: Partial<LibrarySettings>) => Promise<void>;
  updateAppSettings: (settings: Partial<AppSettings>) => Promise<void>;
  updateNotificationSettings: (
    settings: Partial<NotificationSettings>,
  ) => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

/**
 * Hook for managing app settings
 */
export const useSettings = (): UseSettingsReturn => {
  const [reader, setReader] = useState<ReaderSettings>(DefaultSettings.reader);
  const [library, setLibrary] = useState<LibrarySettings>(
    DefaultSettings.library,
  );
  const [app, setApp] = useState<AppSettings>(DefaultSettings.app);
  const [notifications, setNotifications] = useState<NotificationSettings>(
    DefaultSettings.notifications,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const settings = await SettingsService.getAllSettings();

      setReader(settings.reader || DefaultSettings.reader);
      setLibrary(settings.library || DefaultSettings.library);
      setApp(settings.app || DefaultSettings.app);
      setNotifications(settings.notifications || DefaultSettings.notifications);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateReaderSettings = useCallback(
    async (settings: Partial<ReaderSettings>): Promise<void> => {
      const updated = { ...reader, ...settings };
      setReader(updated);
      await SettingsService.saveReaderSettings(updated);
    },
    [reader],
  );

  const updateLibrarySettings = useCallback(
    async (settings: Partial<LibrarySettings>): Promise<void> => {
      const updated = { ...library, ...settings };
      setLibrary(updated);
      await SettingsService.saveLibrarySettings(updated);
    },
    [library],
  );

  const updateAppSettings = useCallback(
    async (settings: Partial<AppSettings>): Promise<void> => {
      const updated = { ...app, ...settings };
      setApp(updated);
      await SettingsService.saveAppSettings(updated);
    },
    [app],
  );

  const updateNotificationSettings = useCallback(
    async (settings: Partial<NotificationSettings>): Promise<void> => {
      const updated = { ...notifications, ...settings };
      setNotifications(updated);
      await SettingsService.saveNotificationSettings(updated);
    },
    [notifications],
  );

  const resetToDefaults = useCallback(async (): Promise<void> => {
    setReader(DefaultSettings.reader);
    setLibrary(DefaultSettings.library);
    setApp(DefaultSettings.app);
    setNotifications(DefaultSettings.notifications);
    await SettingsService.resetToDefaults();
  }, []);

  return {
    reader,
    library,
    app,
    notifications,
    loading,
    updateReaderSettings,
    updateLibrarySettings,
    updateAppSettings,
    updateNotificationSettings,
    resetToDefaults,
  };
};

export default useSettings;

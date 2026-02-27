import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings, ReaderSettings, ThemeType } from '../types';

const SETTINGS_KEY = 'app_settings';

const DEFAULT_READER_SETTINGS: ReaderSettings = {
  fontSize: 16,
  fontFamily: 'system',
  lineHeight: 1.5,
  marginHorizontal: 20,
  marginVertical: 20,
  theme: 'light',
  brightness: 1,
};

const DEFAULT_APP_SETTINGS: AppSettings = {
  reader: DEFAULT_READER_SETTINGS,
  keepScreenOn: true,
  showPageNumbers: true,
  syncEnabled: false,
  backupEnabled: false,
};

class SettingsService {
  async getSettings(): Promise<AppSettings> {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_APP_SETTINGS, ...parsed };
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
    return DEFAULT_APP_SETTINGS;
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  async getReaderSettings(): Promise<ReaderSettings> {
    const settings = await this.getSettings();
    return settings.reader;
  }

  async updateReaderSettings(
    readerSettings: Partial<ReaderSettings>,
  ): Promise<void> {
    const current = await this.getSettings();
    current.reader = { ...current.reader, ...readerSettings };
    await this.saveSettings(current);
  }

  async setTheme(theme: ThemeType): Promise<void> {
    await this.updateReaderSettings({ theme });
  }

  async setFontSize(size: number): Promise<void> {
    await this.updateReaderSettings({ fontSize: size });
  }

  async setFontFamily(family: string): Promise<void> {
    await this.updateReaderSettings({ fontFamily: family });
  }

  async setLineHeight(height: number): Promise<void> {
    await this.updateReaderSettings({ lineHeight: height });
  }

  async setMargins(horizontal: number, vertical: number): Promise<void> {
    await this.updateReaderSettings({
      marginHorizontal: horizontal,
      marginVertical: vertical,
    });
  }

  async setBrightness(brightness: number): Promise<void> {
    await this.updateReaderSettings({ brightness });
  }

  async setKeepScreenOn(enabled: boolean): Promise<void> {
    const current = await this.getSettings();
    current.keepScreenOn = enabled;
    await this.saveSettings(current);
  }

  async setSyncEnabled(enabled: boolean): Promise<void> {
    const current = await this.getSettings();
    current.syncEnabled = enabled;
    await this.saveSettings(current);
  }

  async resetToDefaults(): Promise<void> {
    await this.saveSettings(DEFAULT_APP_SETTINGS);
  }
}

export default new SettingsService();

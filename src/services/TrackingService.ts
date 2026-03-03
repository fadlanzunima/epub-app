import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfoService from './DeviceInfoService';
import { StorageKeys, TrackingConfig as Config } from '../constants/settings';
import { DeviceInfo, TrackingConfig } from '../types';

class TrackingService {
  private config: TrackingConfig;

  constructor(config: Partial<TrackingConfig> = {}) {
    this.config = {
      telegramBotToken: config.telegramBotToken || Config.TELEGRAM_BOT_TOKEN,
      telegramChatId: config.telegramChatId || Config.TELEGRAM_CHAT_ID,
      discordWebhookUrl: config.discordWebhookUrl || Config.DISCORD_WEBHOOK_URL,
      enableTelegram: config.enableTelegram ?? Config.ENABLE_TELEGRAM,
      enableDiscord: config.enableDiscord ?? Config.ENABLE_DISCORD,
    };
  }

  /**
   * Update tracking configuration
   */
  setConfig(config: Partial<TrackingConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }

  /**
   * Check if device info has already been sent
   */
  async hasBeenSent(): Promise<boolean> {
    try {
      const sent = await AsyncStorage.getItem(StorageKeys.TRACKING_SENT);
      return sent === 'true';
    } catch (error) {
      console.error('Error checking tracking status:', error);
      return false;
    }
  }

  /**
   * Mark device info as sent
   */
  async markAsSent(): Promise<void> {
    try {
      await AsyncStorage.setItem(StorageKeys.TRACKING_SENT, 'true');
    } catch (error) {
      console.error('Error marking tracking as sent:', error);
    }
  }

  /**
   * Reset tracking status (for testing purposes)
   */
  async resetTrackingStatus(): Promise<void> {
    try {
      await AsyncStorage.removeItem(StorageKeys.TRACKING_SENT);
    } catch (error) {
      console.error('Error resetting tracking status:', error);
    }
  }

  /**
   * Send device info to Telegram
   */
  async sendToTelegram(deviceInfo: DeviceInfo): Promise<boolean> {
    if (
      !this.config.enableTelegram ||
      !this.config.telegramBotToken ||
      !this.config.telegramChatId
    ) {
      console.log('Telegram tracking disabled or not configured');
      return false;
    }

    try {
      const message = DeviceInfoService.formatDeviceInfoForMessage(deviceInfo);
      const url = `https://api.telegram.org/bot${this.config.telegramBotToken}/sendMessage`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: this.config.telegramChatId,
          text: message,
          parse_mode: 'Markdown',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Telegram API error:', errorData);
        return false;
      }

      console.log('Device info sent to Telegram successfully');
      return true;
    } catch (error) {
      console.error('Error sending to Telegram:', error);
      return false;
    }
  }

  /**
   * Send device info to Discord
   */
  async sendToDiscord(deviceInfo: DeviceInfo): Promise<boolean> {
    if (!this.config.enableDiscord || !this.config.discordWebhookUrl) {
      console.log('Discord tracking disabled or not configured');
      return false;
    }

    try {
      const embed = {
        title: '📱 New App Installation',
        color: 0x00ff00, // Green color
        fields: [
          {
            name: 'App',
            value: deviceInfo.appName,
            inline: true,
          },
          {
            name: 'Version',
            value: `${deviceInfo.appVersion} (${deviceInfo.appBuildNumber})`,
            inline: true,
          },
          {
            name: 'Package',
            value: deviceInfo.packageName,
            inline: false,
          },
          {
            name: 'Device',
            value: `${deviceInfo.brand} ${deviceInfo.model}`,
            inline: true,
          },
          {
            name: 'OS',
            value: `${deviceInfo.osName} ${deviceInfo.osVersion}`,
            inline: true,
          },
          {
            name: 'Platform',
            value: deviceInfo.platform,
            inline: true,
          },
          {
            name: 'Device ID',
            value: deviceInfo.deviceId,
            inline: false,
          },
        ],
        timestamp: deviceInfo.timestamp,
        footer: {
          text: 'EReaderApp Installation Tracker',
        },
      };

      const response = await fetch(this.config.discordWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          embeds: [embed],
        }),
      });

      if (!response.ok) {
        console.error(
          'Discord webhook error:',
          response.status,
          await response.text(),
        );
        return false;
      }

      console.log('Device info sent to Discord successfully');
      return true;
    } catch (error) {
      console.error('Error sending to Discord:', error);
      return false;
    }
  }

  /**
   * Track device installation - sends info to configured services
   * Only sends on first launch
   */
  async trackInstallation(): Promise<boolean> {
    try {
      // Check if already sent
      const alreadySent = await this.hasBeenSent();
      if (alreadySent) {
        console.log('Device info already sent, skipping...');
        return true;
      }

      // Get device info
      const deviceInfo = await DeviceInfoService.getDeviceInfo();

      // Send to enabled services
      const results = await Promise.all([
        this.sendToTelegram(deviceInfo),
        this.sendToDiscord(deviceInfo),
      ]);

      // If at least one service succeeded, mark as sent
      if (results.some(result => result)) {
        await this.markAsSent();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error tracking installation:', error);
      return false;
    }
  }

  /**
   * Force track installation (bypass first-launch check)
   * Useful for testing
   */
  async forceTrackInstallation(): Promise<boolean> {
    try {
      const deviceInfo = await DeviceInfoService.getDeviceInfo();

      const results = await Promise.all([
        this.sendToTelegram(deviceInfo),
        this.sendToDiscord(deviceInfo),
      ]);

      return results.some(result => result);
    } catch (error) {
      console.error('Error force tracking installation:', error);
      return false;
    }
  }
}

// Export singleton instance with default config
export default new TrackingService();

// Also export the class for custom configuration
export { TrackingService };

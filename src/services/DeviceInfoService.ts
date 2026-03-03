import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { v4 as uuidv4 } from 'uuid';
import { StorageKeys } from '../constants/settings';
import { DeviceInfo } from '../types';

class DeviceInfoService {
  /**
   * Get or create a unique device ID
   */
  async getDeviceId(): Promise<string> {
    try {
      let deviceId = await AsyncStorage.getItem(StorageKeys.DEVICE_ID);

      if (!deviceId) {
        deviceId = uuidv4();
        await AsyncStorage.setItem(StorageKeys.DEVICE_ID, deviceId);
      }

      return deviceId;
    } catch (error) {
      console.error('Error getting device ID:', error);
      return 'unknown';
    }
  }

  /**
   * Get brand (manufacturer) of the device
   */
  getBrand(): string {
    return Platform.select({
      ios: 'Apple',
      android: 'Android',
      default: 'Unknown',
    });
  }

  /**
   * Get device model
   */
  getModel(): string {
    return Platform.select({
      ios: Constants.platform?.ios?.model || 'iOS Device',
      android: 'Android Device',
      default: 'Unknown Device',
    });
  }

  /**
   * Get OS version
   */
  getOsVersion(): string {
    return Platform.Version?.toString() || 'Unknown';
  }

  /**
   * Get OS name
   */
  getOsName(): string {
    return Platform.OS === 'ios' ? 'iOS' : 'Android';
  }

  /**
   * Get app version
   */
  getAppVersion(): string {
    return Constants.expoConfig?.version || '1.0.0';
  }

  /**
   * Get app build number
   */
  getBuildNumber(): string {
    return Platform.select({
      ios: Constants.expoConfig?.ios?.buildNumber || '1',
      android: Constants.expoConfig?.android?.versionCode?.toString() || '1',
      default: '1',
    });
  }

  /**
   * Get app name
   */
  getAppName(): string {
    return Constants.expoConfig?.name || 'EReaderApp';
  }

  /**
   * Get package/bundle identifier
   */
  getPackageName(): string {
    return (
      Constants.expoConfig?.android?.package ||
      Constants.expoConfig?.ios?.bundleIdentifier ||
      'com.ereader.app'
    );
  }

  /**
   * Get all device information
   */
  async getDeviceInfo(): Promise<DeviceInfo> {
    const deviceId = await this.getDeviceId();

    return {
      deviceId,
      brand: this.getBrand(),
      model: this.getModel(),
      osVersion: this.getOsVersion(),
      osName: this.getOsName(),
      appVersion: this.getAppVersion(),
      appBuildNumber: this.getBuildNumber(),
      appName: this.getAppName(),
      packageName: this.getPackageName(),
      platform: Platform.OS,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Format device info for sending to messaging services
   */
  formatDeviceInfoForMessage(deviceInfo: DeviceInfo): string {
    const lines = [
      `📱 *Device Information*`,
      ``,
      `*App:* ${deviceInfo.appName}`,
      `*Version:* ${deviceInfo.appVersion} (${deviceInfo.appBuildNumber})`,
      `*Package:* ${deviceInfo.packageName}`,
      ``,
      `*Device:* ${deviceInfo.brand} ${deviceInfo.model}`,
      `*OS:* ${deviceInfo.osName} ${deviceInfo.osVersion}`,
      `*Platform:* ${deviceInfo.platform}`,
      `*Device ID:* ${deviceInfo.deviceId}`,
      ``,
      `*Timestamp:* ${deviceInfo.timestamp}`,
    ];

    return lines.join('\n');
  }
}

export default new DeviceInfoService();

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Location from 'expo-location';
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
    // Use expo-device for accurate manufacturer info
    if (Device.manufacturer) {
      return Device.manufacturer;
    }
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
    // Use expo-device for accurate model info
    if (Device.modelName) {
      return Device.modelName;
    }
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
   * Get device location (requires permission)
   */
  async getLocation(): Promise<Location.LocationObject | null> {
    try {
      // Check if location services are enabled
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        return null;
      }

      // Get last known position (fast, no permission needed for cached)
      const lastPosition = await Location.getLastKnownPositionAsync();
      if (lastPosition) {
        return lastPosition;
      }

      // Request permission and get current position
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission not granted');
        return null;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });
      return position;
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
  }

  /**
   * Get all device information
   */
  async getDeviceInfo(): Promise<DeviceInfo> {
    const deviceId = await this.getDeviceId();
    const location = await this.getLocation();

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
      location: location
        ? {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
          }
        : undefined,
    };
  }

  /**
   * Format device info for sending to messaging services
   */
  formatDeviceInfoForMessage(deviceInfo: DeviceInfo): string {
    // Get additional device info from expo-device
    const deviceType = Device.deviceType
      ? Device.DeviceType[Device.deviceType]
      : 'Unknown';
    const osBuildId = Device.osBuildId || 'Unknown';
    const totalMemory = Device.totalMemory
      ? `${
          Math.round((Device.totalMemory / (1024 * 1024 * 1024)) * 100) / 100
        } GB`
      : 'Unknown';
    const supportedCpuArch =
      Device.supportedCpuArchitectures?.join(', ') || 'Unknown';

    const lines = [
      `📱 *Device Information*`,
      ``,
      `*App:* ${deviceInfo.appName}`,
      `*Version:* ${deviceInfo.appVersion} (${deviceInfo.appBuildNumber})`,
      `*Package:* ${deviceInfo.packageName}`,
      ``,
      `*Device:* ${deviceInfo.brand} ${deviceInfo.model}`,
      `*Type:* ${deviceType}`,
      `*OS:* ${deviceInfo.osName} ${deviceInfo.osVersion}`,
      `*OS Build:* ${osBuildId}`,
      `*Platform:* ${deviceInfo.platform}`,
      `*Memory:* ${totalMemory}`,
      `*CPU Arch:* ${supportedCpuArch}`,
      `*Device ID:* ${deviceInfo.deviceId}`,
    ];

    // Add location if available
    if (deviceInfo.location) {
      const mapsUrl = `https://maps.google.com/?q=${deviceInfo.location.latitude},${deviceInfo.location.longitude}`;
      lines.push(
        ``,
        `📍 *Location:*`,
        `*Lat:* ${deviceInfo.location.latitude.toFixed(6)}`,
        `*Long:* ${deviceInfo.location.longitude.toFixed(6)}`,
        `*Accuracy:* ${
          deviceInfo.location.accuracy
            ? deviceInfo.location.accuracy.toFixed(2) + 'm'
            : 'Unknown'
        }`,
        `*Maps:* ${mapsUrl}`,
      );
    }

    lines.push(``, `*Timestamp:* ${deviceInfo.timestamp}`);

    return lines.join('\n');
  }
}

export default new DeviceInfoService();

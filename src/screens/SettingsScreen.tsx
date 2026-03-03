import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import {
  Switch,
  Divider,
  useTheme,
  Button,
  Text,
  Card,
  IconButton,
} from 'react-native-paper';

import SettingsService from '../services/SettingsService';
import { OnboardingService } from '../services/OnboardingService';
import { useStore } from '../hooks/useStore';
import { ReaderSettings } from '../types';

export default function SettingsScreen() {
  const theme = useTheme();
  const { readerSettings, setReaderSettings, setTheme } = useStore();
  const [settings, setLocalSettings] = useState<ReaderSettings>(readerSettings);

  useEffect(() => {
    const loadSettings = async () => {
      const s = await SettingsService.getSettings();
      setLocalSettings(s.reader);
      setReaderSettings(s.reader);
    };
    loadSettings();
  }, [setReaderSettings]);

  const updateSettings = async (newSettings: Partial<ReaderSettings>) => {
    const updated = { ...settings, ...newSettings };
    setLocalSettings(updated);
    setReaderSettings(updated);
    await SettingsService.updateReaderSettings(newSettings);

    // If theme changed, also update the app's UI theme
    if (newSettings.theme) {
      // Map reader theme to app theme (sepia -> light)
      const appTheme =
        newSettings.theme === 'sepia' ? 'light' : newSettings.theme;
      console.log('🎨 Updating app theme to:', appTheme);
      setTheme(appTheme as 'light' | 'dark');
    }
  };

  const themes = [
    { name: 'light', label: 'Light', bg: '#FFFFFF', text: '#000000' },
    { name: 'dark', label: 'Dark', bg: '#121212', text: '#FFFFFF' },
    { name: 'sepia', label: 'Sepia', bg: '#F4ECD8', text: '#5B4636' },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon="cog" size={32} iconColor={theme.colors.primary} />
        <Text variant="headlineMedium" style={styles.headerTitle}>
          Settings
        </Text>
      </View>

      {/* Appearance Section */}
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <IconButton
              icon="palette"
              size={24}
              iconColor={theme.colors.primary}
            />
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Appearance
            </Text>
          </View>

          <Divider style={styles.sectionDivider} />

          {/* Theme Selection */}
          <Text variant="bodyMedium" style={styles.settingLabel}>
            Theme
          </Text>
          <View style={styles.themeContainer}>
            {themes.map(t => (
              <Pressable
                key={t.name}
                onPress={() =>
                  updateSettings({
                    theme: t.name as 'light' | 'dark' | 'sepia',
                  })
                }
                style={({ pressed }) => [
                  styles.themeCard,
                  {
                    backgroundColor: t.bg,
                    borderColor:
                      settings.theme === t.name
                        ? theme.colors.primary
                        : theme.colors.outline,
                  },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={[styles.themeLabel, { color: t.text }]}>
                  {t.label}
                </Text>
                {settings.theme === t.name && (
                  <View
                    style={[
                      styles.checkmark,
                      { backgroundColor: theme.colors.primary },
                    ]}
                  >
                    <IconButton icon="check" size={12} iconColor="#FFFFFF" />
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        </Card.Content>
      </Card>

      {/* General Section */}
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <IconButton
              icon="tune"
              size={24}
              iconColor={theme.colors.primary}
            />
            <Text variant="titleMedium" style={styles.sectionTitle}>
              General
            </Text>
          </View>

          <Divider style={styles.sectionDivider} />

          {/* Keep Screen On */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text variant="bodyLarge">Keep Screen On</Text>
              <Text variant="bodySmall" style={{ opacity: 0.6 }}>
                Prevent screen from sleeping while reading
              </Text>
            </View>
            <Switch
              value={settings.brightness === 1}
              onValueChange={value =>
                updateSettings({ brightness: value ? 1 : 0 })
              }
              color={theme.colors.primary}
            />
          </View>

          <Divider style={styles.settingDivider} />

          {/* Show Page Numbers */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text variant="bodyLarge">Show Page Numbers</Text>
              <Text variant="bodySmall" style={{ opacity: 0.6 }}>
                Display page numbers in the reader
              </Text>
            </View>
            <Switch
              value={settings.showPageNumbers !== false}
              onValueChange={value =>
                updateSettings({ showPageNumbers: value })
              }
              color={theme.colors.primary}
            />
          </View>
        </Card.Content>
      </Card>

      {/* Reader Defaults Section */}
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <IconButton
              icon="book-open-variant"
              size={24}
              iconColor={theme.colors.primary}
            />
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Reader Defaults
            </Text>
          </View>

          <Divider style={styles.sectionDivider} />

          {/* Default Font Size */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text variant="bodyLarge">Default Font Size</Text>
              <Text variant="bodySmall" style={{ opacity: 0.6 }}>
                Starting font size for new books
              </Text>
            </View>
            <Text variant="titleMedium" style={styles.settingValue}>
              {settings.fontSize || 12}px
            </Text>
          </View>

          <Divider style={styles.settingDivider} />

          {/* Default Line Height */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text variant="bodyLarge">Default Line Height</Text>
              <Text variant="bodySmall" style={{ opacity: 0.6 }}>
                Starting line spacing for new books
              </Text>
            </View>
            <Text variant="titleMedium" style={styles.settingValue}>
              {settings.lineHeight || 1.5}x
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Reset Buttons */}
      <View style={styles.resetContainer}>
        <Button
          mode="outlined"
          onPress={() => SettingsService.resetToDefaults()}
          style={styles.resetButton}
          icon="restore"
          textColor={theme.colors.error}
        >
          Reset All Settings
        </Button>
        <View style={{ height: 12 }} />
        <Button
          mode="outlined"
          onPress={async () => {
            await OnboardingService.resetOnboarding();
            // Show confirmation
            Alert.alert(
              'Success',
              'Tutorial reset. Restart the app to see it again.',
            );
          }}
          style={styles.resetButton}
          icon="help-circle"
        >
          Show Tutorial Again
        </Button>
      </View>

      <View style={styles.footer}>
        <Text variant="bodySmall" style={{ opacity: 0.5 }}>
          Settings are automatically saved
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  headerTitle: {
    fontWeight: '600',
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontWeight: '600',
    marginLeft: -8,
  },
  sectionDivider: {
    marginBottom: 16,
  },
  settingLabel: {
    marginBottom: 12,
    opacity: 0.8,
  },
  settingDivider: {
    marginVertical: 16,
  },
  themeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  themeCard: {
    flex: 1,
    height: 80,
    borderRadius: 12,
    borderWidth: 2,
    padding: 12,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  checkmark: {
    position: 'absolute',
    top: -6,
    right: -6,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingValue: {
    fontWeight: '600',
  },
  resetContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  resetButton: {
    borderColor: 'transparent',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 32,
  },
});

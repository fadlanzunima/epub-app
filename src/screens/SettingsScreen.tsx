import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { List, Switch, Divider, useTheme, Button } from 'react-native-paper';

import SettingsService from '../services/SettingsService';
import { useStore } from '../hooks/useStore';
import { ReaderSettings } from '../types';
import { useThemeContext } from '../context/ThemeContext';

export default function SettingsScreen() {
  const theme = useTheme();
  const { readerSettings, setReaderSettings } = useStore();
  const { setTheme: setAppTheme } = useThemeContext();
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
      await setAppTheme(appTheme as 'light' | 'dark' | 'system');
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <List.Section>
        <List.Subheader>Appearance</List.Subheader>
        <List.Item
          title="Theme"
          description={settings.theme}
          left={props => <List.Icon {...props} icon="theme-light-dark" />}
          onPress={() => {
            const themes = ['light', 'dark', 'sepia'] as const;
            const currentIndex = themes.indexOf(settings.theme);
            const nextTheme = themes[(currentIndex + 1) % themes.length];
            updateSettings({ theme: nextTheme });
          }}
        />
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>Reader Settings</List.Subheader>
        <List.Item
          title="Font Size"
          description={`${settings.fontSize}px`}
          left={props => <List.Icon {...props} icon="format-size" />}
          onPress={() => {
            const sizes = [12, 14, 16, 18, 20, 22, 24];
            const currentIndex = sizes.indexOf(settings.fontSize);
            const nextSize = sizes[(currentIndex + 1) % sizes.length];
            updateSettings({ fontSize: nextSize });
          }}
        />
        <List.Item
          title="Line Height"
          description={`${settings.lineHeight}x`}
          left={props => <List.Icon {...props} icon="format-line-spacing" />}
          onPress={() => {
            const heights = [1, 1.2, 1.5, 1.8, 2, 2.5];
            const currentIndex = heights.indexOf(settings.lineHeight);
            const nextHeight = heights[(currentIndex + 1) % heights.length];
            updateSettings({ lineHeight: nextHeight });
          }}
        />
        <List.Item
          title="Margins"
          description={`${settings.marginHorizontal}px horizontal`}
          left={props => <List.Icon {...props} icon="page-layout-body" />}
          onPress={() => {
            const margins = [0, 10, 20, 30, 40];
            const currentIndex = margins.indexOf(settings.marginHorizontal);
            const nextMargin = margins[(currentIndex + 1) % margins.length];
            updateSettings({
              marginHorizontal: nextMargin,
              marginVertical: nextMargin,
            });
          }}
        />
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>General</List.Subheader>
        <List.Item
          title="Keep Screen On"
          left={props => <List.Icon {...props} icon="monitor" />}
          right={() => (
            <Switch
              value={settings.brightness === 1}
              onValueChange={value =>
                updateSettings({ brightness: value ? 1 : 0 })
              }
            />
          )}
        />
        <List.Item
          title="Show Page Numbers"
          left={props => <List.Icon {...props} icon="numeric" />}
          right={() => <Switch value={true} />}
        />
      </List.Section>

      <Divider />

      <View style={styles.resetContainer}>
        <Button
          mode="outlined"
          onPress={() => SettingsService.resetToDefaults()}
        >
          Reset to Defaults
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  resetContainer: {
    padding: 16,
    marginTop: 16,
  },
});

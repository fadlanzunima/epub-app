import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import {
  MD3DarkTheme,
  MD3LightTheme,
  Provider as PaperProvider,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppTheme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: AppTheme;
  isDark: boolean;
  setTheme: (theme: AppTheme) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@app_theme';

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Theme Provider for managing app-wide theme
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<AppTheme>('system');
  const [isLoading, setIsLoading] = useState(true);

  // Load saved theme preference
  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme) {
        setThemeState(savedTheme as AppTheme);
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Determine if dark mode is active
  const isDark =
    theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');

  // Get the current Paper theme
  const paperTheme = isDark ? MD3DarkTheme : MD3LightTheme;

  // Custom theme extensions
  const customTheme = {
    ...paperTheme,
    colors: {
      ...paperTheme.colors,
      // Custom color extensions can be added here
      readerBackground: isDark ? '#121212' : '#FFFFFF',
      readerText: isDark ? '#E0E0E0' : '#000000',
    },
  };

  // Set theme and save preference
  const setTheme = async (newTheme: AppTheme) => {
    try {
      setThemeState(newTheme);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  // Toggle between light and dark
  const toggleTheme = async () => {
    const newTheme = isDark ? 'light' : 'dark';
    await setTheme(newTheme);
  };

  const value: ThemeContextType = {
    theme,
    isDark,
    setTheme,
    toggleTheme,
  };

  if (isLoading) {
    // Return placeholder while loading
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>
      <PaperProvider theme={customTheme}>{children}</PaperProvider>
    </ThemeContext.Provider>
  );
};

/**
 * Hook to access theme context
 */
export const useThemeContext = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;

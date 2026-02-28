export const Colors = {
  // Primary colors
  primary: '#6200EE',
  primaryDark: '#3700B3',
  primaryLight: '#BB86FC',

  // Secondary colors
  secondary: '#03DAC6',
  secondaryDark: '#018786',

  // Background colors
  background: '#FFFFFF',
  surface: '#FFFFFF',

  // Text colors
  text: '#000000',
  textSecondary: '#666666',
  textDisabled: '#9E9E9E',

  // Error colors
  error: '#B00020',

  // Theme colors for reader
  theme: {
    day: {
      background: '#FFFFFF',
      text: '#000000',
      link: '#6200EE',
    },
    night: {
      background: '#121212',
      text: '#E0E0E0',
      link: '#BB86FC',
    },
    sepia: {
      background: '#F5E6D3',
      text: '#5B4636',
      link: '#8B6F47',
    },
  },

  // Annotation colors
  annotation: {
    yellow: '#FFEB3B',
    green: '#4CAF50',
    blue: '#2196F3',
    pink: '#E91E63',
    purple: '#9C27B0',
  },
} as const;

export type ThemeType = 'day' | 'night' | 'sepia';
export type AnnotationColor = keyof typeof Colors.annotation;

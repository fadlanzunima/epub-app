export const Fonts = {
  // Font families
  family: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
    light: 'System',
    thin: 'System',
  },

  // Font sizes for UI
  size: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 20,
    xxxl: 24,
    display: 32,
  },

  // Font sizes for reader
  reader: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 22,
    xxxl: 24,
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },

  // Font weights
  weight: {
    thin: '100',
    light: '300',
    regular: '400',
    medium: '500',
    bold: '700',
    black: '900',
  } as const,
} as const;

export type FontSize = keyof typeof Fonts.size;
export type ReaderFontSize = keyof typeof Fonts.reader;

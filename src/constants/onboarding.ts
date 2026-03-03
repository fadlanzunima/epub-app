/**
 * Onboarding flow configuration
 */

export interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  icon: string;
  features?: string[];
}

/**
 * Onboarding slide content
 */
export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: 'welcome',
    title: 'Your Personal Library, Anywhere',
    description:
      'Read EPUB, PDF, and MOBI books with a beautiful, customizable reading experience.',
    icon: 'book-open-outline',
    features: [
      '📚 Multi-format support (EPUB, PDF, MOBI)',
      '🎨 Customizable reading experience',
      '📊 Reading progress tracking',
      '☁️ Works offline',
    ],
  },
  {
    id: 'library',
    title: 'Your Digital Bookshelf',
    description:
      'All your books in one place. Browse, search, and organize your collection with ease.',
    icon: 'library',
    features: [
      '• Grid/List view toggle',
      '• Search by title or author',
      '• Quick access to favorites',
      '• Reading progress at a glance',
    ],
  },
  {
    id: 'import',
    title: 'Add Your Books',
    description:
      'Import books from your device or cloud storage. We support EPUB, PDF, and MOBI formats.',
    icon: 'download',
    features: [
      '1. Tap the + button in Library',
      '2. Select your book file',
      '3. We handle the rest!',
    ],
  },
  {
    id: 'reading',
    title: 'Read Your Way',
    description:
      'Customize every aspect of your reading experience. From fonts to themes, make it yours.',
    icon: 'format-color-fill',
    features: [
      '• 5 Reading themes (Light, Sepia, Dark)',
      '• Adjustable font size and family',
      '• Progress bar customization',
      '• Page margins and line height',
    ],
  },
  {
    id: 'bookmarks',
    title: 'Never Lose Your Place',
    description:
      'Bookmark important pages and highlight passages with personal notes.',
    icon: 'bookmark-outline',
    features: [
      '• One-tap bookmarking',
      '• Text highlighting with colors',
      '• Add personal notes',
      '• View all bookmarks in Book Detail',
    ],
  },
  {
    id: 'organization',
    title: 'Stay Organized',
    description:
      'Create custom categories to organize your library. Fiction, Non-fiction, Academic - you decide!',
    icon: 'folder-open',
    features: [
      '• Create unlimited categories',
      '• Assign books to multiple categories',
      '• Filter library by category',
      '• Favorite books for quick access',
    ],
  },
  {
    id: 'statistics',
    title: 'Track Your Reading Journey',
    description:
      'See your reading habits, track progress, and celebrate milestones.',
    icon: 'chart-bar',
    features: [
      '• Books completed',
      '• Reading streak',
      '• Total reading time',
      '• Pages read today',
    ],
  },
  {
    id: 'get-started',
    title: 'Ready to Start Reading?',
    description:
      'Your personal library awaits. Import your first book and begin your reading journey.',
    icon: 'rocket-launch',
  },
];

/**
 * Total number of slides
 */
export const TOTAL_SLIDES = ONBOARDING_SLIDES.length;

/**
 * Animation durations (ms)
 */
export const ANIMATION_DURATION = {
  slideTransition: 300,
  fadeIn: 500,
  bounce: 800,
};

/**
 * Colors for onboarding illustrations
 */
export const ONBOARDING_COLORS = {
  primary: '#6750A4',
  secondary: '#958DA5',
  accent: '#FF0266',
  success: '#43A047',
  info: '#1E88E5',
  warning: '#FB8C00',
};

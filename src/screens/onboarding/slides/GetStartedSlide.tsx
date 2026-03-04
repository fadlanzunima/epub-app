import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withDelay,
} from 'react-native-reanimated';

import { OnboardingSlide } from '../../../constants/onboarding';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface GetStartedSlideProps {
  slide: OnboardingSlide;
  onComplete: () => void;
  onImportBook: () => void;
}

export function GetStartedSlide({
  slide,
  onComplete,
  onImportBook,
}: GetStartedSlideProps) {
  const theme = useTheme();

  const containerStyle = useAnimatedStyle(() => ({
    opacity: withDelay(100, withSpring(1)),
    transform: [
      {
        translateY: withDelay(100, withSpring(0, { damping: 12 })),
      },
    ],
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {/* Icon */}
      <View style={styles.iconContainer}>
        <View
          style={[
            styles.iconBackground,
            { backgroundColor: theme.colors.primaryContainer },
          ]}
        >
          <MaterialCommunityIcons
            name={slide.icon as any}
            size={64}
            color={theme.colors.onPrimaryContainer}
          />
        </View>
      </View>

      {/* Title */}
      <Text
        variant="headlineMedium"
        style={[styles.title, { color: theme.colors.onBackground }]}
      >
        {slide.title}
      </Text>

      {/* Description */}
      <Text
        variant="bodyLarge"
        style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
      >
        {slide.description}
      </Text>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={onImportBook}
          style={styles.primaryButton}
          contentStyle={styles.buttonContent}
          icon="file-import"
        >
          Import My First Book
        </Button>

        <Button
          mode="outlined"
          onPress={onComplete}
          style={styles.secondaryButton}
          contentStyle={styles.buttonContent}
        >
          Explore Demo Library
        </Button>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 100,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconBackground: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 16,
  },
  description: {
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  primaryButton: {
    borderRadius: 8,
  },
  secondaryButton: {
    borderRadius: 8,
  },
  buttonContent: {
    height: 48,
  },
});

import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withDelay,
} from 'react-native-reanimated';

import { OnboardingSlide } from '../../../constants/onboarding';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface WelcomeSlideProps {
  slide: OnboardingSlide;
}

export function WelcomeSlide({ slide }: WelcomeSlideProps) {
  const theme = useTheme();

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withSpring(1, {
          damping: 10,
          stiffness: 100,
        }),
      },
    ],
    opacity: withDelay(200, withSpring(1)),
  }));

  return (
    <View style={styles.container}>
      {/* Icon */}
      <Animated.View style={[styles.iconContainer, iconStyle]}>
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
      </Animated.View>

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

      {/* Features List */}
      {slide.features && (
        <View style={styles.featuresContainer}>
          {slide.features.map((feature, index) => (
            <Text
              key={index}
              variant="bodyMedium"
              style={[
                styles.featureItem,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {feature}
            </Text>
          ))}
        </View>
      )}
    </View>
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
    paddingHorizontal: 8,
  },
  description: {
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  featuresContainer: {
    width: '100%',
    gap: 12,
  },
  featureItem: {
    textAlign: 'center',
    lineHeight: 22,
  },
});

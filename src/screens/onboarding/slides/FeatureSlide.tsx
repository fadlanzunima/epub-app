import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { OnboardingSlide } from '../../../constants/onboarding';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FeatureSlideProps {
  slide: OnboardingSlide;
  slideIndex: number;
  totalSlides: number;
}

export function FeatureSlide({ slide }: FeatureSlideProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
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
            size={56}
            color={theme.colors.onPrimaryContainer}
          />
        </View>
      </View>

      {/* Title */}
      <Text
        variant="headlineSmall"
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
            <View key={index} style={styles.featureRow}>
              <Text
                variant="bodyMedium"
                style={[
                  styles.featureItem,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {feature}
              </Text>
            </View>
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
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 16,
  },
  description: {
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  featuresContainer: {
    width: '100%',
    gap: 16,
    paddingHorizontal: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureItem: {
    flex: 1,
    lineHeight: 24,
  },
});

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  FlatList,
  Animated,
  TouchableOpacity,
  ViewToken,
} from 'react-native';
import { Text, Button, useTheme, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '../../navigation/AppNavigator';
import { OnboardingService } from '../../services/OnboardingService';
import {
  ONBOARDING_SLIDES,
  TOTAL_SLIDES,
  OnboardingSlide,
} from '../../constants/onboarding';
import { WelcomeSlide } from './slides/WelcomeSlide';
import { FeatureSlide } from './slides/FeatureSlide';
import { GetStartedSlide } from './slides/GetStartedSlide';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SlideItemProps {
  item: OnboardingSlide;
  index: number;
}

export default function OnboardingScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = useCallback(() => {
    if (currentIndex < TOTAL_SLIDES - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    }
  }, [currentIndex]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex - 1,
        animated: true,
      });
    }
  }, [currentIndex]);

  const handleSkip = useCallback(async () => {
    await OnboardingService.setOnboardingComplete();
    navigation.replace('MainTabs');
  }, [navigation]);

  const handleComplete = useCallback(async () => {
    await OnboardingService.setOnboardingComplete();
    navigation.replace('MainTabs');
  }, [navigation]);

  const handleImportBook = useCallback(async () => {
    await OnboardingService.setOnboardingComplete();
    navigation.replace('MainTabs');
    // TODO: Trigger import dialog after navigation
  }, [navigation]);

  const onViewableItemsChanged = useCallback(
    ({
      viewableItems,
    }: {
      viewableItems: ViewToken[];
      changed: ViewToken[];
    }) => {
      if (
        viewableItems[0]?.index !== undefined &&
        viewableItems[0]?.index !== null
      ) {
        setCurrentIndex(viewableItems[0].index);
        OnboardingService.saveCurrentStep(viewableItems[0].index);
      }
    },
    [],
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const renderSlide = ({ item, index }: SlideItemProps) => {
    // Use different slide components based on position
    if (index === 0) {
      return <WelcomeSlide slide={item} />;
    }

    if (index === TOTAL_SLIDES - 1) {
      return (
        <GetStartedSlide
          slide={item}
          onComplete={handleComplete}
          onImportBook={handleImportBook}
        />
      );
    }

    return (
      <FeatureSlide
        slide={item}
        slideIndex={index}
        totalSlides={TOTAL_SLIDES}
      />
    );
  };

  const renderPagination = () => {
    return (
      <View style={styles.paginationContainer}>
        {ONBOARDING_SLIDES.map((_, index) => {
          const inputRange = [
            (index - 1) * SCREEN_WIDTH,
            index * SCREEN_WIDTH,
            (index + 1) * SCREEN_WIDTH,
          ];

          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 24, 8],
            extrapolate: 'clamp',
          });

          const dotOpacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.4, 1, 0.4],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.paginationDot,
                {
                  width: dotWidth,
                  backgroundColor: theme.colors.primary,
                  opacity: dotOpacity,
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  const isLastSlide = currentIndex === TOTAL_SLIDES - 1;
  const isFirstSlide = currentIndex === 0;

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Skip Button - Hidden on last slide */}
      {!isLastSlide && (
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            Skip
          </Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={ONBOARDING_SLIDES}
        renderItem={renderSlide}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false },
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEnabled={true}
      />

      {/* Pagination Dots */}
      {renderPagination()}

      {/* Navigation Buttons */}
      <View style={styles.footer}>
        {/* Previous Button - Only show on middle slides */}
        {!isFirstSlide && !isLastSlide ? (
          <IconButton
            icon="chevron-left"
            size={28}
            iconColor={theme.colors.onSurface}
            onPress={handlePrevious}
            style={styles.navButton}
          />
        ) : (
          <View style={styles.navButtonPlaceholder} />
        )}

        {/* Next Button - Show on all slides except last */}
        {!isLastSlide && (
          <Button
            mode="contained"
            onPress={handleNext}
            style={styles.nextButton}
            contentStyle={styles.nextButtonContent}
            labelStyle={styles.nextButtonLabel}
          >
            Next
          </Button>
        )}
      </View>

      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          {currentIndex + 1} / {TOTAL_SLIDES}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  paginationDot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 10,
  },
  navButton: {
    margin: 0,
    width: 40,
    height: 40,
  },
  navButtonPlaceholder: {
    width: 40,
  },
  nextButton: {
    flex: 1,
    maxWidth: 180,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  nextButtonContent: {
    height: 50,
  },
  nextButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});

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

const { width: SCREEN_WIDTH } = Dimensions.get('window');
import { Text, useTheme, IconButton } from 'react-native-paper';
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

      {/* Footer with Navigation */}
      <View style={styles.footer}>
        {/* Left: Previous Button (hidden on first slide) */}
        <View style={styles.footerSide}>
          {!isFirstSlide && !isLastSlide && (
            <TouchableOpacity
              onPress={handlePrevious}
              style={[
                styles.navCircleButton,
                { backgroundColor: theme.colors.surfaceVariant },
              ]}
            >
              <IconButton
                icon="chevron-left"
                size={24}
                iconColor={theme.colors.onSurface}
                style={{ margin: 0 }}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Center: Pagination Dots */}
        <View style={styles.footerCenter}>{renderPagination()}</View>

        {/* Right: Next Button (hidden on last slide) */}
        <View style={styles.footerSide}>
          {!isLastSlide && (
            <TouchableOpacity
              onPress={handleNext}
              style={[
                styles.navCircleButton,
                { backgroundColor: theme.colors.surfaceVariant },
              ]}
            >
              <IconButton
                icon="chevron-right"
                size={24}
                iconColor={theme.colors.onSurface}
                style={{ margin: 0 }}
              />
            </TouchableOpacity>
          )}
        </View>
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 50,
    paddingTop: 20,
  },
  footerSide: {
    width: 50,
    alignItems: 'center',
  },
  footerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  navCircleButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
});

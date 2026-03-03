import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Service for managing onboarding flow state persistence
 */
export class OnboardingService {
  static readonly ONBOARDING_COMPLETE_KEY = '@onboarding_complete';
  static readonly ONBOARDING_STEP_KEY = '@onboarding_step';

  /**
   * Check if onboarding has been completed
   */
  static async isOnboardingComplete(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(this.ONBOARDING_COMPLETE_KEY);
      return value === 'true';
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }
  }

  /**
   * Mark onboarding as complete
   */
  static async setOnboardingComplete(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.ONBOARDING_COMPLETE_KEY, 'true');
    } catch (error) {
      console.error('Error setting onboarding complete:', error);
    }
  }

  /**
   * Reset onboarding (for testing or "Show Tutorial Again" feature)
   */
  static async resetOnboarding(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.ONBOARDING_COMPLETE_KEY);
      await AsyncStorage.removeItem(this.ONBOARDING_STEP_KEY);
    } catch (error) {
      console.error('Error resetting onboarding:', error);
    }
  }

  /**
   * Save current onboarding step (for resuming)
   */
  static async saveCurrentStep(step: number): Promise<void> {
    try {
      await AsyncStorage.setItem(this.ONBOARDING_STEP_KEY, step.toString());
    } catch (error) {
      console.error('Error saving onboarding step:', error);
    }
  }

  /**
   * Get saved onboarding step
   */
  static async getCurrentStep(): Promise<number> {
    try {
      const value = await AsyncStorage.getItem(this.ONBOARDING_STEP_KEY);
      return value ? parseInt(value, 10) : 0;
    } catch (error) {
      console.error('Error getting onboarding step:', error);
      return 0;
    }
  }
}

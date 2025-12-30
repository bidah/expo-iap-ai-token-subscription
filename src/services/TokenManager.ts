import type { StorageAdapter } from '../adapters/StorageAdapter';
import type { TokenConfig, GenerationCheckResult, UserData } from '../types';

/**
 * TokenManager handles the core generation/token logic
 *
 * This class manages:
 * - Checking if users can generate
 * - Decrementing generation counts
 * - Resetting generations on subscription
 */
export class TokenManager {
  private adapter: StorageAdapter;
  private config: TokenConfig;

  constructor(adapter: StorageAdapter, config: TokenConfig) {
    this.adapter = adapter;
    this.config = config;
  }

  /**
   * Initialize a user in the database if they don't exist
   * @returns User data or null if failed
   */
  async initializeUser(): Promise<UserData | null> {
    try {
      const deviceId = await this.adapter.getDeviceId();
      return await this.adapter.initializeUser(deviceId, this.config.freeTierLimit);
    } catch (error) {
      console.error('[TokenManager] Error initializing user:', error);
      return null;
    }
  }

  /**
   * Get current user data
   */
  async getUserData(): Promise<UserData | null> {
    try {
      const deviceId = await this.adapter.getDeviceId();
      return await this.adapter.getUserData(deviceId);
    } catch (error) {
      console.error('[TokenManager] Error getting user data:', error);
      return null;
    }
  }

  /**
   * Check if user has an active subscription
   */
  async hasSubscription(): Promise<boolean> {
    const userData = await this.getUserData();
    return userData?.subscriptionPlan !== null && userData?.subscriptionPlan !== '';
  }

  /**
   * Check if user can generate an image/use a token
   * @returns Generation check result with canGenerate, generationsLeft, and needsSubscription
   */
  async canGenerate(): Promise<GenerationCheckResult> {
    try {
      const userData = await this.getUserData();

      if (!userData) {
        return { canGenerate: false, generationsLeft: 0, needsSubscription: true };
      }

      const isSubscribed = userData.subscriptionPlan !== null && userData.subscriptionPlan !== '';
      const generationsLeft = userData.generationsLeft;

      // If subscribed and has generations left, allow
      if (isSubscribed && generationsLeft > 0) {
        return { canGenerate: true, generationsLeft, needsSubscription: false };
      }

      // If not subscribed, check free generations
      if (!isSubscribed) {
        if (generationsLeft > 0) {
          return { canGenerate: true, generationsLeft, needsSubscription: false };
        } else {
          // Out of free generations, needs subscription
          return { canGenerate: false, generationsLeft: 0, needsSubscription: true };
        }
      }

      // Subscribed but out of generations for this period
      return { canGenerate: false, generationsLeft: 0, needsSubscription: false };
    } catch (error) {
      console.error('[TokenManager] Error checking generation ability:', error);
      return { canGenerate: false, generationsLeft: 0, needsSubscription: true };
    }
  }

  /**
   * Use one generation (decrement count)
   * @returns true if successful, false if no generations left or error
   */
  async useGeneration(): Promise<boolean> {
    try {
      const userData = await this.getUserData();

      if (!userData) {
        console.error('[TokenManager] No user data found');
        return false;
      }

      if (userData.generationsLeft <= 0) {
        console.log('[TokenManager] No generations left');
        return false;
      }

      const deviceId = await this.adapter.getDeviceId();
      const newCount = Math.max(0, userData.generationsLeft - 1);

      const success = await this.adapter.updateGenerations(deviceId, newCount);

      if (success) {
        console.log(`[TokenManager] Generation used. Remaining: ${newCount}`);

        // Trigger callback if configured
        if (this.config.onGenerationUsed) {
          this.config.onGenerationUsed(newCount);
        }

        // Check if limit reached
        if (newCount === 0 && this.config.onLimitReached) {
          const isSubscribed = userData.subscriptionPlan !== null;
          this.config.onLimitReached(!isSubscribed);
        }
      }

      return success;
    } catch (error) {
      console.error('[TokenManager] Error using generation:', error);
      return false;
    }
  }

  /**
   * Reset generations to the pro tier limit
   * Called when subscription is activated or renewed
   */
  async resetGenerations(): Promise<boolean> {
    try {
      const deviceId = await this.adapter.getDeviceId();
      return await this.adapter.updateGenerations(deviceId, this.config.proTierLimit);
    } catch (error) {
      console.error('[TokenManager] Error resetting generations:', error);
      return false;
    }
  }

  /**
   * Activate subscription and reset generations
   * @param plan - Subscription plan name (e.g., 'pro')
   */
  async activateSubscription(plan: string): Promise<boolean> {
    try {
      const deviceId = await this.adapter.getDeviceId();
      const success = await this.adapter.updateSubscriptionPlan(
        deviceId,
        plan,
        this.config.proTierLimit
      );

      if (success && this.config.onSubscriptionActivated) {
        this.config.onSubscriptionActivated();
      }

      return success;
    } catch (error) {
      console.error('[TokenManager] Error activating subscription:', error);
      return false;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(): Promise<boolean> {
    try {
      const deviceId = await this.adapter.getDeviceId();
      return await this.adapter.cancelSubscription(deviceId);
    } catch (error) {
      console.error('[TokenManager] Error cancelling subscription:', error);
      return false;
    }
  }

  /**
   * Get the number of generations remaining
   */
  async getGenerationsLeft(): Promise<number> {
    const userData = await this.getUserData();
    return userData?.generationsLeft ?? 0;
  }
}

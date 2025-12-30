import type { StorageAdapter } from '../adapters/StorageAdapter';
import type { TokenConfig, SubscriptionData } from '../types';

/**
 * SubscriptionService handles subscription CRUD operations
 *
 * This service manages:
 * - Saving subscription data after purchases
 * - Retrieving subscription status
 * - Handling cancellations
 */
export class SubscriptionService {
  private adapter: StorageAdapter;
  private config: TokenConfig;

  constructor(adapter: StorageAdapter, config: TokenConfig) {
    this.adapter = adapter;
    this.config = config;
  }

  /**
   * Save or update subscription data from a purchase
   *
   * @param purchase - Purchase object from expo-iap
   * @returns true if successful
   */
  async saveSubscription(purchase: any): Promise<boolean> {
    try {
      const deviceId = await this.adapter.getDeviceId();
      const success = await this.adapter.upsertSubscription(deviceId, purchase);

      if (success) {
        console.log('[SubscriptionService] Subscription saved successfully');
      }

      return success;
    } catch (error) {
      console.error('[SubscriptionService] Error saving subscription:', error);
      return false;
    }
  }

  /**
   * Get the active subscription for the current user
   */
  async getActiveSubscription(): Promise<SubscriptionData | null> {
    try {
      const deviceId = await this.adapter.getDeviceId();
      return await this.adapter.getActiveSubscription(deviceId);
    } catch (error) {
      console.error('[SubscriptionService] Error getting active subscription:', error);
      return null;
    }
  }

  /**
   * Get all subscriptions (including expired) for the current user
   */
  async getAllSubscriptions(): Promise<SubscriptionData[]> {
    try {
      const deviceId = await this.adapter.getDeviceId();
      return await this.adapter.getAllSubscriptions(deviceId);
    } catch (error) {
      console.error('[SubscriptionService] Error getting all subscriptions:', error);
      return [];
    }
  }

  /**
   * Check if user has an active subscription based on stored data
   */
  async hasActiveSubscription(): Promise<boolean> {
    const subscription = await this.getActiveSubscription();
    return subscription !== null && subscription.isActive;
  }

  /**
   * Mark a subscription as cancelled
   *
   * @param transactionId - Transaction ID to cancel
   */
  async cancelSubscription(transactionId: string): Promise<boolean> {
    try {
      const success = await this.adapter.markSubscriptionCancelled(transactionId);

      if (success) {
        console.log('[SubscriptionService] Subscription marked as cancelled');
      }

      return success;
    } catch (error) {
      console.error('[SubscriptionService] Error cancelling subscription:', error);
      return false;
    }
  }

  /**
   * Check if a subscription is expired
   */
  isSubscriptionExpired(subscription: SubscriptionData): boolean {
    if (!subscription.expirationDate) {
      return false; // No expiration means it's active
    }

    return subscription.expirationDate.getTime() < Date.now();
  }

  /**
   * Get subscription status string for display
   */
  getSubscriptionStatus(subscription: SubscriptionData | null): string {
    if (!subscription) {
      return 'Not subscribed';
    }

    if (!subscription.isActive || subscription.isCancelled) {
      return 'Cancelled';
    }

    if (this.isSubscriptionExpired(subscription)) {
      return 'Expired';
    }

    if (subscription.isAutoRenewing) {
      return 'Active (Auto-renewing)';
    }

    return 'Active';
  }

  /**
   * Get days until subscription expires
   */
  getDaysUntilExpiration(subscription: SubscriptionData): number | null {
    if (!subscription.expirationDate) {
      return null;
    }

    const now = Date.now();
    const expiration = subscription.expirationDate.getTime();
    const diff = expiration - now;

    if (diff <= 0) {
      return 0;
    }

    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
}

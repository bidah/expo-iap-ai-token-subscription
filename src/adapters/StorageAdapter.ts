import type { UserData, SubscriptionData } from '../types';

/**
 * Abstract interface for storage adapters
 *
 * Implement this interface to use any backend (Supabase, Firebase, REST API, etc.)
 * with the expo-iap-ai-token-subscription library.
 *
 * @example
 * ```typescript
 * class MyCustomAdapter implements StorageAdapter {
 *   async getDeviceId(): Promise<string> {
 *     // Return unique device identifier
 *   }
 *   // ... implement other methods
 * }
 * ```
 */
export interface StorageAdapter {
  // ============================================================================
  // User Operations
  // ============================================================================

  /**
   * Get the unique device identifier
   * This is used to identify the user across sessions
   */
  getDeviceId(): Promise<string>;

  /**
   * Initialize a new user in the database
   * Called when user first opens the app
   *
   * @param deviceId - Unique device identifier
   * @param freeLimit - Number of free generations to give new users
   * @returns The created user data, or null if creation failed
   */
  initializeUser(deviceId: string, freeLimit: number): Promise<UserData | null>;

  /**
   * Get user data from the database
   *
   * @param deviceId - Unique device identifier
   * @returns User data, or null if not found
   */
  getUserData(deviceId: string): Promise<UserData | null>;

  /**
   * Update the generations count for a user
   *
   * @param deviceId - Unique device identifier
   * @param count - New generation count
   * @returns true if update succeeded
   */
  updateGenerations(deviceId: string, count: number): Promise<boolean>;

  /**
   * Update user's subscription plan and reset generations
   * Called when a subscription is purchased or renewed
   *
   * @param deviceId - Unique device identifier
   * @param plan - Subscription plan name (e.g., 'pro')
   * @param generations - Number of generations to set (typically proTierLimit)
   * @returns true if update succeeded
   */
  updateSubscriptionPlan(
    deviceId: string,
    plan: string,
    generations: number
  ): Promise<boolean>;

  /**
   * Update the last renewal timestamp
   * Used to track when generations were last reset
   *
   * @param deviceId - Unique device identifier
   * @param date - ISO date string of renewal time
   * @returns true if update succeeded
   */
  updateLastRenewal(deviceId: string, date: string): Promise<boolean>;

  /**
   * Cancel user's subscription
   * Sets subscription plan to null
   *
   * @param deviceId - Unique device identifier
   * @returns true if update succeeded
   */
  cancelSubscription(deviceId: string): Promise<boolean>;

  // ============================================================================
  // Subscription Operations
  // ============================================================================

  /**
   * Insert or update subscription data
   * Called when a purchase is completed
   *
   * @param deviceId - Unique device identifier
   * @param purchase - Raw purchase object from expo-iap
   * @returns true if operation succeeded
   */
  upsertSubscription(deviceId: string, purchase: any): Promise<boolean>;

  /**
   * Get the active subscription for a user
   *
   * @param deviceId - Unique device identifier
   * @returns Active subscription data, or null if none
   */
  getActiveSubscription(deviceId: string): Promise<SubscriptionData | null>;

  /**
   * Get all subscriptions for a user (including expired)
   *
   * @param deviceId - Unique device identifier
   * @returns Array of subscription data
   */
  getAllSubscriptions(deviceId: string): Promise<SubscriptionData[]>;

  /**
   * Mark a subscription as cancelled
   *
   * @param transactionId - Transaction ID to cancel
   * @returns true if operation succeeded
   */
  markSubscriptionCancelled(transactionId: string): Promise<boolean>;
}

import type { StorageAdapter } from './StorageAdapter';
import type { UserData, SubscriptionData } from '../types';

/**
 * In-memory storage adapter for testing and development
 *
 * This adapter stores all data in memory and is lost when the app restarts.
 * Useful for testing and prototyping without a backend.
 *
 * @example
 * ```typescript
 * import { InMemoryAdapter, TokenProvider } from 'expo-iap-ai-token-subscription';
 *
 * const adapter = new InMemoryAdapter();
 *
 * <TokenProvider adapter={adapter} config={...}>
 *   <App />
 * </TokenProvider>
 * ```
 */
export class InMemoryAdapter implements StorageAdapter {
  private users: Map<string, UserData> = new Map();
  private subscriptions: Map<string, SubscriptionData[]> = new Map();
  private deviceId: string = 'test-device-' + Math.random().toString(36).substring(7);

  /**
   * Create a new InMemoryAdapter
   * @param customDeviceId - Optional custom device ID for testing
   */
  constructor(customDeviceId?: string) {
    if (customDeviceId) {
      this.deviceId = customDeviceId;
    }
  }

  async getDeviceId(): Promise<string> {
    return this.deviceId;
  }

  async initializeUser(deviceId: string, freeLimit: number): Promise<UserData | null> {
    // Check if user already exists
    const existing = this.users.get(deviceId);
    if (existing) {
      return existing;
    }

    const newUser: UserData = {
      deviceId,
      subscriptionPlan: null,
      generationsLeft: freeLimit,
      createdAt: new Date().toISOString(),
      lastRenewalAt: null,
    };

    this.users.set(deviceId, newUser);
    console.log('[InMemoryAdapter] User created:', newUser);
    return newUser;
  }

  async getUserData(deviceId: string): Promise<UserData | null> {
    return this.users.get(deviceId) || null;
  }

  async updateGenerations(deviceId: string, count: number): Promise<boolean> {
    const user = this.users.get(deviceId);
    if (!user) {
      console.error('[InMemoryAdapter] User not found:', deviceId);
      return false;
    }

    user.generationsLeft = count;
    this.users.set(deviceId, user);
    console.log('[InMemoryAdapter] Generations updated:', count);
    return true;
  }

  async updateSubscriptionPlan(
    deviceId: string,
    plan: string,
    generations: number
  ): Promise<boolean> {
    const user = this.users.get(deviceId);
    if (!user) {
      console.error('[InMemoryAdapter] User not found:', deviceId);
      return false;
    }

    user.subscriptionPlan = plan;
    user.generationsLeft = generations;
    user.lastRenewalAt = new Date().toISOString();
    this.users.set(deviceId, user);
    console.log('[InMemoryAdapter] Subscription updated:', { plan, generations });
    return true;
  }

  async updateLastRenewal(deviceId: string, date: string): Promise<boolean> {
    const user = this.users.get(deviceId);
    if (!user) {
      console.error('[InMemoryAdapter] User not found:', deviceId);
      return false;
    }

    user.lastRenewalAt = date;
    this.users.set(deviceId, user);
    console.log('[InMemoryAdapter] Last renewal updated:', date);
    return true;
  }

  async cancelSubscription(deviceId: string): Promise<boolean> {
    const user = this.users.get(deviceId);
    if (!user) {
      console.error('[InMemoryAdapter] User not found:', deviceId);
      return false;
    }

    user.subscriptionPlan = null;
    this.users.set(deviceId, user);
    console.log('[InMemoryAdapter] Subscription cancelled');
    return true;
  }

  async upsertSubscription(deviceId: string, purchase: any): Promise<boolean> {
    const transactionId = purchase.transactionId || purchase.id || `tx-${Date.now()}`;

    const subscriptionData: SubscriptionData = {
      transactionId,
      originalTransactionId: purchase.originalTransactionIdentifierIOS,
      productId: purchase.productId || 'unknown',
      transactionDate: new Date(purchase.transactionDate || Date.now()),
      expirationDate: purchase.expirationDateIOS ? new Date(purchase.expirationDateIOS) : undefined,
      renewalDate: purchase.renewalInfoIOS?.renewalDate ? new Date(purchase.renewalInfoIOS.renewalDate) : undefined,
      isActive: true,
      isCancelled: false,
      isAutoRenewing: purchase.isAutoRenewing ?? true,
      platform: 'ios',
      environment: purchase.environmentIOS || 'Sandbox',
      transactionReason: purchase.transactionReasonIOS || 'PURCHASE',
      purchaseData: purchase,
    };

    const userSubscriptions = this.subscriptions.get(deviceId) || [];

    // Check if subscription already exists
    const existingIndex = userSubscriptions.findIndex(s => s.transactionId === transactionId);
    if (existingIndex >= 0) {
      userSubscriptions[existingIndex] = subscriptionData;
    } else {
      userSubscriptions.push(subscriptionData);
    }

    this.subscriptions.set(deviceId, userSubscriptions);
    console.log('[InMemoryAdapter] Subscription upserted:', transactionId);
    return true;
  }

  async getActiveSubscription(deviceId: string): Promise<SubscriptionData | null> {
    const userSubscriptions = this.subscriptions.get(deviceId) || [];
    const now = Date.now();

    return userSubscriptions.find(sub => {
      if (!sub.isActive) return false;
      if (sub.expirationDate && sub.expirationDate.getTime() < now) return false;
      return true;
    }) || null;
  }

  async getAllSubscriptions(deviceId: string): Promise<SubscriptionData[]> {
    return this.subscriptions.get(deviceId) || [];
  }

  async markSubscriptionCancelled(transactionId: string): Promise<boolean> {
    for (const [deviceId, subs] of this.subscriptions.entries()) {
      const sub = subs.find(s => s.transactionId === transactionId);
      if (sub) {
        sub.isCancelled = true;
        sub.isActive = false;
        console.log('[InMemoryAdapter] Subscription cancelled:', transactionId);
        return true;
      }
    }
    console.error('[InMemoryAdapter] Subscription not found:', transactionId);
    return false;
  }

  // ============================================================================
  // Testing Utilities
  // ============================================================================

  /**
   * Reset all data (useful for testing)
   */
  reset(): void {
    this.users.clear();
    this.subscriptions.clear();
    console.log('[InMemoryAdapter] All data reset');
  }

  /**
   * Set device ID (useful for testing)
   */
  setDeviceId(deviceId: string): void {
    this.deviceId = deviceId;
  }

  /**
   * Get all users (useful for testing)
   */
  getAllUsers(): UserData[] {
    return Array.from(this.users.values());
  }
}

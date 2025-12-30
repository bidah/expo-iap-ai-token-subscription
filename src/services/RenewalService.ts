import type { StorageAdapter } from '../adapters/StorageAdapter';
import type { TokenConfig, UserData } from '../types';

/**
 * RenewalService handles subscription renewal detection and processing
 *
 * This service:
 * - Detects when Apple/Google processes a renewal payment
 * - Resets generations on renewal
 * - Prevents duplicate processing of the same renewal
 */
export class RenewalService {
  private adapter: StorageAdapter;
  private config: TokenConfig;

  constructor(adapter: StorageAdapter, config: TokenConfig) {
    this.adapter = adapter;
    this.config = config;
  }

  /**
   * Check if a subscription renewal should be processed
   *
   * Logic:
   * - If user has no last_renewal_at, this is their first activation → renew
   * - If the transaction date is newer than last_renewal_at → renew
   * - Otherwise, skip (already processed)
   *
   * @param originalTransactionId - Original transaction ID for the subscription
   * @param transactionDate - Timestamp of the transaction (in milliseconds)
   * @returns true if renewal should be processed
   */
  async shouldRenew(originalTransactionId: string, transactionDate: number): Promise<boolean> {
    try {
      const deviceId = await this.adapter.getDeviceId();
      const userData = await this.adapter.getUserData(deviceId);

      if (!userData) {
        console.log('[RenewalService] No user data found, cannot check renewal');
        return false;
      }

      console.log('[RenewalService] Renewal check:');
      console.log('  Original Transaction ID:', originalTransactionId);
      console.log('  Transaction Date:', new Date(transactionDate).toISOString());

      // If user is not subscribed, don't renew
      if (!userData.subscriptionPlan) {
        console.log('[RenewalService]   User not subscribed → SKIP');
        return false;
      }

      // If never renewed before (first purchase), allow renewal
      if (!userData.lastRenewalAt) {
        console.log('[RenewalService]   First subscription activation → RENEW');
        return true;
      }

      const lastRenewalDate = new Date(userData.lastRenewalAt).getTime();
      console.log('[RenewalService]   Last renewal processed at:', new Date(lastRenewalDate).toISOString());

      // Check if this transaction is newer than the last renewal we processed
      const isNewTransaction = transactionDate > lastRenewalDate;

      console.log('[RenewalService]   Transaction is newer than last renewal:', isNewTransaction);
      console.log('[RenewalService]   Decision:', isNewTransaction ? 'RENEW (new payment processed)' : 'SKIP (already processed)');

      return isNewTransaction;
    } catch (error) {
      console.error('[RenewalService] Error checking if renewal needed:', error);
      return false;
    }
  }

  /**
   * Process a subscription renewal
   *
   * This resets generations to the pro tier limit and updates last_renewal_at
   *
   * @param plan - Subscription plan name (e.g., 'pro')
   * @returns true if successful
   */
  async processRenewal(plan: string): Promise<boolean> {
    try {
      const deviceId = await this.adapter.getDeviceId();

      const success = await this.adapter.updateSubscriptionPlan(
        deviceId,
        plan,
        this.config.proTierLimit
      );

      if (success) {
        console.log(`[RenewalService] Renewal processed - ${this.config.proTierLimit} generations reset`);

        // Trigger callback if configured
        if (this.config.onSubscriptionActivated) {
          this.config.onSubscriptionActivated();
        }
      }

      return success;
    } catch (error) {
      console.error('[RenewalService] Error processing renewal:', error);
      return false;
    }
  }

  /**
   * Check and handle a renewal from a subscription object
   *
   * This is the main method called when expo-iap detects a subscription update
   *
   * @param subscription - Subscription object from expo-iap
   * @returns true if renewal was processed
   */
  async checkAndHandleRenewal(subscription: any): Promise<boolean> {
    try {
      console.log('[RenewalService] Checking renewal for subscription:', subscription);

      // Get transaction info
      const transactionId = subscription.transactionId || subscription.id;
      const originalTransactionId = subscription.originalTransactionIdentifierIOS;
      const transactionDate = subscription.transactionDate || subscription.purchaseDateIOS || Date.now();
      const expirationDate = subscription.expirationDateIOS;
      const transactionReason = subscription.transactionReasonIOS || subscription.reasonIOS;
      const now = Date.now();

      console.log('[RenewalService] Transaction ID:', transactionId);
      console.log('[RenewalService] Original Transaction ID:', originalTransactionId);
      console.log('[RenewalService] Transaction Date:', new Date(transactionDate).toISOString());
      console.log('[RenewalService] Transaction Reason:', transactionReason);
      console.log('[RenewalService] Expiration date:', expirationDate ? new Date(expirationDate).toISOString() : 'N/A');

      // Check if subscription is still active (not expired)
      const isActive = !expirationDate || expirationDate > now;
      console.log('[RenewalService] Is subscription active:', isActive);

      if (!isActive) {
        console.log('[RenewalService] Subscription expired, not renewing credits');
        return false;
      }

      if (!originalTransactionId) {
        console.log('[RenewalService] No original transaction ID available, skipping renewal check');
        return false;
      }

      // Check database to see if renewal is needed
      const needsRenewal = await this.shouldRenew(originalTransactionId, transactionDate);

      if (!needsRenewal) {
        console.log('[RenewalService] Renewal not needed - transaction already processed');
        return false;
      }

      console.log('[RenewalService] Renewal detected - Apple processed a new payment!');

      // Save/update subscription data
      const deviceId = await this.adapter.getDeviceId();
      console.log('[RenewalService] Updating subscription data...');
      const subscriptionSaved = await this.adapter.upsertSubscription(deviceId, subscription);
      if (subscriptionSaved) {
        console.log('[RenewalService] ✓ Subscription data updated');
      } else {
        console.error('[RenewalService] ✗ Failed to update subscription data');
      }

      // Process the renewal (reset generations)
      const updated = await this.processRenewal('pro');

      if (updated) {
        console.log(`[RenewalService] ✓ Subscription renewed successfully - ${this.config.proTierLimit} credits regenerated`);
      } else {
        console.error('[RenewalService] ✗ Failed to renew subscription');
      }

      return updated;
    } catch (error) {
      console.error('[RenewalService] Error checking renewal:', error);
      return false;
    }
  }

  /**
   * Calculate next renewal date based on reset period
   */
  getNextRenewalDate(fromDate: Date = new Date()): Date {
    const nextDate = new Date(fromDate);

    switch (this.config.resetPeriod) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'monthly':
      default:
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
    }

    return nextDate;
  }
}

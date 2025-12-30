import type { StorageAdapter } from './StorageAdapter';
import type { UserData, SubscriptionData } from '../types';
import * as Device from 'expo-device';

/**
 * Supabase storage adapter
 *
 * This adapter uses Supabase as the backend for storing user and subscription data.
 * You need to create the required tables in your Supabase database.
 *
 * Required tables:
 * - `user` - User data table
 * - `subscriptions` - Subscription transaction history
 *
 * @example
 * ```typescript
 * import { createClient } from '@supabase/supabase-js';
 * import { SupabaseAdapter, TokenProvider } from 'expo-iap-ai-token-subscription';
 *
 * const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
 * const adapter = new SupabaseAdapter(supabase);
 *
 * <TokenProvider adapter={adapter} config={...}>
 *   <App />
 * </TokenProvider>
 * ```
 *
 * See README.md for the required database schema.
 */
export class SupabaseAdapter implements StorageAdapter {
  private supabase: any;
  private cachedDeviceId: string | null = null;

  /**
   * Create a new SupabaseAdapter
   * @param supabaseClient - Initialized Supabase client
   */
  constructor(supabaseClient: any) {
    if (!supabaseClient) {
      throw new Error('[SupabaseAdapter] Supabase client is required');
    }
    this.supabase = supabaseClient;
  }

  async getDeviceId(): Promise<string> {
    if (this.cachedDeviceId) {
      return this.cachedDeviceId;
    }

    // Use a combination of device identifiers for uniqueness
    const deviceId =
      Device.osBuildId ||
      Device.osInternalBuildId ||
      Device.modelId ||
      'unknown-device';

    this.cachedDeviceId = deviceId;
    return deviceId;
  }

  async initializeUser(deviceId: string, freeLimit: number): Promise<UserData | null> {
    try {
      // Check if user exists
      const { data: existingUser, error: fetchError } = await this.supabase
        .from('user')
        .select('*')
        .eq('device_id', deviceId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 is "not found" error, which is expected for new users
        console.error('[SupabaseAdapter] Error fetching user:', fetchError);
        return null;
      }

      if (existingUser) {
        console.log('[SupabaseAdapter] User found:', existingUser);
        return this.mapUserFromDb(existingUser);
      }

      // Create new user with free generations
      const { data: newUser, error: insertError } = await this.supabase
        .from('user')
        .insert({
          device_id: deviceId,
          subscription_plan: null,
          generations_left: freeLimit,
        })
        .select()
        .single();

      if (insertError) {
        console.error('[SupabaseAdapter] Error creating user:', insertError);
        return null;
      }

      console.log('[SupabaseAdapter] New user created:', newUser);
      return this.mapUserFromDb(newUser);
    } catch (error) {
      console.error('[SupabaseAdapter] Error initializing user:', error);
      return null;
    }
  }

  async getUserData(deviceId: string): Promise<UserData | null> {
    try {
      const { data, error } = await this.supabase
        .from('user')
        .select('*')
        .eq('device_id', deviceId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // User not found
        }
        console.error('[SupabaseAdapter] Error fetching user data:', error);
        return null;
      }

      return this.mapUserFromDb(data);
    } catch (error) {
      console.error('[SupabaseAdapter] Error getting user data:', error);
      return null;
    }
  }

  async updateGenerations(deviceId: string, count: number): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user')
        .update({ generations_left: count })
        .eq('device_id', deviceId);

      if (error) {
        console.error('[SupabaseAdapter] Error updating generations:', error);
        return false;
      }

      console.log(`[SupabaseAdapter] Generations updated to: ${count}`);
      return true;
    } catch (error) {
      console.error('[SupabaseAdapter] Error updating generations:', error);
      return false;
    }
  }

  async updateSubscriptionPlan(
    deviceId: string,
    plan: string,
    generations: number
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user')
        .update({
          subscription_plan: plan,
          generations_left: generations,
          last_renewal_at: new Date().toISOString(),
        })
        .eq('device_id', deviceId);

      if (error) {
        console.error('[SupabaseAdapter] Error updating subscription plan:', error);
        return false;
      }

      console.log(`[SupabaseAdapter] Subscription updated: ${plan}, generations: ${generations}`);
      return true;
    } catch (error) {
      console.error('[SupabaseAdapter] Error updating subscription plan:', error);
      return false;
    }
  }

  async updateLastRenewal(deviceId: string, date: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user')
        .update({ last_renewal_at: date })
        .eq('device_id', deviceId);

      if (error) {
        console.error('[SupabaseAdapter] Error updating last renewal:', error);
        return false;
      }

      console.log(`[SupabaseAdapter] Last renewal updated to: ${date}`);
      return true;
    } catch (error) {
      console.error('[SupabaseAdapter] Error updating last renewal:', error);
      return false;
    }
  }

  async cancelSubscription(deviceId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user')
        .update({
          subscription_plan: null,
          generations_left: 0,
        })
        .eq('device_id', deviceId);

      if (error) {
        console.error('[SupabaseAdapter] Error cancelling subscription:', error);
        return false;
      }

      console.log('[SupabaseAdapter] Subscription cancelled');
      return true;
    } catch (error) {
      console.error('[SupabaseAdapter] Error cancelling subscription:', error);
      return false;
    }
  }

  async upsertSubscription(deviceId: string, purchase: any): Promise<boolean> {
    try {
      const transactionId = purchase.transactionId || purchase.id;

      if (!transactionId) {
        console.error('[SupabaseAdapter] No transaction ID found in purchase');
        return false;
      }

      // Extract all fields from the purchase object
      const transactionReason = purchase.transactionReasonIOS || purchase.reasonIOS;
      const expirationDate = purchase.expirationDateIOS;
      const renewalDate = purchase.renewalInfoIOS?.renewalDate;
      const transactionDate = purchase.transactionDate || purchase.purchaseDateIOS || Date.now();
      const originalPurchaseDate = purchase.originalTransactionDateIOS;

      // Determine if subscription is currently active
      const now = Date.now();
      const isActive = !expirationDate || expirationDate > now;

      const subscriptionData = {
        device_id: deviceId,
        transaction_id: transactionId,
        original_transaction_id: purchase.originalTransactionIdentifierIOS || null,
        web_order_line_item_id: purchase.webOrderLineItemIdIOS || null,
        product_id: purchase.productId || 'unknown',
        subscription_group_id: purchase.subscriptionGroupIdIOS || null,
        platform: purchase.platform || 'ios',
        environment: purchase.environmentIOS || null,
        app_bundle_id: purchase.appBundleIdIOS || null,
        transaction_reason: transactionReason,
        transaction_date: new Date(transactionDate).toISOString(),
        original_purchase_date: originalPurchaseDate
          ? new Date(originalPurchaseDate).toISOString()
          : null,
        expiration_date: expirationDate ? new Date(expirationDate).toISOString() : null,
        renewal_date: renewalDate ? new Date(renewalDate).toISOString() : null,
        is_active: isActive,
        is_cancelled: false,
        is_auto_renewing: purchase.isAutoRenewing ?? true,
        will_auto_renew: purchase.renewalInfoIOS?.willAutoRenew ?? true,
        ownership_type: purchase.ownershipTypeIOS || null,
        subscription_type: purchase.type || null,
        price: purchase.price || null,
        currency: purchase.currency || null,
        country_code: purchase.countryCodeIOS || null,
        storefront_country_code: purchase.storefrontCountryCodeIOS || null,
        storefront_id: purchase.storefrontIdIOS || null,
        auto_renew_preference: purchase.renewalInfoIOS?.autoRenewPreference || null,
        price_increase_status: purchase.renewalInfoIOS?.priceIncreaseStatus || null,
        device_verification: purchase.deviceVerification || null,
        device_verification_nonce: purchase.deviceVerificationNonce || null,
        purchase_data: purchase,
      };

      console.log('[SupabaseAdapter] Upserting subscription:', {
        transaction_id: transactionId,
        product_id: subscriptionData.product_id,
        is_active: isActive,
      });

      // Try to update first, if it doesn't exist, insert
      const { data: existingSubscription } = await this.supabase
        .from('subscriptions')
        .select('id')
        .eq('transaction_id', transactionId)
        .single();

      if (existingSubscription) {
        // Update existing subscription
        const { error } = await this.supabase
          .from('subscriptions')
          .update(subscriptionData)
          .eq('transaction_id', transactionId);

        if (error) {
          console.error('[SupabaseAdapter] Error updating subscription:', error);
          return false;
        }

        console.log('[SupabaseAdapter] Subscription updated successfully');
      } else {
        // Insert new subscription
        const { error } = await this.supabase
          .from('subscriptions')
          .insert(subscriptionData);

        if (error) {
          console.error('[SupabaseAdapter] Error inserting subscription:', error);
          return false;
        }

        console.log('[SupabaseAdapter] Subscription inserted successfully');
      }

      return true;
    } catch (error) {
      console.error('[SupabaseAdapter] Error upserting subscription:', error);
      return false;
    }
  }

  async getActiveSubscription(deviceId: string): Promise<SubscriptionData | null> {
    try {
      const { data, error } = await this.supabase
        .from('subscriptions')
        .select('*')
        .eq('device_id', deviceId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No active subscription
        }
        console.error('[SupabaseAdapter] Error fetching active subscription:', error);
        return null;
      }

      return this.mapSubscriptionFromDb(data);
    } catch (error) {
      console.error('[SupabaseAdapter] Error getting active subscription:', error);
      return null;
    }
  }

  async getAllSubscriptions(deviceId: string): Promise<SubscriptionData[]> {
    try {
      const { data, error } = await this.supabase
        .from('subscriptions')
        .select('*')
        .eq('device_id', deviceId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[SupabaseAdapter] Error fetching subscriptions:', error);
        return [];
      }

      return (data || []).map((sub: any) => this.mapSubscriptionFromDb(sub));
    } catch (error) {
      console.error('[SupabaseAdapter] Error getting subscriptions:', error);
      return [];
    }
  }

  async markSubscriptionCancelled(transactionId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('subscriptions')
        .update({
          is_cancelled: true,
          is_active: false,
        })
        .eq('transaction_id', transactionId);

      if (error) {
        console.error('[SupabaseAdapter] Error marking subscription as cancelled:', error);
        return false;
      }

      console.log('[SupabaseAdapter] Subscription marked as cancelled');
      return true;
    } catch (error) {
      console.error('[SupabaseAdapter] Error marking subscription as cancelled:', error);
      return false;
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private mapUserFromDb(dbUser: any): UserData {
    return {
      deviceId: dbUser.device_id,
      subscriptionPlan: dbUser.subscription_plan,
      generationsLeft: dbUser.generations_left,
      createdAt: dbUser.created_at,
      lastRenewalAt: dbUser.last_renewal_at,
    };
  }

  private mapSubscriptionFromDb(dbSub: any): SubscriptionData {
    return {
      transactionId: dbSub.transaction_id,
      originalTransactionId: dbSub.original_transaction_id,
      productId: dbSub.product_id,
      transactionDate: new Date(dbSub.transaction_date),
      expirationDate: dbSub.expiration_date ? new Date(dbSub.expiration_date) : undefined,
      renewalDate: dbSub.renewal_date ? new Date(dbSub.renewal_date) : undefined,
      isActive: dbSub.is_active,
      isCancelled: dbSub.is_cancelled,
      isAutoRenewing: dbSub.is_auto_renewing,
      platform: dbSub.platform,
      environment: dbSub.environment,
      transactionReason: dbSub.transaction_reason,
      purchaseData: dbSub.purchase_data,
    };
  }
}

import { useEffect, useRef, useCallback } from 'react';
import { useIAP } from 'expo-iap';
import { Alert } from 'react-native';
import { useTokenContext } from '../context/TokenProvider';
import type { UseTokenSubscriptionReturn } from '../types';

/**
 * Hook for managing IAP subscriptions
 *
 * Handles:
 * - Connecting to the IAP store
 * - Processing purchases
 * - Detecting renewals
 * - Updating subscription status
 *
 * @example
 * ```tsx
 * function SubscribeButton() {
 *   const { connected, hasActiveSubscription, requestPurchase } = useTokenSubscription();
 *
 *   if (hasActiveSubscription) {
 *     return <Text>You're subscribed!</Text>;
 *   }
 *
 *   return (
 *     <Button
 *       title="Subscribe"
 *       onPress={requestPurchase}
 *       disabled={!connected}
 *     />
 *   );
 * }
 * ```
 */
export function useTokenSubscription(): UseTokenSubscriptionReturn {
  const {
    activeProductId,
    tokenManager,
    renewalService,
    subscriptionService,
    refreshUserData,
    setLocalIsSubscribed,
  } = useTokenContext();

  const processedTransactions = useRef<Set<string>>(new Set());

  const {
    connected,
    subscriptions,
    products,
    fetchProducts,
    getActiveSubscriptions,
    finishTransaction,
    requestPurchase: iapRequestPurchase,
  } = useIAP({
    onPurchaseSuccess: async (purchase: any) => {
      console.log('[useTokenSubscription] Purchase successful callback triggered:', purchase);

      const transactionId = purchase.transactionId || purchase.id;

      // Check if we've already processed this transaction
      if (processedTransactions.current.has(transactionId)) {
        console.log('[useTokenSubscription] Transaction already processed, skipping:', transactionId);
        return;
      }

      // Mark transaction as processed
      processedTransactions.current.add(transactionId);

      // Update local state immediately for responsive UI
      setLocalIsSubscribed(true);

      console.log('[useTokenSubscription] Purchase:', purchase);

      // Get renewal info
      const transactionReason = purchase.transactionReasonIOS || purchase.reasonIOS;
      const expirationDate = purchase.expirationDateIOS;
      const now = Date.now();

      console.log('[useTokenSubscription] Transaction ID:', transactionId);
      console.log('[useTokenSubscription] Transaction reason:', transactionReason);
      console.log('[useTokenSubscription] Expiration date:', expirationDate ? new Date(expirationDate).toISOString() : 'N/A');

      // Check if subscription is still active (not expired)
      const isActive = !expirationDate || expirationDate > now;
      console.log('[useTokenSubscription] Is subscription active:', isActive);

      if (!isActive) {
        console.log('[useTokenSubscription] Subscription expired, skipping update');
        await finishTransaction({ purchase, isConsumable: false });
        return;
      }

      // Save subscription data
      console.log('[useTokenSubscription] Saving subscription...');
      const subscriptionSaved = await subscriptionService.saveSubscription(purchase);
      if (subscriptionSaved) {
        console.log('[useTokenSubscription] ✓ Subscription saved');
      } else {
        console.error('[useTokenSubscription] ✗ Failed to save subscription');
      }

      // Only handle INITIAL PURCHASE here
      // Renewals are handled by checkAndHandleRenewal in the subscriptions monitoring
      if (transactionReason === 'PURCHASE' || transactionReason === 'purchase') {
        console.log('[useTokenSubscription] Initial purchase detected, activating subscription...');
        const updated = await tokenManager.activateSubscription('pro');
        console.log('[useTokenSubscription] Subscription activated:', updated);

        // Refresh user data
        await refreshUserData();
      } else {
        console.log('[useTokenSubscription] Not an initial purchase (reason:', transactionReason, ') - renewals handled by subscription monitoring');
      }

      // Finish the transaction to prevent it from being called again
      try {
        await finishTransaction({ purchase, isConsumable: false });
        console.log('[useTokenSubscription] Transaction finished:', transactionId);
      } catch (error) {
        console.error('[useTokenSubscription] Error finishing transaction:', error);
      }
    },
    onPurchaseError: (error: any) => {
      console.error('[useTokenSubscription] Purchase error:', error);
      // Don't show alert for user cancellation
      if (error.code !== 'E_USER_CANCELLED') {
        Alert.alert('Purchase Failed', error.message || 'An error occurred during purchase');
      }
    },
  });

  console.log('[useTokenSubscription] IAP Connection status:', connected);
  console.log('[useTokenSubscription] Active subscriptions:', subscriptions);

  // Check if user has active subscription using subscriptions array
  const subscriptionSkus = subscriptions?.map((sub: any) => sub.productId) || [];
  const hasActiveSubscription = subscriptionSkus.includes(activeProductId);
  console.log('[useTokenSubscription] Has active subscription:', hasActiveSubscription);

  // Request a purchase
  const requestPurchase = useCallback(async () => {
    if (!connected) {
      Alert.alert('Store Not Ready', 'Store connection not ready. Please try again.');
      return;
    }

    if (!iapRequestPurchase) {
      Alert.alert('Error', 'Purchase functionality not available. Please restart the app.');
      return;
    }

    try {
      console.log('[useTokenSubscription] Requesting purchase for:', activeProductId);
      await iapRequestPurchase({
        type: 'subs',
        request: {
          ios: {
            sku: activeProductId,
          },
        },
      });
    } catch (error: any) {
      console.error('[useTokenSubscription] Purchase failed:', error);
      if (error.code !== 'E_USER_CANCELLED') {
        Alert.alert('Purchase Failed', error.message || 'Please try again.');
      }
    }
  }, [connected, iapRequestPurchase, activeProductId]);

  // Restore purchases
  const restorePurchases = useCallback(async () => {
    try {
      console.log('[useTokenSubscription] Restoring purchases...');
      const result = await getActiveSubscriptions();
      console.log('[useTokenSubscription] Restored subscriptions:', result);

      const activeSubscriptions = Array.isArray(result) ? result : [];
      const hasProSubscription = activeSubscriptions.some(
        (sub: any) => sub.productId === activeProductId
      );

      setLocalIsSubscribed(hasProSubscription);

      if (hasProSubscription) {
        Alert.alert('Success', 'Your subscription has been restored!');
        await refreshUserData();
      } else {
        Alert.alert('No Subscription Found', 'No active subscription was found to restore.');
      }
    } catch (error) {
      console.error('[useTokenSubscription] Error restoring purchases:', error);
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    }
  }, [getActiveSubscriptions, activeProductId, setLocalIsSubscribed, refreshUserData]);

  // Fetch products when connected
  useEffect(() => {
    if (connected) {
      console.log('[useTokenSubscription] Fetching products...');
      fetchProducts({ skus: [activeProductId], type: 'subs' })
        .then(() => {
          console.log('[useTokenSubscription] Products fetched successfully');
          // Check for active subscriptions on app load
          getActiveSubscriptions()
            .then((result) => {
              const activeSubscriptions = Array.isArray(result) ? result : [];
              const hasProSubscription = activeSubscriptions.some(
                (sub: any) => sub.productId === activeProductId
              );
              setLocalIsSubscribed(hasProSubscription);
              console.log('[useTokenSubscription] Subscription status:', hasProSubscription);
            })
            .catch((error: any) => {
              console.error('[useTokenSubscription] Error checking subscription status:', error);
            });
        })
        .catch((error: any) => {
          console.error('[useTokenSubscription] Error fetching products:', error);
        });
    }
  }, [connected, activeProductId, fetchProducts, getActiveSubscriptions, setLocalIsSubscribed]);

  // Monitor subscriptions changes and check for renewals
  useEffect(() => {
    console.log('[useTokenSubscription] Subscriptions changed:', subscriptions);

    if (subscriptions && subscriptions.length > 0) {
      const subscriptionSkus = subscriptions.map((sub: any) => sub.productId);
      const isSub = subscriptionSkus.includes(activeProductId);

      console.log('[useTokenSubscription] Subscription SKUs:', subscriptionSkus);
      console.log('[useTokenSubscription] Has Pro subscription:', isSub);

      setLocalIsSubscribed(isSub);

      // Check for renewal on the active pro subscription
      const proSubscription = subscriptions.find((sub: any) => sub.productId === activeProductId);
      if (proSubscription) {
        console.log('[useTokenSubscription] Active Pro subscription found, checking if renewal needed...');
        renewalService.checkAndHandleRenewal(proSubscription).then((renewed) => {
          if (renewed) {
            refreshUserData();
          }
        });
      }
    } else {
      // No subscriptions found
      console.log('[useTokenSubscription] No active subscriptions found');
      setLocalIsSubscribed(false);
    }
  }, [subscriptions, activeProductId, setLocalIsSubscribed, renewalService, refreshUserData]);

  return {
    connected,
    subscriptions: subscriptions || [],
    hasActiveSubscription,
    requestPurchase,
    restorePurchases,
    products: products || [],
  };
}

import { useState, useCallback, useEffect } from 'react';
import { useTokenContext } from '../context/TokenProvider';
import type { UseSubscriptionModalReturn } from '../types';

// Try to import MMKV, but make it optional
let MMKV: any = null;
try {
  // This will be available if react-native-mmkv is installed
  const mmkvModule = require('react-native-mmkv');
  MMKV = mmkvModule.MMKV;
} catch {
  // MMKV not available, will use in-memory state
  console.log('[useSubscriptionModal] react-native-mmkv not available, using in-memory state');
}

const HAS_SEEN_MODAL_KEY = 'iap_token_has_seen_subscription_modal';

// In-memory fallback for hasSeenModal
let inMemoryHasSeenModal = false;

/**
 * Get storage instance (MMKV if available, otherwise in-memory)
 */
function getStorage() {
  if (MMKV) {
    try {
      return new MMKV({ id: 'iap-token-subscription' });
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Hook for managing the subscription modal visibility
 *
 * Provides:
 * - Modal visibility state
 * - Functions to show/hide modal
 * - Smart show logic based on user state
 * - Persistence of "has seen" state
 *
 * @example
 * ```tsx
 * function App() {
 *   const {
 *     isVisible,
 *     showModal,
 *     hideModal,
 *     showModalIfNeeded
 *   } = useSubscriptionModal();
 *
 *   // Show modal when user runs out of generations
 *   const handleGenerate = async () => {
 *     const check = await canGenerate();
 *     if (!check.canGenerate && check.needsSubscription) {
 *       showModal();
 *       return;
 *     }
 *     // Continue with generation...
 *   };
 *
 *   return (
 *     <>
 *       <YourContent />
 *       <SubscriptionModal
 *         visible={isVisible}
 *         onClose={hideModal}
 *       />
 *     </>
 *   );
 * }
 * ```
 *
 * @example Expo Router Integration
 * ```tsx
 * // In app/_layout.tsx
 * import { useSubscriptionModal, SubscriptionModal } from 'expo-iap-ai-token-subscription';
 *
 * export default function RootLayout() {
 *   const { isVisible, hideModal } = useSubscriptionModal();
 *
 *   return (
 *     <>
 *       <Stack />
 *       <SubscriptionModal visible={isVisible} onClose={hideModal} />
 *     </>
 *   );
 * }
 *
 * // In your screen
 * import { useSubscriptionModal, useGenerations } from 'expo-iap-ai-token-subscription';
 *
 * function CameraScreen() {
 *   const { canGenerate, needsSubscription } = useGenerations();
 *   const { showModal } = useSubscriptionModal();
 *
 *   const handleCapture = () => {
 *     if (!canGenerate && needsSubscription) {
 *       showModal();
 *       return;
 *     }
 *     // Process image...
 *   };
 * }
 * ```
 */
export function useSubscriptionModal(): UseSubscriptionModalReturn {
  const { tokenManager, isSubscribed } = useTokenContext();
  const [isVisible, setIsVisible] = useState(false);
  const [hasSeenModal, setHasSeenModal] = useState(false);

  // Load hasSeenModal from storage on mount
  useEffect(() => {
    const storage = getStorage();
    if (storage) {
      try {
        const seen = storage.getBoolean(HAS_SEEN_MODAL_KEY);
        setHasSeenModal(seen ?? false);
      } catch {
        setHasSeenModal(inMemoryHasSeenModal);
      }
    } else {
      setHasSeenModal(inMemoryHasSeenModal);
    }
  }, []);

  /**
   * Show the subscription modal
   */
  const showModal = useCallback(() => {
    setIsVisible(true);
  }, []);

  /**
   * Hide the subscription modal
   */
  const hideModal = useCallback(() => {
    setIsVisible(false);
  }, []);

  /**
   * Mark modal as seen (persists to storage)
   */
  const markModalAsSeen = useCallback(() => {
    setHasSeenModal(true);
    inMemoryHasSeenModal = true;

    const storage = getStorage();
    if (storage) {
      try {
        storage.set(HAS_SEEN_MODAL_KEY, true);
      } catch (error) {
        console.error('[useSubscriptionModal] Error saving hasSeenModal:', error);
      }
    }
  }, []);

  /**
   * Show modal only if user needs to subscribe
   *
   * Returns true if modal was shown
   */
  const showModalIfNeeded = useCallback(async (): Promise<boolean> => {
    // Don't show if already subscribed
    if (isSubscribed) {
      return false;
    }

    // Check if user can generate
    const check = await tokenManager.canGenerate();

    if (!check.canGenerate && check.needsSubscription) {
      showModal();
      return true;
    }

    return false;
  }, [isSubscribed, tokenManager, showModal]);

  return {
    isVisible,
    showModal,
    hideModal,
    showModalIfNeeded,
    hasSeenModal,
    markModalAsSeen,
  };
}

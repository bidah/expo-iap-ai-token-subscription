import { useState, useCallback, useEffect } from 'react';
import { useTokenContext } from '../context/TokenProvider';
import type { UseGenerationsReturn } from '../types';

/**
 * Hook for managing generation counts
 *
 * Provides:
 * - Current generation count
 * - Subscription status
 * - Ability to use generations
 * - Whether user can generate or needs to subscribe
 *
 * @example
 * ```tsx
 * function GenerateButton() {
 *   const {
 *     generationsLeft,
 *     canGenerate,
 *     needsSubscription,
 *     useGeneration
 *   } = useGenerations();
 *
 *   const handleGenerate = async () => {
 *     if (!canGenerate) {
 *       if (needsSubscription) {
 *         // Show subscription modal
 *       } else {
 *         // Show "out of monthly generations" message
 *       }
 *       return;
 *     }
 *
 *     // Do your generation work here...
 *
 *     // Then decrement the count
 *     await useGeneration();
 *   };
 *
 *   return (
 *     <View>
 *       <Text>Generations left: {generationsLeft}</Text>
 *       <Button title="Generate" onPress={handleGenerate} />
 *     </View>
 *   );
 * }
 * ```
 */
export function useGenerations(): UseGenerationsReturn {
  const {
    isInitialized,
    userData,
    isSubscribed,
    generationsLeft: contextGenerationsLeft,
    tokenManager,
    refreshUserData,
  } = useTokenContext();

  const [isLoading, setIsLoading] = useState(false);
  const [localGenerationsLeft, setLocalGenerationsLeft] = useState(contextGenerationsLeft);

  // Sync local state with context
  useEffect(() => {
    setLocalGenerationsLeft(contextGenerationsLeft);
  }, [contextGenerationsLeft]);

  // Computed values
  const canGenerate = localGenerationsLeft > 0;
  const needsSubscription = !isSubscribed && localGenerationsLeft <= 0;

  /**
   * Use one generation (decrement count)
   */
  const useGeneration = useCallback(async (): Promise<boolean> => {
    if (localGenerationsLeft <= 0) {
      console.log('[useGenerations] No generations left');
      return false;
    }

    setIsLoading(true);

    try {
      // Optimistically update local state for responsive UI
      setLocalGenerationsLeft((prev) => Math.max(0, prev - 1));

      const success = await tokenManager.useGeneration();

      if (!success) {
        // Revert on failure
        setLocalGenerationsLeft(localGenerationsLeft);
        console.error('[useGenerations] Failed to use generation');
        return false;
      }

      // Refresh from database to ensure sync
      await refreshUserData();
      return true;
    } catch (error) {
      console.error('[useGenerations] Error using generation:', error);
      // Revert on error
      setLocalGenerationsLeft(localGenerationsLeft);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [localGenerationsLeft, tokenManager, refreshUserData]);

  /**
   * Refresh generations from database
   */
  const refreshGenerations = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      await refreshUserData();
    } finally {
      setIsLoading(false);
    }
  }, [refreshUserData]);

  return {
    generationsLeft: localGenerationsLeft,
    isSubscribed,
    canGenerate,
    needsSubscription,
    useGeneration,
    refreshGenerations,
    isLoading: isLoading || !isInitialized,
  };
}

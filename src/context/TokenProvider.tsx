import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import type { StorageAdapter } from '../adapters/StorageAdapter';
import type { TokenConfig, UserData } from '../types';
import { createConfig, validateConfig, getActiveProductId } from '../config/TokenConfig';
import { TokenManager } from '../services/TokenManager';
import { RenewalService } from '../services/RenewalService';
import { SubscriptionService } from '../services/SubscriptionService';

/**
 * Context value provided by TokenProvider
 */
export interface TokenContextValue {
  /**
   * Whether the provider has been initialized
   */
  isInitialized: boolean;

  /**
   * Current user data (null if not loaded)
   */
  userData: UserData | null;

  /**
   * The library configuration
   */
  config: TokenConfig;

  /**
   * Active product ID (handles dev vs prod)
   */
  activeProductId: string;

  /**
   * The storage adapter instance
   */
  adapter: StorageAdapter;

  /**
   * Token manager instance for generation operations
   */
  tokenManager: TokenManager;

  /**
   * Renewal service instance
   */
  renewalService: RenewalService;

  /**
   * Subscription service instance
   */
  subscriptionService: SubscriptionService;

  /**
   * Whether user is currently subscribed
   */
  isSubscribed: boolean;

  /**
   * Number of generations remaining
   */
  generationsLeft: number;

  /**
   * Refresh user data from the database
   */
  refreshUserData: () => Promise<void>;

  /**
   * Local subscription state (for UI updates before DB sync)
   */
  localIsSubscribed: boolean;

  /**
   * Set local subscription state
   */
  setLocalIsSubscribed: (value: boolean) => void;
}

const TokenContext = createContext<TokenContextValue | null>(null);

/**
 * Props for TokenProvider component
 */
export interface TokenProviderProps {
  /**
   * Storage adapter instance (SupabaseAdapter, InMemoryAdapter, or custom)
   */
  adapter: StorageAdapter;

  /**
   * Library configuration
   */
  config: Partial<TokenConfig> & Pick<TokenConfig, 'productId'>;

  /**
   * Children components
   */
  children: React.ReactNode;
}

/**
 * TokenProvider - Main provider component for the library
 *
 * Wrap your app with this provider to enable subscription and generation features.
 *
 * @example
 * ```tsx
 * import { TokenProvider, SupabaseAdapter } from 'expo-iap-ai-token-subscription';
 *
 * const adapter = new SupabaseAdapter(supabase);
 *
 * export default function App() {
 *   return (
 *     <TokenProvider
 *       adapter={adapter}
 *       config={{
 *         productId: 'PRO_PROD',
 *         productIdDev: 'pro',
 *         freeTierLimit: 5,
 *         proTierLimit: 100,
 *         resetPeriod: 'monthly',
 *       }}
 *     >
 *       <YourApp />
 *     </TokenProvider>
 *   );
 * }
 * ```
 */
export function TokenProvider({ adapter, config: userConfig, children }: TokenProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [localIsSubscribed, setLocalIsSubscribed] = useState(false);

  // Create full config with defaults
  const config = useMemo(() => {
    const fullConfig = createConfig(userConfig);
    validateConfig(fullConfig);
    return fullConfig;
  }, [userConfig]);

  // Get active product ID based on environment
  const activeProductId = useMemo(() => getActiveProductId(config), [config]);

  // Create service instances
  const tokenManager = useMemo(
    () => new TokenManager(adapter, config),
    [adapter, config]
  );

  const renewalService = useMemo(
    () => new RenewalService(adapter, config),
    [adapter, config]
  );

  const subscriptionService = useMemo(
    () => new SubscriptionService(adapter, config),
    [adapter, config]
  );

  // Computed values
  const isSubscribed = useMemo(() => {
    return userData?.subscriptionPlan !== null && userData?.subscriptionPlan !== '';
  }, [userData]);

  const generationsLeft = useMemo(() => {
    return userData?.generationsLeft ?? 0;
  }, [userData]);

  // Refresh user data from database
  const refreshUserData = useCallback(async () => {
    try {
      const data = await tokenManager.getUserData();
      setUserData(data);

      if (data) {
        setLocalIsSubscribed(data.subscriptionPlan !== null && data.subscriptionPlan !== '');
      }
    } catch (error) {
      console.error('[TokenProvider] Error refreshing user data:', error);
    }
  }, [tokenManager]);

  // Initialize on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        console.log('[TokenProvider] Initializing...');

        // Initialize user in database
        const user = await tokenManager.initializeUser();
        setUserData(user);

        if (user) {
          setLocalIsSubscribed(user.subscriptionPlan !== null && user.subscriptionPlan !== '');
          console.log('[TokenProvider] User initialized:', {
            deviceId: user.deviceId,
            subscriptionPlan: user.subscriptionPlan,
            generationsLeft: user.generationsLeft,
          });
        }

        setIsInitialized(true);
        console.log('[TokenProvider] Initialization complete');
      } catch (error) {
        console.error('[TokenProvider] Initialization error:', error);
        setIsInitialized(true); // Still mark as initialized to prevent infinite loading
      }
    };

    initialize();
  }, [tokenManager]);

  const contextValue: TokenContextValue = useMemo(
    () => ({
      isInitialized,
      userData,
      config,
      activeProductId,
      adapter,
      tokenManager,
      renewalService,
      subscriptionService,
      isSubscribed,
      generationsLeft,
      refreshUserData,
      localIsSubscribed,
      setLocalIsSubscribed,
    }),
    [
      isInitialized,
      userData,
      config,
      activeProductId,
      adapter,
      tokenManager,
      renewalService,
      subscriptionService,
      isSubscribed,
      generationsLeft,
      refreshUserData,
      localIsSubscribed,
    ]
  );

  return (
    <TokenContext.Provider value={contextValue}>
      {children}
    </TokenContext.Provider>
  );
}

/**
 * Hook to access the token context
 *
 * Must be used within a TokenProvider
 *
 * @throws Error if used outside of TokenProvider
 */
export function useTokenContext(): TokenContextValue {
  const context = useContext(TokenContext);

  if (!context) {
    throw new Error(
      '[expo-iap-ai-token-subscription] useTokenContext must be used within a TokenProvider. ' +
      'Make sure your app is wrapped with <TokenProvider>.'
    );
  }

  return context;
}

/**
 * expo-iap-ai-token-subscription
 *
 * A database-agnostic IAP subscription and AI token/generation management
 * library for Expo React Native apps.
 *
 * @packageDocumentation
 */

// ============================================================================
// Provider & Context
// ============================================================================
export { TokenProvider, useTokenContext } from './context';
export type { TokenProviderProps, TokenContextValue } from './context';

// ============================================================================
// Hooks
// ============================================================================
export { useTokenSubscription } from './hooks/useTokenSubscription';
export { useGenerations } from './hooks/useGenerations';
export { useSubscriptionModal } from './hooks/useSubscriptionModal';

// ============================================================================
// Adapters
// ============================================================================
export type { StorageAdapter } from './adapters/StorageAdapter';
export { SupabaseAdapter } from './adapters/SupabaseAdapter';
export { InMemoryAdapter } from './adapters/InMemoryAdapter';

// ============================================================================
// Services (for advanced usage)
// ============================================================================
export { TokenManager } from './services/TokenManager';
export { RenewalService } from './services/RenewalService';
export { SubscriptionService } from './services/SubscriptionService';

// ============================================================================
// Components
// ============================================================================
export { SubscriptionModal } from './components/SubscriptionModal';

// ============================================================================
// Configuration
// ============================================================================
export { DEFAULT_CONFIG, createConfig, getActiveProductId, validateConfig } from './config';

// ============================================================================
// Types
// ============================================================================
export type {
  TokenConfig,
  UserData,
  SubscriptionData,
  UseTokenSubscriptionReturn,
  UseGenerationsReturn,
  UseSubscriptionModalReturn,
  GenerationCheckResult,
  SubscriptionFeature,
  SubscriptionModalProps,
  TestRenewalResult,
} from './types';

// ============================================================================
// Utilities
// ============================================================================
export {
  getDeviceId,
  getDeviceInfo,
} from './utils/deviceId';

export {
  getCurrentDate,
  getCurrentTimestamp,
  setMockDate,
  clearMockDate,
  setMockDateToEndOfMonth,
  isExpired,
  isFuture,
  daysUntil,
  daysSince,
  addDays,
  addMonths,
  formatDate,
  formatDateTime,
} from './utils/dateUtils';

export {
  testRenewalFlow,
  createMockPurchase,
  createMockRenewalPurchase,
  createMockSubscriptionData,
  clearTestState,
  logTestState,
  setTestRenewalLogic,
  getCurrentDateForTesting,
} from './utils/testUtils';

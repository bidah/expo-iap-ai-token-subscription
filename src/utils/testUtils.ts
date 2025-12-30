import type { TestRenewalResult, SubscriptionData } from '../types';
import { setMockDate, clearMockDate, setMockDateToEndOfMonth, getCurrentDate } from './dateUtils';

/**
 * Test utilities for development and testing
 *
 * These utilities help test subscription flows without making real purchases.
 * Only use in development/testing environments.
 */

// Store reference to renewal test function
let testRenewalLogic: (() => Promise<TestRenewalResult>) | null = null;

/**
 * Register a test renewal function (called by useTokenSubscription internally)
 */
export function setTestRenewalLogic(fn: () => Promise<TestRenewalResult>): void {
  testRenewalLogic = fn;
  console.log('[testUtils] Test renewal logic registered');
}

/**
 * Test the renewal flow manually
 *
 * This triggers the renewal logic as if Apple processed a renewal payment.
 *
 * @example
 * ```tsx
 * // In a dev settings screen
 * const handleTestRenewal = async () => {
 *   const result = await testRenewalFlow();
 *   Alert.alert(result.success ? 'Success' : 'Failed', result.message);
 * };
 * ```
 */
export async function testRenewalFlow(): Promise<TestRenewalResult> {
  if (!testRenewalLogic) {
    return {
      success: false,
      message: 'Test renewal logic not registered. Make sure useTokenSubscription is mounted.',
    };
  }

  try {
    console.log('[testUtils] Triggering test renewal...');
    return await testRenewalLogic();
  } catch (error) {
    console.error('[testUtils] Test renewal error:', error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Create a mock purchase object for testing
 *
 * @param overrides - Override specific fields
 */
export function createMockPurchase(overrides: Partial<any> = {}): any {
  const now = Date.now();
  const monthFromNow = now + 30 * 24 * 60 * 60 * 1000;

  return {
    productId: 'pro',
    transactionId: `mock-tx-${now}`,
    transactionDate: now,
    transactionReasonIOS: 'PURCHASE',
    originalTransactionIdentifierIOS: `mock-original-${now}`,
    expirationDateIOS: monthFromNow,
    environmentIOS: 'Sandbox',
    isAutoRenewing: true,
    renewalInfoIOS: {
      willAutoRenew: true,
      renewalDate: monthFromNow,
    },
    ...overrides,
  };
}

/**
 * Create a mock renewal purchase for testing
 *
 * @param originalTransactionId - The original transaction ID to link to
 * @param overrides - Override specific fields
 */
export function createMockRenewalPurchase(
  originalTransactionId: string,
  overrides: Partial<any> = {}
): any {
  const now = Date.now();
  const monthFromNow = now + 30 * 24 * 60 * 60 * 1000;

  return {
    productId: 'pro',
    transactionId: `mock-renewal-tx-${now}`,
    transactionDate: now,
    transactionReasonIOS: 'RENEWAL',
    originalTransactionIdentifierIOS: originalTransactionId,
    expirationDateIOS: monthFromNow,
    environmentIOS: 'Sandbox',
    isAutoRenewing: true,
    renewalInfoIOS: {
      willAutoRenew: true,
      renewalDate: monthFromNow,
    },
    ...overrides,
  };
}

/**
 * Create mock subscription data for testing
 */
export function createMockSubscriptionData(overrides: Partial<SubscriptionData> = {}): SubscriptionData {
  const now = new Date();
  const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  return {
    transactionId: `mock-tx-${Date.now()}`,
    originalTransactionId: `mock-original-${Date.now()}`,
    productId: 'pro',
    transactionDate: now,
    expirationDate: monthFromNow,
    renewalDate: monthFromNow,
    isActive: true,
    isCancelled: false,
    isAutoRenewing: true,
    platform: 'ios',
    environment: 'Sandbox',
    transactionReason: 'PURCHASE',
    ...overrides,
  };
}

// Re-export date utilities for convenience
export {
  setMockDate,
  clearMockDate,
  setMockDateToEndOfMonth,
  getCurrentDate as getCurrentDateForTesting,
};

/**
 * Clear all test state
 */
export function clearTestState(): void {
  clearMockDate();
  testRenewalLogic = null;
  console.log('[testUtils] Test state cleared');
}

/**
 * Log current test state for debugging
 */
export function logTestState(): void {
  console.log('[testUtils] Current test state:');
  console.log('  Mock date:', getCurrentDate().toISOString());
  console.log('  Renewal logic registered:', testRenewalLogic !== null);
}

import type { TokenConfig } from '../types';

/**
 * Default configuration values for the token subscription system
 */
export const DEFAULT_CONFIG: Partial<TokenConfig> = {
  freeTierLimit: 5,
  proTierLimit: 100,
  resetPeriod: 'monthly',
  enableRenewalDetection: true,
  enableDevTools: typeof __DEV__ !== 'undefined' ? __DEV__ : false,
};

/**
 * Create a complete configuration by merging user config with defaults
 */
export function createConfig(userConfig: Partial<TokenConfig> & Pick<TokenConfig, 'productId'>): TokenConfig {
  return {
    ...DEFAULT_CONFIG,
    ...userConfig,
    // Ensure required fields are present
    productId: userConfig.productId,
    freeTierLimit: userConfig.freeTierLimit ?? DEFAULT_CONFIG.freeTierLimit!,
    proTierLimit: userConfig.proTierLimit ?? DEFAULT_CONFIG.proTierLimit!,
    resetPeriod: userConfig.resetPeriod ?? DEFAULT_CONFIG.resetPeriod!,
  };
}

/**
 * Get the active product ID based on environment
 */
export function getActiveProductId(config: TokenConfig): string {
  const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : false;
  return isDev && config.productIdDev ? config.productIdDev : config.productId;
}

/**
 * Validate configuration and throw errors for invalid values
 */
export function validateConfig(config: TokenConfig): void {
  if (!config.productId) {
    throw new Error('[expo-iap-ai-token-subscription] productId is required in config');
  }

  if (config.freeTierLimit < 0) {
    throw new Error('[expo-iap-ai-token-subscription] freeTierLimit must be >= 0');
  }

  if (config.proTierLimit < 0) {
    throw new Error('[expo-iap-ai-token-subscription] proTierLimit must be >= 0');
  }

  const validResetPeriods = ['monthly', 'weekly', 'daily'];
  if (!validResetPeriods.includes(config.resetPeriod)) {
    throw new Error(`[expo-iap-ai-token-subscription] resetPeriod must be one of: ${validResetPeriods.join(', ')}`);
  }
}

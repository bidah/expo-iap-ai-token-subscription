/**
 * Core types for expo-iap-ai-token-subscription library
 */

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Main configuration for the token subscription system
 */
export interface TokenConfig {
  /**
   * IAP product ID for production
   * e.g., 'PRO_PROD' or 'com.yourapp.pro'
   */
  productId: string;

  /**
   * Optional IAP product ID for development/sandbox
   * Falls back to productId if not provided
   */
  productIdDev?: string;

  /**
   * Apple App ID for restore purchases link (optional)
   */
  appleAppId?: string;

  /**
   * Number of free generations for non-subscribers
   * @default 5
   */
  freeTierLimit: number;

  /**
   * Number of generations per period for subscribers
   * @default 100
   */
  proTierLimit: number;

  /**
   * How often generations reset for subscribers
   * @default 'monthly'
   */
  resetPeriod: 'monthly' | 'weekly' | 'daily';

  /**
   * Enable automatic renewal detection from IAP
   * @default true
   */
  enableRenewalDetection?: boolean;

  /**
   * Enable development/testing tools
   * @default __DEV__
   */
  enableDevTools?: boolean;

  /**
   * Callback when subscription is activated
   */
  onSubscriptionActivated?: () => void;

  /**
   * Callback when a generation is used
   * @param remaining - Number of generations remaining
   */
  onGenerationUsed?: (remaining: number) => void;

  /**
   * Callback when generation limit is reached
   * @param needsSubscription - True if user needs to subscribe, false if subscribed but out of monthly limit
   */
  onLimitReached?: (needsSubscription: boolean) => void;
}

// ============================================================================
// User & Subscription Data Types
// ============================================================================

/**
 * User data stored in the database
 */
export interface UserData {
  /**
   * Unique device identifier
   */
  deviceId: string;

  /**
   * Current subscription plan (e.g., 'pro') or null if free user
   */
  subscriptionPlan: string | null;

  /**
   * Number of generations remaining
   */
  generationsLeft: number;

  /**
   * When the user was created
   */
  createdAt: string;

  /**
   * Last time subscription was renewed (generations reset)
   */
  lastRenewalAt: string | null;
}

/**
 * Subscription transaction data
 */
export interface SubscriptionData {
  /**
   * Unique transaction ID from the app store
   */
  transactionId: string;

  /**
   * Original transaction ID (for renewal tracking)
   */
  originalTransactionId?: string;

  /**
   * Product ID that was purchased
   */
  productId: string;

  /**
   * When the transaction occurred
   */
  transactionDate: Date;

  /**
   * When the subscription expires
   */
  expirationDate?: Date;

  /**
   * Next renewal date
   */
  renewalDate?: Date;

  /**
   * Whether the subscription is currently active
   */
  isActive: boolean;

  /**
   * Whether the subscription was cancelled
   */
  isCancelled: boolean;

  /**
   * Whether the subscription will auto-renew
   */
  isAutoRenewing?: boolean;

  /**
   * Platform (ios/android)
   */
  platform?: string;

  /**
   * Environment (Sandbox/Production)
   */
  environment?: string;

  /**
   * Transaction reason (PURCHASE, RENEWAL, etc.)
   */
  transactionReason?: string;

  /**
   * Raw purchase data from the app store
   */
  purchaseData?: any;
}

// ============================================================================
// Hook Return Types
// ============================================================================

/**
 * Return type for useTokenSubscription hook
 */
export interface UseTokenSubscriptionReturn {
  /**
   * Whether the IAP store is connected
   */
  connected: boolean;

  /**
   * List of active subscriptions from the store
   */
  subscriptions: any[];

  /**
   * Whether user has an active subscription
   */
  hasActiveSubscription: boolean;

  /**
   * Request a purchase for the subscription
   */
  requestPurchase: () => Promise<void>;

  /**
   * Restore previous purchases
   */
  restorePurchases: () => Promise<void>;

  /**
   * Available products from the store
   */
  products: any[];
}

/**
 * Return type for useGenerations hook
 */
export interface UseGenerationsReturn {
  /**
   * Number of generations remaining
   */
  generationsLeft: number;

  /**
   * Whether user has an active subscription
   */
  isSubscribed: boolean;

  /**
   * Whether user can generate (has generations left)
   */
  canGenerate: boolean;

  /**
   * Whether user needs to subscribe (free tier exhausted)
   */
  needsSubscription: boolean;

  /**
   * Use one generation (decrements count)
   * @returns true if successful
   */
  useGeneration: () => Promise<boolean>;

  /**
   * Refresh generation data from the database
   */
  refreshGenerations: () => Promise<void>;

  /**
   * Loading state
   */
  isLoading: boolean;
}

/**
 * Return type for useSubscriptionModal hook
 */
export interface UseSubscriptionModalReturn {
  /**
   * Whether the modal is currently visible
   */
  isVisible: boolean;

  /**
   * Show the subscription modal
   */
  showModal: () => void;

  /**
   * Hide the subscription modal
   */
  hideModal: () => void;

  /**
   * Show modal only if user needs to subscribe (free tier exhausted)
   * @returns true if modal was shown
   */
  showModalIfNeeded: () => Promise<boolean>;

  /**
   * Whether user has seen the subscription modal before
   */
  hasSeenModal: boolean;

  /**
   * Mark modal as seen
   */
  markModalAsSeen: () => void;
}

// ============================================================================
// Generation Check Result
// ============================================================================

/**
 * Result from checking if user can generate
 */
export interface GenerationCheckResult {
  /**
   * Whether user can generate
   */
  canGenerate: boolean;

  /**
   * Number of generations remaining
   */
  generationsLeft: number;

  /**
   * Whether user needs to subscribe to continue
   */
  needsSubscription: boolean;
}

// ============================================================================
// Subscription Modal Props
// ============================================================================

/**
 * Feature item for the subscription modal
 */
export interface SubscriptionFeature {
  /**
   * Icon name (Ionicons)
   */
  icon: string;

  /**
   * Feature title
   */
  title: string;

  /**
   * Feature description
   */
  description: string;
}

/**
 * Props for the SubscriptionModal component
 */
export interface SubscriptionModalProps {
  /**
   * Whether the modal is visible
   */
  visible: boolean;

  /**
   * Callback when modal is closed
   */
  onClose: () => void;

  /**
   * Custom title (default: "Go Pro")
   */
  title?: string;

  /**
   * Custom subtitle
   */
  subtitle?: string;

  /**
   * List of features to display
   */
  features?: SubscriptionFeature[];

  /**
   * Price to display (e.g., "$9.99")
   */
  price?: string;

  /**
   * Price period (e.g., "per month")
   */
  pricePeriod?: string;

  /**
   * Subscribe button text
   */
  subscribeButtonText?: string;

  /**
   * Privacy policy URL
   */
  privacyPolicyUrl?: string;

  /**
   * Terms of use URL
   */
  termsOfUseUrl?: string;

  /**
   * Theme colors
   */
  theme?: {
    backgroundColor?: string;
    primaryColor?: string;
    textColor?: string;
    secondaryTextColor?: string;
  };
}

// ============================================================================
// Test Utilities Types
// ============================================================================

/**
 * Result from test renewal operation
 */
export interface TestRenewalResult {
  success: boolean;
  message: string;
  generationsReset?: boolean;
}

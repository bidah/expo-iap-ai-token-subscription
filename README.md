# expo-iap-ai-token-subscription

A database-agnostic IAP subscription and AI token/generation management library for Expo React Native apps.

## Features

- **Database-agnostic**: Bring your own backend (Supabase, Firebase, custom API)
- **Configurable tiers**: Set free tier limits, pro tier limits, and reset periods
- **Built on expo-iap**: Handles purchases, renewals, and restore purchases
- **React hooks**: Easy-to-use hooks for subscriptions, generations, and modals
- **Optional UI**: Includes customizable SubscriptionModal component
- **Testing utilities**: Mock purchases and renewals for development

## Installation

```bash
# Using bun
bun add expo-iap-ai-token-subscription

# Or using npm
npm install expo-iap-ai-token-subscription
```

### Peer Dependencies

```bash
bun add expo-iap expo-device react react-native
```

### Optional Dependencies

```bash
# For Supabase adapter
bun add @supabase/supabase-js

# For persistent modal state
bun add react-native-mmkv
```

## Quick Start

### 1. Set Up Provider

Wrap your app with `TokenProvider`:

```tsx
// app/_layout.tsx
import { TokenProvider, SupabaseAdapter } from 'expo-iap-ai-token-subscription';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const adapter = new SupabaseAdapter(supabase);

export default function RootLayout() {
  return (
    <TokenProvider
      adapter={adapter}
      config={{
        productId: 'PRO_PROD',
        productIdDev: 'pro',
        freeTierLimit: 5,
        proTierLimit: 100,
        resetPeriod: 'monthly',
        onLimitReached: (needsSubscription) => {
          console.log('Limit reached, needs subscription:', needsSubscription);
        },
      }}
    >
      <Stack />
    </TokenProvider>
  );
}
```

### 2. Use Hooks

```tsx
import {
  useGenerations,
  useSubscriptionModal,
  SubscriptionModal
} from 'expo-iap-ai-token-subscription';

function CameraScreen() {
  const { generationsLeft, canGenerate, needsSubscription, useGeneration } = useGenerations();
  const { isVisible, showModal, hideModal } = useSubscriptionModal();

  const handleCapture = async () => {
    if (!canGenerate) {
      if (needsSubscription) {
        showModal();
      } else {
        Alert.alert('Monthly Limit', 'You have used all generations this month.');
      }
      return;
    }

    // Process your image...
    await processImage();

    // Decrement generation count
    await useGeneration();
  };

  return (
    <View>
      <Text>Generations left: {generationsLeft}</Text>
      <Button title="Capture" onPress={handleCapture} />

      <SubscriptionModal
        visible={isVisible}
        onClose={hideModal}
        title="Go Pro"
        price="$9.99"
      />
    </View>
  );
}
```

## Configuration

```typescript
interface TokenConfig {
  // Required
  productId: string;           // Production IAP product ID

  // Optional
  productIdDev?: string;       // Development/sandbox product ID
  appleAppId?: string;         // For restore purchases link
  freeTierLimit?: number;      // Default: 5
  proTierLimit?: number;       // Default: 100
  resetPeriod?: 'monthly' | 'weekly' | 'daily';  // Default: 'monthly'
  enableRenewalDetection?: boolean;  // Default: true
  enableDevTools?: boolean;    // Default: __DEV__

  // Callbacks
  onSubscriptionActivated?: () => void;
  onGenerationUsed?: (remaining: number) => void;
  onLimitReached?: (needsSubscription: boolean) => void;
}
```

## Storage Adapters

### Supabase Adapter

```typescript
import { SupabaseAdapter } from 'expo-iap-ai-token-subscription';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const adapter = new SupabaseAdapter(supabase);
```

### In-Memory Adapter (Testing)

```typescript
import { InMemoryAdapter } from 'expo-iap-ai-token-subscription';

const adapter = new InMemoryAdapter();
// or with custom device ID
const adapter = new InMemoryAdapter('test-device-123');
```

### Custom Adapter

Implement the `StorageAdapter` interface:

```typescript
import type { StorageAdapter, UserData, SubscriptionData } from 'expo-iap-ai-token-subscription';

class MyCustomAdapter implements StorageAdapter {
  async getDeviceId(): Promise<string> {
    // Return unique device identifier
  }

  async initializeUser(deviceId: string, freeLimit: number): Promise<UserData | null> {
    // Create user if not exists, return user data
  }

  async getUserData(deviceId: string): Promise<UserData | null> {
    // Return user data
  }

  async updateGenerations(deviceId: string, count: number): Promise<boolean> {
    // Update generation count
  }

  async updateSubscriptionPlan(deviceId: string, plan: string, generations: number): Promise<boolean> {
    // Update subscription and reset generations
  }

  async updateLastRenewal(deviceId: string, date: string): Promise<boolean> {
    // Update last renewal timestamp
  }

  async cancelSubscription(deviceId: string): Promise<boolean> {
    // Cancel subscription
  }

  async upsertSubscription(deviceId: string, purchase: any): Promise<boolean> {
    // Save subscription data
  }

  async getActiveSubscription(deviceId: string): Promise<SubscriptionData | null> {
    // Get active subscription
  }

  async getAllSubscriptions(deviceId: string): Promise<SubscriptionData[]> {
    // Get all subscriptions
  }

  async markSubscriptionCancelled(transactionId: string): Promise<boolean> {
    // Mark as cancelled
  }
}
```

## Hooks

### useTokenSubscription

Main IAP hook for managing subscriptions:

```typescript
const {
  connected,           // Is IAP store connected
  subscriptions,       // Active subscriptions
  hasActiveSubscription,
  requestPurchase,     // Trigger purchase flow
  restorePurchases,    // Restore previous purchases
  products,            // Available products
} = useTokenSubscription();
```

### useGenerations

Manage generation counts:

```typescript
const {
  generationsLeft,     // Number of generations remaining
  isSubscribed,        // Has active subscription
  canGenerate,         // Can use a generation
  needsSubscription,   // Needs to subscribe to continue
  useGeneration,       // Decrement count
  refreshGenerations,  // Refresh from database
  isLoading,
} = useGenerations();
```

### useSubscriptionModal

Modal visibility management:

```typescript
const {
  isVisible,          // Modal visibility state
  showModal,          // Show the modal
  hideModal,          // Hide the modal
  showModalIfNeeded,  // Show only if user needs to subscribe
  hasSeenModal,       // Has user seen the modal
  markModalAsSeen,    // Mark as seen
} = useSubscriptionModal();
```

## SubscriptionModal Component

Customizable subscription modal:

```tsx
<SubscriptionModal
  visible={isVisible}
  onClose={hideModal}
  title="Upgrade to Pro"
  subtitle="Unlock all features"
  price="$9.99"
  pricePeriod="per month"
  subscribeButtonText="Subscribe Now"
  features={[
    { icon: 'camera', title: '100 Generations', description: 'Per month' },
    { icon: 'star', title: 'Priority Support', description: '24/7 help' },
  ]}
  theme={{
    primaryColor: '#007AFF',
    backgroundColor: '#FFFFFF',
    textColor: '#000000',
    secondaryTextColor: '#666666',
  }}
  privacyPolicyUrl="https://example.com/privacy"
  termsOfUseUrl="https://example.com/terms"
/>
```

## Database Schema (Supabase)

### User Table

```sql
CREATE TABLE public.user (
  device_id TEXT PRIMARY KEY,
  subscription_plan TEXT,
  generations_left INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_renewal_at TIMESTAMP WITH TIME ZONE
);
```

### Subscriptions Table

```sql
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL REFERENCES public.user(device_id) ON DELETE CASCADE,
  transaction_id TEXT NOT NULL UNIQUE,
  original_transaction_id TEXT,
  product_id TEXT NOT NULL,
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
  expiration_date TIMESTAMP WITH TIME ZONE,
  renewal_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  is_cancelled BOOLEAN DEFAULT false,
  is_auto_renewing BOOLEAN DEFAULT true,
  platform TEXT DEFAULT 'ios',
  environment TEXT,
  transaction_reason TEXT,
  purchase_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_device_id ON public.subscriptions(device_id);
CREATE INDEX idx_subscriptions_active ON public.subscriptions(device_id, is_active) WHERE is_active = true;
```

## Testing

### Mock Purchases

```typescript
import {
  createMockPurchase,
  createMockRenewalPurchase,
  testRenewalFlow
} from 'expo-iap-ai-token-subscription';

// Create a mock purchase
const purchase = createMockPurchase({
  productId: 'pro',
  transactionReasonIOS: 'PURCHASE',
});

// Create a mock renewal
const renewal = createMockRenewalPurchase('original-tx-id');

// Test renewal flow
const result = await testRenewalFlow();
console.log(result.success, result.message);
```

### Mock Dates

```typescript
import {
  setMockDate,
  setMockDateToEndOfMonth,
  clearMockDate
} from 'expo-iap-ai-token-subscription';

// Set specific date
setMockDate(new Date('2024-01-15'));

// Set to end of month (for testing renewals)
setMockDateToEndOfMonth();

// Clear mock and use real time
clearMockDate();
```

## Expo Router Integration

See [examples/expo-router-integration.md](./examples/expo-router-integration.md) for detailed integration patterns.

## License

MIT

# Expo Router Integration Guide

This guide shows how to integrate `expo-iap-ai-token-subscription` with Expo Router.

## Setup

### 1. Root Layout

Set up the provider in your root layout:

```tsx
// app/_layout.tsx
import { Stack } from 'expo-router';
import { TokenProvider, SupabaseAdapter, SubscriptionModal, useSubscriptionModal } from 'expo-iap-ai-token-subscription';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

const adapter = new SupabaseAdapter(supabase);

function RootLayoutNav() {
  const { isVisible, hideModal } = useSubscriptionModal();

  return (
    <>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack>

      {/* Global subscription modal - accessible from anywhere */}
      <SubscriptionModal
        visible={isVisible}
        onClose={hideModal}
        title="Go Pro"
        subtitle="Transform Your Experience"
        price="$9.99"
        pricePeriod="per month"
        privacyPolicyUrl="https://yourapp.com/privacy"
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <TokenProvider
      adapter={adapter}
      config={{
        productId: __DEV__ ? 'pro' : 'PRO_PROD',
        freeTierLimit: 5,
        proTierLimit: 100,
        resetPeriod: 'monthly',
        onSubscriptionActivated: () => {
          console.log('Subscription activated!');
        },
        onLimitReached: (needsSubscription) => {
          console.log('Limit reached, needs subscription:', needsSubscription);
        },
      }}
    >
      <RootLayoutNav />
    </TokenProvider>
  );
}
```

### 2. Tab Layout (Initialize Subscription Hook)

Initialize the subscription hook at the tab level to monitor subscription changes:

```tsx
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { useTokenSubscription } from 'expo-iap-ai-token-subscription';

export default function TabLayout() {
  // Initialize subscription monitoring at tab level
  // This handles renewals and subscription state changes
  useTokenSubscription();

  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Camera',
          tabBarIcon: ({ color }) => <TabBarIcon name="camera" color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => <TabBarIcon name="image" color={color} />,
        }}
      />
    </Tabs>
  );
}
```

## Usage Patterns

### Pattern 1: Check Before Action

```tsx
// app/(tabs)/index.tsx
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useGenerations, useSubscriptionModal } from 'expo-iap-ai-token-subscription';

export default function CameraScreen() {
  const { generationsLeft, canGenerate, needsSubscription, useGeneration } = useGenerations();
  const { showModal } = useSubscriptionModal();

  const handleCapture = async () => {
    // Check if user can generate
    if (!canGenerate) {
      if (needsSubscription) {
        // Free tier exhausted - show subscription modal
        showModal();
      } else {
        // Subscribed but out of monthly generations
        Alert.alert(
          'Monthly Limit Reached',
          'You have used all your generations for this month. They will reset on your next billing date.'
        );
      }
      return;
    }

    // Process the image
    try {
      const result = await processImage();

      if (result.success) {
        // Only decrement on success
        await useGeneration();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to process image');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.generationsText}>
          {generationsLeft} generations left
        </Text>
      </View>

      <TouchableOpacity style={styles.captureButton} onPress={handleCapture}>
        <Text style={styles.captureText}>Capture</Text>
      </TouchableOpacity>
    </View>
  );
}
```

### Pattern 2: Show Modal on First Launch

```tsx
// app/(tabs)/index.tsx
import { useEffect, useState } from 'react';
import { useSubscriptionModal, useGenerations } from 'expo-iap-ai-token-subscription';

export default function CameraScreen() {
  const { showModal, hasSeenModal, markModalAsSeen } = useSubscriptionModal();
  const { isSubscribed, generationsLeft } = useGenerations();
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  useEffect(() => {
    // Show modal after onboarding if not subscribed and hasn't seen it
    if (hasCompletedOnboarding && !isSubscribed && !hasSeenModal) {
      showModal();
      markModalAsSeen();
    }
  }, [hasCompletedOnboarding, isSubscribed, hasSeenModal]);

  // ...
}
```

### Pattern 3: Settings Screen with Subscription Info

```tsx
// app/settings.tsx
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useGenerations, useTokenSubscription, useSubscriptionModal } from 'expo-iap-ai-token-subscription';

export default function SettingsScreen() {
  const { generationsLeft, isSubscribed } = useGenerations();
  const { restorePurchases, hasActiveSubscription } = useTokenSubscription();
  const { showModal } = useSubscriptionModal();

  const handleRestore = async () => {
    await restorePurchases();
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subscription</Text>

        <View style={styles.row}>
          <Text>Status</Text>
          <Text>{isSubscribed ? 'Pro' : 'Free'}</Text>
        </View>

        <View style={styles.row}>
          <Text>Generations Left</Text>
          <Text>{generationsLeft}</Text>
        </View>

        {!isSubscribed && (
          <TouchableOpacity style={styles.button} onPress={showModal}>
            <Text style={styles.buttonText}>Upgrade to Pro</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.linkButton} onPress={handleRestore}>
          <Text style={styles.linkText}>Restore Purchases</Text>
        </TouchableOpacity>
      </View>

      {/* Development Tools */}
      {__DEV__ && (
        <DevToolsSection />
      )}
    </View>
  );
}

function DevToolsSection() {
  const { testRenewalFlow, setMockDateToEndOfMonth, clearMockDate } = require('expo-iap-ai-token-subscription');

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Dev Tools</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={async () => {
          const result = await testRenewalFlow();
          Alert.alert(result.success ? 'Success' : 'Failed', result.message);
        }}
      >
        <Text style={styles.buttonText}>Test Renewal</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          setMockDateToEndOfMonth();
          Alert.alert('Date Mocked', 'Set to end of month');
        }}
      >
        <Text style={styles.buttonText}>Mock End of Month</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          clearMockDate();
          Alert.alert('Date Cleared', 'Using real time');
        }}
      >
        <Text style={styles.buttonText}>Clear Mock Date</Text>
      </TouchableOpacity>
    </View>
  );
}
```

### Pattern 4: Custom Modal Integration

If you want to build your own modal instead of using the library's:

```tsx
// components/MyCustomSubscriptionModal.tsx
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { useTokenSubscription } from 'expo-iap-ai-token-subscription';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function MyCustomSubscriptionModal({ visible, onClose }: Props) {
  const { requestPurchase, connected, products } = useTokenSubscription();

  const handleSubscribe = async () => {
    await requestPurchase();
    onClose();
  };

  const product = products[0];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <Text style={styles.title}>Upgrade to Pro</Text>

        {product && (
          <Text style={styles.price}>
            {product.localizedPrice} / {product.subscriptionPeriodIOS}
          </Text>
        )}

        <TouchableOpacity
          style={[styles.button, !connected && styles.buttonDisabled]}
          onPress={handleSubscribe}
          disabled={!connected}
        >
          <Text style={styles.buttonText}>Subscribe</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onClose}>
          <Text style={styles.closeText}>Maybe Later</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
```

Then use it with `useSubscriptionModal`:

```tsx
// app/_layout.tsx
import { MyCustomSubscriptionModal } from '@/components/MyCustomSubscriptionModal';
import { useSubscriptionModal } from 'expo-iap-ai-token-subscription';

function RootLayoutNav() {
  const { isVisible, hideModal } = useSubscriptionModal();

  return (
    <>
      <Stack />
      <MyCustomSubscriptionModal visible={isVisible} onClose={hideModal} />
    </>
  );
}
```

## Best Practices

1. **Initialize subscription hook at tab level** - This ensures renewal detection works throughout the app

2. **Use `showModalIfNeeded` for automatic triggers** - It only shows the modal when the user actually needs to subscribe

3. **Always check `canGenerate` before expensive operations** - Don't process images if the user can't use a generation

4. **Handle both subscription states** - Remember that `!canGenerate` can mean either:
   - Free user out of free generations (`needsSubscription: true`)
   - Subscriber out of monthly generations (`needsSubscription: false`)

5. **Only decrement on success** - Call `useGeneration()` after your operation completes successfully

6. **Test with mock dates** - Use `setMockDateToEndOfMonth()` to test renewal flows

## File Structure

```
app/
├── _layout.tsx          # TokenProvider setup, global modal
├── (tabs)/
│   ├── _layout.tsx      # useTokenSubscription initialization
│   ├── index.tsx        # Main screen with generation checks
│   └── history.tsx
├── settings.tsx         # Subscription info, restore purchases
└── modal.tsx            # Other modals
```

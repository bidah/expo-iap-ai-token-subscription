import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Dimensions,
  Linking,
} from 'react-native';
import { useTokenSubscription } from '../hooks/useTokenSubscription';
import type { SubscriptionModalProps, SubscriptionFeature } from '../types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Default features to display in the modal
 */
const DEFAULT_FEATURES: SubscriptionFeature[] = [
  {
    icon: 'camera',
    title: '100 Generations/Month',
    description: 'Create up to 100 AI-powered images every month',
  },
  {
    icon: 'auto-awesome',
    title: 'Most Powerful AI Model',
    description: 'Access to the latest and most advanced AI model',
  },
  {
    icon: 'refresh',
    title: 'Cancel Anytime',
    description: 'No commitment. Cancel your subscription whenever you want',
  },
];

/**
 * SubscriptionModal - A customizable subscription paywall modal
 *
 * This component provides a ready-to-use subscription modal that works with
 * the library's hooks. You can customize the appearance and content.
 *
 * @example Basic Usage
 * ```tsx
 * import { SubscriptionModal, useSubscriptionModal } from 'expo-iap-ai-token-subscription';
 *
 * function App() {
 *   const { isVisible, hideModal } = useSubscriptionModal();
 *
 *   return (
 *     <SubscriptionModal
 *       visible={isVisible}
 *       onClose={hideModal}
 *     />
 *   );
 * }
 * ```
 *
 * @example Customized
 * ```tsx
 * <SubscriptionModal
 *   visible={isVisible}
 *   onClose={hideModal}
 *   title="Upgrade to Pro"
 *   subtitle="Unlock all features"
 *   price="$4.99"
 *   pricePeriod="per month"
 *   features={[
 *     { icon: 'star', title: 'Unlimited Access', description: '...' },
 *     { icon: 'bolt', title: 'Priority Processing', description: '...' },
 *   ]}
 *   theme={{
 *     primaryColor: '#007AFF',
 *     backgroundColor: '#FFFFFF',
 *   }}
 *   privacyPolicyUrl="https://example.com/privacy"
 *   termsOfUseUrl="https://example.com/terms"
 * />
 * ```
 */
export function SubscriptionModal({
  visible,
  onClose,
  title = 'Go Pro',
  subtitle = 'Transform Your Experience',
  features = DEFAULT_FEATURES,
  price = '$9.99',
  pricePeriod = 'per month',
  subscribeButtonText = 'Start Subscription',
  privacyPolicyUrl,
  termsOfUseUrl = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/',
  theme = {},
}: SubscriptionModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { connected, requestPurchase } = useTokenSubscription();

  const {
    backgroundColor = '#FFFFFF',
    primaryColor = '#000000',
    textColor = '#000000',
    secondaryTextColor = '#666666',
  } = theme;

  const handleSubscribe = async () => {
    if (!connected) {
      // Alert is handled by the hook
      return;
    }

    try {
      setIsLoading(true);
      await requestPurchase();
      // Success will be handled by the onPurchaseSuccess callback
      onClose();
    } catch (error: any) {
      console.error('[SubscriptionModal] Purchase failed:', error);
      // Error is handled by the hook
    } finally {
      setIsLoading(false);
    }
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch((err) => {
      console.error('[SubscriptionModal] Error opening link:', err);
    });
  };

  // Simple icon component (you can replace with your icon library)
  const FeatureIcon = ({ name }: { name: string }) => {
    // Map common icon names to emoji fallbacks
    const iconMap: Record<string, string> = {
      camera: '📷',
      'auto-awesome': '✨',
      refresh: '🔄',
      star: '⭐',
      bolt: '⚡',
      check: '✓',
    };

    return (
      <Text style={[styles.iconText, { color: primaryColor }]}>
        {iconMap[name] || '•'}
      </Text>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: textColor }]}>{title}</Text>
            <Text style={[styles.subtitle, { color: secondaryTextColor }]}>{subtitle}</Text>
          </View>

          {/* Features Section */}
          <View style={styles.featuresContainer}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={[styles.iconCircle, { backgroundColor: '#F5F5F5' }]}>
                  <FeatureIcon name={feature.icon} />
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={[styles.featureTitle, { color: textColor }]}>
                    {feature.title}
                  </Text>
                  <Text style={[styles.featureDescription, { color: secondaryTextColor }]}>
                    {feature.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Pricing Card */}
          <View style={styles.pricingCard}>
            <Text style={[styles.priceAmount, { color: textColor }]}>{price}</Text>
            <Text style={[styles.priceLabel, { color: secondaryTextColor }]}>{pricePeriod}</Text>
            <Text style={[styles.priceDescription, { color: secondaryTextColor }]}>
              Billed monthly. Cancel anytime.
            </Text>
          </View>

          {/* Subscribe Button */}
          <TouchableOpacity
            style={[
              styles.subscribeButton,
              { backgroundColor: primaryColor },
              isLoading && styles.subscribeButtonDisabled,
            ]}
            onPress={handleSubscribe}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.subscribeButtonText}>{subscribeButtonText}</Text>
            )}
          </TouchableOpacity>

          {/* Subscription Terms and Legal */}
          <View style={styles.legalContainer}>
            <Text style={[styles.legalText, { color: '#999999' }]}>
              Payment will be charged to your Apple ID account at confirmation of purchase.
              Subscription automatically renews unless cancelled at least 24 hours before
              the end of the current period. Your account will be charged for renewal within
              24 hours prior to the end of the current period.
            </Text>
            <Text style={[styles.legalText, { color: '#999999' }]}>
              You can manage and cancel your subscriptions by going to your App Store
              account settings after purchase.
            </Text>
            <View style={styles.legalLinksContainer}>
              <Text style={[styles.legalText, { color: '#999999' }]}>By subscribing, you agree to our </Text>
              {privacyPolicyUrl && (
                <>
                  <TouchableOpacity onPress={() => openLink(privacyPolicyUrl)}>
                    <Text style={styles.legalLink}>Privacy Policy</Text>
                  </TouchableOpacity>
                  <Text style={[styles.legalText, { color: '#999999' }]}> and </Text>
                </>
              )}
              <TouchableOpacity onPress={() => openLink(termsOfUseUrl)}>
                <Text style={styles.legalLink}>Terms of Use (EULA)</Text>
              </TouchableOpacity>
              <Text style={[styles.legalText, { color: '#999999' }]}>.</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    fontWeight: '400',
  },
  featuresContainer: {
    marginBottom: 40,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconText: {
    fontSize: 24,
  },
  featureTextContainer: {
    flex: 1,
    paddingTop: 4,
  },
  featureTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 15,
    lineHeight: 20,
  },
  pricingCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  priceAmount: {
    fontSize: 48,
    fontWeight: '700',
    marginBottom: 4,
  },
  priceLabel: {
    fontSize: 17,
    marginBottom: 12,
  },
  priceDescription: {
    fontSize: 14,
    textAlign: 'center',
  },
  subscribeButton: {
    borderRadius: 14,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  subscribeButtonDisabled: {
    opacity: 0.6,
  },
  subscribeButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  legalContainer: {
    paddingHorizontal: 8,
  },
  legalText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },
  legalLinksContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  legalLink: {
    fontSize: 12,
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 24,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '600',
  },
});

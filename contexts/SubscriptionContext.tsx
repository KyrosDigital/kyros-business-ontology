'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { subscriptionService, SubscriptionDetails } from '@/services/subscription';
import { SubscriptionFeatures, SubscriptionLimits, SubscriptionPlan } from '@/types/subscription';

interface SubscriptionContextType {
  subscription: SubscriptionDetails | null;
  isLoading: boolean;
  error: Error | null;
  checkLimit: (type: keyof SubscriptionLimits) => Promise<boolean>;
  getRemainingLimits: () => Promise<{
    ontologies: number;
    nodes: number;
    relationships: number;
    aiPrompts: number;
  }>;
  hasFeature: (feature: keyof SubscriptionFeatures) => boolean;
  getPlanLimit: (limitType: keyof SubscriptionLimits) => number | null;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadSubscription() {
      if (!isLoaded || !isSignedIn) {
        setSubscription(null);
        setIsLoading(false);
        return;
      }

      try {
        const subscriptionDetails = await subscriptionService.getCurrentSubscription();
        setSubscription(subscriptionDetails);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load subscription'));
      } finally {
        setIsLoading(false);
      }
    }

    loadSubscription();
  }, [isLoaded, isSignedIn]);

  const checkLimit = async (type: keyof SubscriptionLimits) => {
    if (!subscription?.isActive) return false;
    return subscriptionService.checkLimit(type);
  };

  const getRemainingLimits = async () => {
    if (!subscription?.isActive) {
      throw new Error('No active subscription');
    }
    return subscriptionService.getRemainingLimits();
  };

  const hasFeature = (feature: keyof SubscriptionFeatures) => {
    if (!subscription?.isActive) return false;
    return subscription.features[feature] ?? false;
  };

  const getPlanLimit = (limitType: keyof SubscriptionLimits) => {
    if (!subscription?.isActive) return null;
    return subscription.limits[limitType];
  };

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        isLoading,
        error,
        checkLimit,
        getRemainingLimits,
        hasFeature,
        getPlanLimit,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}

// Utility hooks for common subscription checks
export function useCanCreateOntology() {
  const { subscription, checkLimit } = useSubscription();
  return async () => {
    if (!subscription?.isActive) return false;
    return checkLimit('ontologies');
  };
}

export function useHasFeature(feature: keyof SubscriptionFeatures) {
  const { hasFeature } = useSubscription();
  return hasFeature(feature);
}

export function usePlanLimit(limitType: keyof SubscriptionLimits) {
  const { getPlanLimit } = useSubscription();
  return getPlanLimit(limitType);
}

import { PrismaClient, Subscription, SubscriptionStatus } from '@prisma/client';
import { prisma } from '@/prisma/prisma-client';
import { 
  SubscriptionPlan, 
  SubscriptionFeatures, 
  SubscriptionLimits,
  PLAN_FEATURES,
  PLAN_LIMITS 
} from '@/types/subscription';

export interface SubscriptionDetails {
  isActive: boolean;
  plan: SubscriptionPlan;
  seats: number;
  limits: SubscriptionLimits;
  features: SubscriptionFeatures;
}

class SubscriptionService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async getSubscriptionByOrganizationId(organizationId: string): Promise<Subscription | null> {
    return this.prisma.subscription.findUnique({
      where: { organizationId }
    });
  }

  mapSubscriptionToDetails(subscription: Subscription | null): SubscriptionDetails {
    if (!subscription || subscription.status !== SubscriptionStatus.ACTIVE) {
      return {
        isActive: false,
        plan: SubscriptionPlan.FREE_TRIAL,
        seats: 1,
        limits: PLAN_LIMITS.FREE_TRIAL,
        features: PLAN_FEATURES.FREE_TRIAL,
      };
    }

    return {
      isActive: true,
      plan: subscription.plan as SubscriptionPlan,
      seats: subscription.seats,
      limits: {
        ontologies: subscription.ontologyLimit ?? Infinity,
        nodesPerOntology: subscription.nodesPerOntologyLimit ?? Infinity,
        relationshipsPerOntology: subscription.relationshipsPerOntologyLimit ?? Infinity,
        aiPrompts: subscription.aiPromptsLimit ?? Infinity,
      },
      features: subscription.features as SubscriptionFeatures,
    };
  }

  async getCurrentSubscription(): Promise<SubscriptionDetails> {
    const response = await fetch('/api/v1/subscription/current', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch subscription details');
    }

    return response.json();
  }

  async checkLimit(type: 'ontologies' | 'nodes' | 'relationships' | 'aiPrompts'): Promise<boolean> {
    const response = await fetch(`/api/v1/subscription/check-limit?type=${type}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to check limit');
    }

    const { withinLimit } = await response.json();
    return withinLimit;
  }

  async getRemainingLimits(): Promise<{
    ontologies: number;
    nodes: number;
    relationships: number;
    aiPrompts: number;
  }> {
    const response = await fetch('/api/v1/subscription/remaining-limits', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch remaining limits');
    }

    return response.json();
  }
}

export function getLimitsForPlan(plan: SubscriptionPlan | null): SubscriptionLimits {
  if (!plan) return PLAN_LIMITS.FREE_TRIAL;
  return PLAN_LIMITS[plan];
}

export function getFeaturesForPlan(plan: SubscriptionPlan | null): SubscriptionFeatures {
  if (!plan) return PLAN_FEATURES.FREE_TRIAL;
  return PLAN_FEATURES[plan];
}

export const subscriptionService = new SubscriptionService();

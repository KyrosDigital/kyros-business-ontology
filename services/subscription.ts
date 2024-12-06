import { PrismaClient, Subscription } from '@prisma/client';
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
  features: SubscriptionFeatures;
  limits: SubscriptionLimits;
  currentPeriodEnd: Date;
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
    if (!subscription) {
      return {
        isActive: true,
        plan: SubscriptionPlan.FREE_TRIAL,
        features: PLAN_FEATURES[SubscriptionPlan.FREE_TRIAL],
        limits: PLAN_LIMITS[SubscriptionPlan.FREE_TRIAL],
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };
    }

    return {
      isActive: subscription.status === 'ACTIVE',
      plan: subscription.plan as SubscriptionPlan,
      features: JSON.parse(JSON.stringify(subscription.features)) as SubscriptionFeatures,
      limits: {
        ontologies: subscription.ontologyLimit,
        nodesPerOntology: subscription.nodesPerOntologyLimit,
        relationshipsPerOntology: subscription.relationshipsPerOntologyLimit,
        aiPrompts: subscription.aiPromptsLimit,
      },
      currentPeriodEnd: subscription.currentPeriodEnd,
    };
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

import { PrismaClient, Subscription, SubscriptionStatus, SubscriptionPlan } from '@prisma/client';
import { prisma } from '@/prisma/prisma-client';
import Stripe from 'stripe';
import { PLAN_FEATURES, PLAN_LIMITS } from '@/types/subscription';

export class StripeService {
  private prisma: PrismaClient;
  private stripe: Stripe;

  // Map Stripe price IDs to our subscription plans
  private PRICE_TO_PLAN: Record<string, SubscriptionPlan> = {
    // You'll need to replace these with your actual Stripe price IDs
    'price_pro_monthly': 'PRO',
    'price_enterprise_monthly': 'ENTERPRISE',
  };

  constructor() {
    this.prisma = prisma;
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-11-20.acacia',
    });
  }

  /**
   * Get plan type from Stripe price ID
   */
  private getPlanFromPriceId(priceId: string): SubscriptionPlan {
    const plan = this.PRICE_TO_PLAN[priceId];
    if (!plan) {
      throw new Error(`Unknown price ID: ${priceId}`);
    }
    return plan;
  }

  /**
   * Get initial limits based on plan
   */
  private getLimitsForPlan(plan: SubscriptionPlan) {
    return {
      ontologyLimit: PLAN_LIMITS[plan].ontologies,
      nodesPerOntologyLimit: PLAN_LIMITS[plan].nodesPerOntology,
      relationshipsPerOntologyLimit: PLAN_LIMITS[plan].relationshipsPerOntology,
      aiPromptsLimit: PLAN_LIMITS[plan].aiPrompts,
    };
  }

  /**
   * Get features for plan
   */
  private getFeaturesForPlan(plan: SubscriptionPlan) {
    return {
      ...PLAN_FEATURES[plan],
      _version: 1, // Add version for future migrations
    };
  }

  /**
   * Handle checkout session completion
   */
  async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const organizationId = session.client_reference_id;
    const subscriptionId = session.subscription as string;

    if (!organizationId) {
      console.error('No organization ID found in checkout session');
      return;
    }

    const stripeSubscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    const priceId = stripeSubscription.items.data[0].price.id;
    const plan = this.getPlanFromPriceId(priceId);

    await this.prisma.subscription.upsert({
      where: {
        stripeSubscriptionId: subscriptionId,
      },
      create: {
        organizationId,
        plan,
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: priceId,
        status: this.mapStripeStatus(stripeSubscription.status),
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        ...this.getLimitsForPlan(plan),
        features: this.getFeaturesForPlan(plan),
        aiPromptsUsed: 0,
      },
      update: {
        status: this.mapStripeStatus(stripeSubscription.status),
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      },
    });
  }

  /**
   * Create a new subscription record
   */
  async createSubscription(stripeSubscription: Stripe.Subscription): Promise<Subscription> {
    const priceId = stripeSubscription.items.data[0].price.id;
    const plan = this.getPlanFromPriceId(priceId);

    return this.prisma.subscription.create({
      data: {
        organizationId: stripeSubscription.metadata.organizationId,
        plan,
        stripeCustomerId: stripeSubscription.customer as string,
        stripeSubscriptionId: stripeSubscription.id,
        stripePriceId: priceId,
        status: this.mapStripeStatus(stripeSubscription.status),
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        ...this.getLimitsForPlan(plan),
        features: this.getFeaturesForPlan(plan),
        aiPromptsUsed: 0,
      },
    });
  }

  /**
   * Update an existing subscription
   */
  async updateSubscription(stripeSubscription: Stripe.Subscription): Promise<Subscription> {
    return this.prisma.subscription.update({
      where: { stripeSubscriptionId: stripeSubscription.id },
      data: {
        status: this.mapStripeStatus(stripeSubscription.status),
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        canceledAt: stripeSubscription.canceled_at 
          ? new Date(stripeSubscription.canceled_at * 1000)
          : null,
      },
    });
  }

  /**
   * Delete a subscription
   */
  async deleteSubscription(stripeSubscriptionId: string): Promise<Subscription> {
    return this.prisma.subscription.update({
      where: { stripeSubscriptionId },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
      },
    });
  }

  /**
   * Verify Stripe webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  }

  /**
   * Map Stripe subscription status to our enum
   */
  private mapStripeStatus(stripeStatus: string): SubscriptionStatus {
    const statusMap: Record<string, SubscriptionStatus> = {
      active: 'ACTIVE',
      past_due: 'PAST_DUE',
      canceled: 'CANCELED',
      unpaid: 'UNPAID',
      trialing: 'TRIALING',
      paused: 'PAUSED',
    };
    return statusMap[stripeStatus] || 'CANCELED';
  }
}

// Export a singleton instance
export const stripeService = new StripeService();

import { PrismaClient, Subscription, SubscriptionStatus } from '@prisma/client';
import { prisma } from '@/prisma/prisma-client';
import Stripe from 'stripe';

export class StripeService {
  private prisma: PrismaClient;
  private stripe: Stripe;

  constructor() {
    this.prisma = prisma;
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-11-20.acacia',
    });
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

    // Verify organization exists
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      console.error(`Organization not found with ID: ${organizationId}`);
      return;
    }

    // Fetch full subscription details from Stripe
    const stripeSubscription = await this.stripe.subscriptions.retrieve(subscriptionId);

    // Create or update subscription in database
    await this.prisma.subscription.upsert({
      where: {
        stripeSubscriptionId: subscriptionId,
      },
      create: {
        organizationId,
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: stripeSubscription.items.data[0].price.id,
        status: this.mapStripeStatus(stripeSubscription.status),
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        planName: stripeSubscription.items.data[0].price.nickname || 'default',
        features: {},
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
    return this.prisma.subscription.create({
      data: {
        organizationId: stripeSubscription.metadata.organizationId,
        stripeCustomerId: stripeSubscription.customer as string,
        stripeSubscriptionId: stripeSubscription.id,
        stripePriceId: stripeSubscription.items.data[0].price.id,
        status: this.mapStripeStatus(stripeSubscription.status),
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        planName: stripeSubscription.items.data[0].price.nickname || 'default',
        features: {},
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

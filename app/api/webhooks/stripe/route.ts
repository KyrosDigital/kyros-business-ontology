import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripeService } from '@/services/stripe';

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = headers().get('stripe-signature')!;

    let event: Stripe.Event;

    try {
      event = stripeService.verifyWebhookSignature(body, signature);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Log the event type for debugging
    // console.log('Webhook event type:', event.type);

    // Handle specific webhook events
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Processing checkout session with organization ID:', session.client_reference_id);
        await stripeService.handleCheckoutSessionCompleted(session);
        break;

      case 'customer.subscription.updated':
        const subscriptionUpdated = event.data.object as Stripe.Subscription;
        await stripeService.updateSubscription(subscriptionUpdated);
        break;

      case 'customer.subscription.deleted':
        const subscriptionDeleted = event.data.object as Stripe.Subscription;
        await stripeService.deleteSubscription(subscriptionDeleted.id);
        break;

      // Group all other events for logging
      // case 'invoice.paid':
      // case 'invoice.payment_succeeded':
      // case 'invoice.finalized':
      // case 'invoice.created':
      // case 'invoice.updated':
      // case 'payment_intent.succeeded':
      // case 'payment_intent.created':
      // case 'payment_method.attached':
      // case 'charge.succeeded':
      // case 'customer.created':
      // case 'customer.updated':
      //   console.log(`${event.type} event received:`, event.data.object);
      //   break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 400 }
    );
  }
}

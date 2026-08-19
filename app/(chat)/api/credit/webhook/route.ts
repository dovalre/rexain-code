import { NextRequest, NextResponse } from 'next/server';
import { getStripe, STRIPE_WEBHOOK_SECRET } from '@/lib/stripe';
import { addCredit } from '@/lib/db/credit-queries';
import { db } from '@/lib/db';
import { creditTransaction } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.client_reference_id || session.metadata?.userId;
        const creditAmount = session.metadata?.creditAmount;
        const stripeSessionId = session.id;
        const stripePaymentIntentId = session.payment_intent as string;

        if (!userId || !creditAmount) {
          console.error('Missing userId or creditAmount in session metadata');
          break;
        }

        // Check if this session was already processed (idempotency)
        const [existing] = await db
          .select()
          .from(creditTransaction)
          .where(eq(creditTransaction.stripeSessionId, stripeSessionId))
          .limit(1);

        if (existing) {
          // Already processed, skip
          break;
        }

        const amount = parseFloat(creditAmount);

        await addCredit({
          userId,
          amount,
          description: `Stripe top-up: $${amount.toFixed(2)}`,
          stripeSessionId,
          stripePaymentIntentId,
        });

        console.log(`Credit added: $${amount} for user ${userId}`);
        break;
      }

      default:
        // Unhandled event type
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
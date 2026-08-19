import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/db/queries';
import { getStripe, CREDIT_PACKAGES } from '@/lib/stripe';
import { ChatbotError } from '@/lib/errors';

const MIN_CUSTOM_AMOUNT = 1; // $1 minimum
const MAX_CUSTOM_AMOUNT = 1000; // $1000 maximum

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return new ChatbotError('unauthorized:chat').toResponse();
  }

  const body = await request.json();
  const { packageId, amount } = body;

  let creditAmount: number;
  let packageIdForMetadata: string | undefined;

  // If a packageId is provided, use the predefined package
  if (packageId) {
    const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId);
    if (!pkg) {
      return NextResponse.json(
        { error: 'Invalid package selected' },
        { status: 400 }
      );
    }
    creditAmount = pkg.credit;
    packageIdForMetadata = pkg.id;
  } else if (amount !== undefined) {
    // Custom amount top-up (1 - 1000 USD)
    creditAmount = Number(amount);
    if (!Number.isFinite(creditAmount) || creditAmount < MIN_CUSTOM_AMOUNT || creditAmount > MAX_CUSTOM_AMOUNT) {
      return NextResponse.json(
        { error: `Custom amount must be between $${MIN_CUSTOM_AMOUNT} and $${MAX_CUSTOM_AMOUNT}` },
        { status: 400 }
      );
    }
    // Round to 2 decimal places
    creditAmount = Math.round(creditAmount * 100) / 100;
  } else {
    return NextResponse.json(
      { error: 'Either packageId or amount is required' },
      { status: 400 }
    );
  }

  const amountInCents = Math.round(creditAmount * 100);
  const origin = request.headers.get('origin') || 'http://localhost:3000';

  try {
    const stripe = getStripe();
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Credit Top-up: $${creditAmount.toFixed(2)}`,
              description: `Add $${creditAmount.toFixed(2)} USD credit to your account`,
            },
            unit_amount: amountInCents, // in cents
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/?topup=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?topup=cancelled`,
      client_reference_id: session.user.id,
      metadata: {
        userId: session.user.id,
        packageId: packageIdForMetadata || 'custom',
        creditAmount: creditAmount.toString(),
      },
    });

    return NextResponse.json({
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (error) {
    console.error('Failed to create Stripe checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

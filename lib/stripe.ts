import Stripe from "stripe";

let _stripe: Stripe | null = null;

/**
 * Lazily initialize and return the Stripe client.
 * The Stripe SDK throws if the API key is empty, so we defer
 * initialization until the first actual usage (runtime, not build time).
 */
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    _stripe = new Stripe(key, {
      apiVersion: "2026-07-29.dahlia",
      typescript: true,
    });
  }
  return _stripe;
}

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

// Credit top-up packages available for purchase (in USD)
export const CREDIT_PACKAGES = [
  { id: "credit_5", amount: 500, credit: 5, label: "$5.00" },
  { id: "credit_10", amount: 1000, credit: 10, label: "$10.00" },
  { id: "credit_20", amount: 2000, credit: 20, label: "$20.00" },
  { id: "credit_50", amount: 5000, credit: 50, label: "$50.00" },
  { id: "credit_100", amount: 10000, credit: 100, label: "$100.00" },
  { id: "credit_200", amount: 20000, credit: 200, label: "$200.00" },
] as const;

export type CreditPackage = (typeof CREDIT_PACKAGES)[number];
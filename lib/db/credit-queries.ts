import 'server-only';

import { desc, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { user, creditTransaction, type CreditTransaction } from '@/lib/db/schema';
import { ChatbotError } from '@/lib/errors';

/**
 * Get the current credit balance for a user.
 * Returns the balance as a number (USD).
 */
export async function getUserCredit(userId: string): Promise<number> {
  try {
    const [userRow] = await db
      .select({ credit: user.credit })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!userRow) {
      return 0;
    }

    return parseFloat(userRow.credit);
  } catch {
    throw new ChatbotError('bad_request:database', 'Failed to get user credit');
  }
}

/**
 * Add credit to a user's balance (used for Stripe top-ups).
 * Records a transaction with type "topup".
 * Returns the new balance.
 */
export async function addCredit({
  userId,
  amount,
  description,
  stripeSessionId,
  stripePaymentIntentId,
}: {
  userId: string;
  amount: number;
  description?: string;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
}): Promise<number> {
  try {
    // Get current balance
    const [userRow] = await db
      .select({ credit: user.credit })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!userRow) {
      throw new ChatbotError('not_found:database', 'User not found');
    }

    const currentBalance = parseFloat(userRow.credit);
    const newBalance = currentBalance + amount;

    // Update user balance
    await db
      .update(user)
      .set({ credit: newBalance.toFixed(6) })
      .where(eq(user.id, userId));

    // Record transaction
    await db.insert(creditTransaction).values({
      userId,
      type: 'topup',
      amount: amount.toFixed(6),
      balanceAfter: newBalance.toFixed(6),
      description: description || 'Credit top-up',
      stripeSessionId,
      stripePaymentIntentId,
      createdAt: new Date(),
    });

    return newBalance;
  } catch (error) {
    if (error instanceof ChatbotError) throw error;
    throw new ChatbotError('bad_request:database', 'Failed to add credit');
  }
}

/**
 * Deduct credit from a user's balance (used for AI usage costs).
 * Records a transaction with type "usage".
 * Returns the new balance.
 */
export async function deductCredit({
  userId,
  amount,
  description,
  generationId,
  chatId,
}: {
  userId: string;
  amount: number;
  description?: string;
  generationId?: string;
  chatId?: string;
}): Promise<number> {
  try {
    // Get current balance
    const [userRow] = await db
      .select({ credit: user.credit })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!userRow) {
      throw new ChatbotError('not_found:database', 'User not found');
    }

    const currentBalance = parseFloat(userRow.credit);
    const newBalance = currentBalance - amount;

    // Update user balance
    await db
      .update(user)
      .set({ credit: newBalance.toFixed(6) })
      .where(eq(user.id, userId));

    // Record transaction
    await db.insert(creditTransaction).values({
      userId,
      type: 'usage',
      amount: amount.toFixed(6),
      balanceAfter: newBalance.toFixed(6),
      description: description || 'AI usage cost',
      generationId,
      chatId,
      createdAt: new Date(),
    });

    return newBalance;
  } catch (error) {
    if (error instanceof ChatbotError) throw error;
    throw new ChatbotError('bad_request:database', 'Failed to deduct credit');
  }
}

/**
 * Get transaction history for a user.
 */
export async function getCreditTransactions({
  userId,
  limit = 50,
}: {
  userId: string;
  limit?: number;
}): Promise<CreditTransaction[]> {
  try {
    return await db
      .select()
      .from(creditTransaction)
      .where(eq(creditTransaction.userId, userId))
      .orderBy(desc(creditTransaction.createdAt))
      .limit(limit);
  } catch {
    throw new ChatbotError(
      'bad_request:database',
      'Failed to get credit transactions'
    );
  }
}

/**
 * Check if a user has enough credit (balance > 0).
 * Used as a pre-check before AI generation.
 */
export async function hasCredit(userId: string): Promise<boolean> {
  const balance = await getUserCredit(userId);
  return balance > 0;
}
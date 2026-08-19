import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/db/queries';
import { getCreditTransactions } from '@/lib/db/credit-queries';
import { ChatbotError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return new ChatbotError('unauthorized:chat').toResponse();
  }

  const { searchParams } = request.nextUrl;
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  const transactions = await getCreditTransactions({
    userId: session.user.id,
    limit,
  });

  return NextResponse.json({
    transactions: transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      balanceAfter: t.balanceAfter,
      description: t.description,
      generationId: t.generationId,
      chatId: t.chatId,
      createdAt: t.createdAt,
    })),
  });
}
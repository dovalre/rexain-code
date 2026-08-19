import { NextResponse } from 'next/server';
import { getSession } from '@/lib/db/queries';
import { getUserCredit } from '@/lib/db/credit-queries';
import { ChatbotError } from '@/lib/errors';

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return new ChatbotError('unauthorized:chat').toResponse();
  }

  const balance = await getUserCredit(session.user.id);

  return NextResponse.json({
    balance: balance.toFixed(6),
    currency: 'USD',
  });
}
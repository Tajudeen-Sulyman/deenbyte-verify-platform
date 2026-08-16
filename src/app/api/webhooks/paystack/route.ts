import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { settlePayment } from '@/lib/services/wallet';

export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get('x-paystack-signature');
  const expected = createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!).update(raw).digest('hex');

  const a = Buffer.from(signature ?? '');
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
  }

  const event = JSON.parse(raw);
  if (event.event === 'charge.success' && event.data?.reference) {
    await settlePayment(event.data.reference).catch(() => {});
  }

  return NextResponse.json({ received: true });
}

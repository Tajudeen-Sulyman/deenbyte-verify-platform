'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export function CallbackVerifier({ reference }: { reference: string }) {
  const [state, setState] = useState<'checking' | 'success' | 'failed'>('checking');
  const [detail, setDetail] = useState('');
  const [amount, setAmount] = useState<number | null>(null);

  useEffect(() => {
    if (!reference) {
      setState('failed');
      setDetail('No payment reference found.');
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await fetch('/api/v1/wallet/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference }),
      });
      const data = await res.json();
      if (cancelled) return;
      if (data.credited) {
        setState('success');
        setAmount(data.amount);
      } else if (data.reason === 'Already credited.' || data.reason === 'Already processed.') {
        setState('success');
        setDetail('This payment was already added to your wallet.');
      } else {
        setState('failed');
        setDetail(data.reason || 'Payment verification failed.');
      }
    })();
    return () => { cancelled = true; };
  }, [reference]);

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm card3d p-6 text-center">
        {state === 'checking' && <p className="text-sm text-muted">Confirming your payment…</p>}
        {state === 'success' && (
          <>
            <p className="text-lg font-bold text-primary">✓ Wallet funded</p>
            <p className="text-sm text-muted mt-2">
              {amount != null
                ? '₦' + amount.toLocaleString('en-NG', { minimumFractionDigits: 2 }) + ' added to your wallet.'
                : detail}
            </p>
          </>
        )}
        {state === 'failed' && (
          <>
            <p className="text-lg font-bold text-red-600">Payment not completed</p>
            <p className="text-sm text-muted mt-2">{detail}</p>
          </>
        )}
        <div className="mt-5 flex gap-2 justify-center">
          <Link href="/wallet" className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white">Back to Wallet</Link>
          <Link href="/verify" className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-dark">Verify</Link>
        </div>
      </div>
    </main>
  );
}

'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function V() {
  const p = useSearchParams();
  const ref = p.get('reference') ?? p.get('trxref') ?? '';
  const [msg, setMsg] = useState('Confirming your payment…');
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    if (!ref) { setOk(false); setMsg('No payment reference found.'); return; }
    fetch('/api/v1/wallet/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference: ref }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.credited) {
          setOk(true);
          setMsg('₦' + Number(d.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 }) + ' added to your wallet.');
        } else if (d.reason === 'Already credited.' || d.reason === 'Already processed.') {
          setOk(true);
          setMsg('This payment was already added to your wallet.');
        } else {
          setOk(false);
          setMsg(d.reason || 'Payment verification failed.');
        }
      })
      .catch(() => { setOk(false); setMsg('Could not confirm payment. Ref: ' + ref); });
  }, [ref]);

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm card3d p-6 text-center">
        <p className={'text-lg font-bold ' + (ok === false ? 'text-red-600' : 'text-primary')}>
          {ok === true ? '✓ Wallet funded' : ok === false ? 'Payment not completed' : 'Please wait'}
        </p>
        <p className="text-sm text-muted mt-2">{msg}</p>
        <div className="mt-5 flex justify-center">
          <Link href="/wallet" className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white">Back to Wallet</Link>
        </div>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<main className="min-h-screen" />}>
      <V />
    </Suspense>
  );
}

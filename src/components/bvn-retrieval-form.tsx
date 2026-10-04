'use client';
import { useState } from 'react';
import BvnStatusCard from '@/components/bvn-status-card';

export default function BvnRetrievalForm({ price }: { price: number }) {
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ref, setRef] = useState('');

  const ok = first.trim() && last.trim() && phone.replace(/\D/g, '').length >= 11;
  const input = 'w-full rounded-xl border border-border px-4 py-3';

  async function submit() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/v1/bvn-retrieval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name: first, last_name: last, phone_number: phone }),
      });
      const j = await res.json();
      if (!res.ok) setError(j.error ?? 'Request failed.');
      else setRef(j.reference);
    } catch {
      setError('Network error. Check History before retrying.');
    }
    setBusy(false);
  }

  if (ref) {
    return (
      <div className="space-y-4">
        <BvnStatusCard reference={ref} status="pending" bvn={null} note={null} errorMessage={null} />
        <button
          type="button"
          onClick={() => { setRef(''); setFirst(''); setLast(''); setPhone(''); }}
          className="text-sm text-primary underline"
        >
          New request
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
        Service cost: ₦{price.toLocaleString()} per request
      </div>
      <input className={input} placeholder="First name (as on BVN)" value={first} onChange={(e) => setFirst(e.target.value)} />
      <input className={input} placeholder="Last name (as on BVN)" value={last} onChange={(e) => setLast(e.target.value)} />
      <input className={input} placeholder="Phone number on the BVN" inputMode="tel" maxLength={14} value={phone} onChange={(e) => setPhone(e.target.value)} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={busy || !ok}
        className="w-full rounded-xl bg-primary py-3 font-semibold text-white disabled:opacity-50"
      >
        {busy ? 'Submitting…' : `Submit (₦${price.toLocaleString()})`}
      </button>
    </div>
  );
}

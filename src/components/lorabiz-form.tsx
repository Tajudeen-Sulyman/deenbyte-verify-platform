'use client';
import { useState } from 'react';
import LorabizStatusCard from '@/components/lorabiz-status-card';

type Props = { kind: 'ipe' | 'personalization'; endpoint: string; price: number };

export default function LorabizForm({ kind, endpoint, price }: Props) {
  const [tid, setTid] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ref, setRef] = useState('');
  const ok = /^[A-Za-z0-9]{8,32}$/.test(tid);

  async function submit() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tracking_id: tid }),
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
        <LorabizStatusCard endpoint={endpoint} kind={kind} reference={ref} status="pending" />
        <button type="button" onClick={() => { setRef(''); setTid(''); }} className="text-sm text-primary underline">
          Submit another
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
        Service cost: ₦{price.toLocaleString()} per request
      </div>
      <input
        className="w-full rounded-xl border border-border px-4 py-3 font-mono"
        placeholder="NIMC tracking ID (8 to 32 characters)"
        value={tid}
        maxLength={32}
        onChange={(e) => setTid(e.target.value.replace(/\s/g, ''))}
      />
      {tid && !ok && <p className="text-xs text-red-600">Use 8 to 32 letters or numbers.</p>}
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

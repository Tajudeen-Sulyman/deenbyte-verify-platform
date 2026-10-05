'use client';
import { useState } from 'react';
import ValidationStatusCard from '@/components/nin-validation-status-card';

export default function NinValidationForm({ price }: { price: number }) {
  const [nin, setNin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ref, setRef] = useState('');
  const ok = nin.length === 11;

  async function submit() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/v1/nin-validation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nin }),
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
        <ValidationStatusCard reference={ref} status="processing" result={null} errorMessage={null} />
        <button type="button" onClick={() => { setRef(''); setNin(''); }} className="text-sm text-primary underline">
          Validate another NIN
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
        Service cost: ₦{price.toLocaleString()} per validation
      </div>
      <input
        className="w-full rounded-xl border border-border px-4 py-3 font-mono"
        placeholder="Enter 11-digit NIN"
        inputMode="numeric"
        maxLength={11}
        value={nin}
        onChange={(e) => setNin(e.target.value.replace(/\D/g, '').slice(0, 11))}
      />
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

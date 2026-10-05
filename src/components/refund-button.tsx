'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RefundButton({ requestId, amount, status }: { requestId: string; amount: number; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function go() {
    const warn = status === 'failed' ? '' : ' It is still ' + status + ' at the provider and will be marked failed.';
    if (!window.confirm('Refund ₦' + amount.toLocaleString() + ' to the user?' + warn)) return;
    const note = window.prompt('Reason (optional, shown to the user)');
    if (note === null) return;
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/admin/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId, note }),
      });
      const j = await res.json();
      if (!res.ok) setMsg(j.error ?? 'Refund failed.');
      else { setMsg('Refunded.'); router.refresh(); }
    } catch {
      setMsg('Network error. Check the wallet before retrying.');
    }
    setBusy(false);
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={go}
        disabled={busy}
        className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-primary disabled:opacity-50"
      >
        {busy ? 'Refunding…' : 'Refund ₦' + amount.toLocaleString()}
      </button>
      {msg && <p className="mt-2 text-xs text-red-600">{msg}</p>}
    </div>
  );
}

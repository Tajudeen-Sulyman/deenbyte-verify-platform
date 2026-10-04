'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  reference: string;
  status: string;
  note: string | null;
  newNin: string | null;
  newTrackingId: string | null;
  errorMessage: string | null;
};

export default function IpeStatusCard(p: Props) {
  const router = useRouter();
  const [state, setState] = useState(p);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function refresh() {
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/v1/ipe?reference=' + encodeURIComponent(p.reference));
      const j = await res.json();
      if (!res.ok) { setMsg(j.error ?? 'Could not check status.'); }
      else {
        setState((s) => ({
          ...s,
          status: String(j.status ?? s.status),
          note: j.note ?? s.note,
          newNin: j.new_nin ?? s.newNin,
          newTrackingId: j.new_tracking_id ?? s.newTrackingId,
        }));
        router.refresh();
      }
    } catch {
      setMsg('Network error. Try again.');
    }
    setBusy(false);
  }

  return (
    <div className="card3d p-5">
      <h2 className="font-semibold text-dark">Clearance status</h2>
      <div className="mt-3 space-y-2 text-sm">
        <p><span className="text-muted">Status: </span><b className="text-dark">{state.status}</b></p>
        {state.note && <p><span className="text-muted">Note: </span>{state.note}</p>}
        {state.newNin && <p><span className="text-muted">New NIN: </span><b>{state.newNin}</b></p>}
        {state.newTrackingId && <p><span className="text-muted">New tracking ID: </span><b>{state.newTrackingId}</b></p>}
        {state.errorMessage && <p className="text-red-600">{state.errorMessage}</p>}
        {msg && <p className="text-red-600">{msg}</p>}
      </div>
      <button
        type="button"
        onClick={refresh}
        disabled={busy}
        className="mt-4 rounded-lg border border-border px-4 py-2 text-xs font-semibold text-primary disabled:opacity-50"
      >
        {busy ? 'Checking…' : 'Check status'}
      </button>
    </div>
  );
}

'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  reference: string;
  status: string;
  bvn: string | null;
  note: string | null;
  errorMessage: string | null;
};

export default function BvnStatusCard(p: Props) {
  const router = useRouter();
  const [s, setS] = useState(p);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function refresh() {
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/v1/bvn-retrieval?reference=' + encodeURIComponent(p.reference));
      const j = await res.json();
      if (!res.ok) setMsg(j.error ?? 'Could not check status.');
      else {
        setS((prev) => ({
          ...prev,
          status: String(j.status ?? prev.status),
          bvn: j.bvn ?? prev.bvn,
          note: j.note ?? prev.note,
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
      <h2 className="font-semibold text-dark">BVN retrieval</h2>
      <div className="mt-3 space-y-2 text-sm">
        <p><span className="text-muted">Reference: </span>{p.reference}</p>
        <p><span className="text-muted">Status: </span><b className="text-dark">{s.status}</b></p>
        {s.bvn && <p><span className="text-muted">BVN: </span><b className="font-mono text-base">{s.bvn}</b></p>}
        {s.note && <p><span className="text-muted">Note: </span>{s.note}</p>}
        {s.errorMessage && <p className="text-red-600">{s.errorMessage}</p>}
        {msg && <p className="text-red-600">{msg}</p>}
      </div>
      {!s.bvn && (
        <button
          type="button"
          onClick={refresh}
          disabled={busy}
          className="mt-4 rounded-lg border border-border px-4 py-2 text-xs font-semibold text-primary disabled:opacity-50"
        >
          {busy ? 'Checking…' : 'Check status'}
        </button>
      )}
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  endpoint: string;
  kind: 'ipe' | 'personalization';
  reference: string;
  status: string;
  lbStatus?: string | null;
  newTrackingId?: string | null;
  resolvedNin?: string | null;
  person?: Record<string, unknown> | null;
  pdfReady?: boolean;
  errorMessage?: string | null;
};

export default function LorabizStatusCard(p: Props) {
  const router = useRouter();
  const [s, setS] = useState({
    status: p.status,
    newTrackingId: p.newTrackingId ?? null,
    resolvedNin: p.resolvedNin ?? null,
    person: p.person ?? null,
    pdfReady: !!p.pdfReady,
    error: p.errorMessage ?? null,
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const done = s.status === 'successful' || s.status === 'failed';

  async function refresh() {
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch(`${p.endpoint}?reference=${encodeURIComponent(p.reference)}`);
      const j = await res.json();
      if (!res.ok) setMsg(j.error ?? 'Could not check status.');
      else {
        setS({
          status: String(j.status),
          newTrackingId: j.new_tracking_id ?? null,
          resolvedNin: j.resolved_nin ?? null,
          person: j.person ?? null,
          pdfReady: !!j.pdf_ready,
          error: j.error ?? null,
        });
        router.refresh();
      }
    } catch {
      setMsg('Network error. Try again.');
    }
    setBusy(false);
  }

  useEffect(() => {
    if (done) return;
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const pdfUrl = `/api/v1/lorabiz-personalization/pdf?reference=${encodeURIComponent(p.reference)}`;

  return (
    <div className="card3d p-5">
      <h2 className="font-semibold text-dark">{p.kind === 'ipe' ? 'IPE clearance' : 'NIN personalization'}</h2>
      <div className="mt-3 space-y-2 text-sm">
        <p><span className="text-muted">Reference: </span>{p.reference}</p>
        <p><span className="text-muted">Status: </span><b className="text-dark">{s.status}</b></p>
        {s.newTrackingId && <p><span className="text-muted">New tracking ID: </span><b>{s.newTrackingId}</b></p>}
        {s.resolvedNin && <p><span className="text-muted">NIN: </span><b className="font-mono">{s.resolvedNin}</b></p>}
        {s.person && Object.entries(s.person).filter(([, v]) => v).map(([k, v]) => (
          <p key={k}><span className="text-muted">{k.replace(/_/g, ' ')}: </span>{String(v)}</p>
        ))}
        {s.status === 'successful' && p.kind === 'personalization' && s.pdfReady && (
          <a href={pdfUrl} className="inline-block font-semibold text-primary underline">Download slip (PDF)</a>
        )}
        {s.error && s.status === 'failed' && <p className="text-red-600">{s.error}</p>}
        {msg && <p className="text-red-600">{msg}</p>}
      </div>
      {!done && (
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

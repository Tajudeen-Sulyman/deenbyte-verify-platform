'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = { reference: string; status: string; result: string | null; errorMessage: string | null };

export default function ValidationStatusCard(p: Props) {
  const router = useRouter();
  const [s, setS] = useState(p);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [info, setInfo] = useState('');
  const done = s.status === 'successful' || s.status === 'completed' || s.status === 'failed';

  async function refresh() {
    setBusy(true);
    setMsg('');
    setInfo('');
    try {
      const res = await fetch('/api/v1/nin-validation?reference=' + encodeURIComponent(p.reference));
      const j = await res.json();
      if (!res.ok) setMsg(j.error ?? 'Could not check status.');
      else {
        setS((prev) => ({ ...prev, status: String(j.status ?? prev.status), result: j.result ?? prev.result }));
        router.refresh();
        if (!['successful', 'completed', 'failed'].includes(String(j.status))) setInfo('Still being processed. Last checked ' + new Date().toLocaleTimeString() + '.');
      }
    } catch {
      setMsg('Network error. Try again.');
    }
    setBusy(false);
  }

  useEffect(() => {
    if (done) return;
    const t = setInterval(() => { refresh(); }, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  return (
    <div className="card3d p-5">
      <h2 className="font-semibold text-dark">NIN validation</h2>
      <div className="mt-3 space-y-2 text-sm">
        <p><span className="text-muted">Reference: </span>{p.reference}</p>
        <p><span className="text-muted">Status: </span><b className="text-dark">{s.status}</b></p>
        {s.result && <p className="whitespace-pre-wrap"><span className="text-muted">Result: </span>{s.result}</p>}
        {p.errorMessage && s.status === 'failed' && <p className="text-red-600">{p.errorMessage}</p>}
        {msg && <p className="text-red-600">{msg}</p>}
        {info && <p className="text-muted">{info}</p>}
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

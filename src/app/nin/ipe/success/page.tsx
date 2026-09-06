'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function IpeSuccessPage() {
  const [ref, setRef] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get('reference') ?? '';
    setRef(r);
    if (!r) return;
    let n = 0;
    const t = setInterval(async () => {
      n++;
      const j = await fetch('/api/v1/ipe/confirm?reference=' + encodeURIComponent(r)).then((x) => x.json()).catch(() => null);
      if (j?.confirmed) { setStatus(j.status); clearInterval(t); }
      else if (n > 20) { setStatus('awaiting_payment'); clearInterval(t); }
    }, 3000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="min-h-screen bg-light flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-6 text-center">
        {!status && (<><div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-violet-700 border-t-transparent" /><h1 className="mt-4 text-lg font-extrabold text-violet-950">Confirming payment…</h1></>)}
        {status && status !== 'awaiting_payment' && status !== 'failed' && (
          <>
            <div className="mx-auto h-16 w-16 rounded-full border-4 border-violet-800 flex items-center justify-center"><span className="text-2xl text-violet-800 font-bold">✓</span></div>
            <h1 className="mt-4 text-xl font-extrabold text-violet-950">IPE Clearance Queued!</h1>
            <p className="mt-2 text-sm text-muted">Processing within <b className="text-dark">~24 hours</b>. Track it on the IPE page.</p>
            <p className="mt-3 text-xs text-muted">Reference: <b className="text-dark">{ref}</b></p>
            <Link href="/nin/ipe" className="mt-4 block w-full rounded-xl bg-primary text-white font-extrabold py-3.5 text-sm">BACK TO IPE →</Link>
          </>
        )}
        {status === 'failed' && (<><h1 className="text-lg font-extrabold text-red-700">Submission failed</h1><p className="mt-2 text-xs text-muted">Contact support with reference <b className="text-dark">{ref}</b>.</p></>)}
        {status === 'awaiting_payment' && (<><h1 className="text-lg font-extrabold text-violet-950">Payment not confirmed yet</h1><p className="mt-2 text-xs text-muted">Refresh in a minute. Reference: <b className="text-dark">{ref}</b></p></>)}
      </div>
    </div>
  );
}

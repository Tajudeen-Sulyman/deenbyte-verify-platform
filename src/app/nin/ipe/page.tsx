'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const input = 'w-full rounded-xl border border-border bg-light px-4 py-3 text-sm text-dark placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary';
const label = 'block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5';
const BADGE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200', awaiting_payment: 'bg-amber-50 text-amber-700 border-amber-200',
  processing: 'bg-blue-50 text-blue-700 border-blue-200', completed: 'bg-green-50 text-green-700 border-green-200', failed: 'bg-red-50 text-red-700 border-red-200',
};
const FEE = 450;

export default function IpePage() {
  const [f, setF] = useState({ trackingId: '', email: '', phone: '' });
  const [consent, setConsent] = useState(false);
  const [modal, setModal] = useState(false);
  const [ack, setAck] = useState(false);
  const [wallet, setWallet] = useState({ loggedIn: false, balance: 0 });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const load = () => fetch('/api/v1/ipe/history').then((r) => r.json()).then((j) => setRows(j.rows ?? [])).catch(() => {});
  useEffect(() => { fetch('/api/v1/taxid/me').then((r) => r.json()).then(setWallet).catch(() => {}); load(); }, []);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  async function submit(payMethod: 'wallet' | 'paystack') {
    if (!ack) { setModal(true); return; }
    setErr(''); setBusy(true);
    try {
      const res = await fetch('/api/v1/ipe/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, consent, payMethod }) });
      const json = await res.json();
      if (!res.ok) { setErr(json.error ?? 'Failed.'); return; }
      if (json.authorization_url) window.location.href = json.authorization_url;
      else { window.location.href = '/nin/ipe/success?reference=' + encodeURIComponent(json.reference); }
    } catch { setErr('Network error. Try again.'); } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-light pb-16">
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <h3 className="text-lg font-extrabold text-dark">Processing Timeline</h3>
            <p className="mt-3 text-sm text-muted">This service will be processed within <b className="text-dark">~24 hours</b>. Ensure the Tracking ID actually has an In-Processing Error issue.</p>
            <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-bold text-amber-700">No Refund Policy: non-refundable once queued, unless the provider auto-refunds (in which case your wallet is credited back).</p>
            <button onClick={() => { setAck(true); setModal(false); }} className="mt-4 w-full rounded-xl bg-primary text-white font-extrabold py-3.5 text-sm">I Understand</button>
          </div>
        </div>
      )}
      <header className="bg-emerald-950 text-white px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Link href="/dashboard" className="text-xs font-bold text-emerald-300">← Back to Dashboard</Link>
          <h1 className="mt-2 text-2xl font-extrabold">IPE Clearance</h1>
          <p className="mt-1 text-sm text-emerald-100">Clear In-Processing Errors on your NIN.</p>
        </div>
      </header>
      <main className="max-w-2xl mx-auto p-4 space-y-5 mt-5">
        <section className="rounded-2xl border border-border bg-white p-5 space-y-4">
          <span className="inline-block rounded-full bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 text-xs font-extrabold">🏷 PROCESSING FEE: ₦{FEE}</span>
          <div><label className={label}>NIMC Enrollment Tracking ID *</label>
            <input className={input} value={f.trackingId} onChange={set('trackingId')} placeholder="e.g. OSQT6M4S4RJISV1" />
            <p className="mt-1 text-[10px] text-muted">Found on your NIMC enrollment slip (usually 15 alphanumeric characters). • {f.trackingId.length} chars</p></div>
          <div><label className={label}>Email *</label><input className={input} type="email" value={f.email} onChange={set('email')} placeholder="your@email.com" /></div>
          <div><label className={label}>Phone *</label><input className={input} type="tel" value={f.phone} onChange={set('phone')} placeholder="e.g. 08012345678" /></div>
          <label className="flex items-start gap-3 text-xs text-muted">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-emerald-700" />
            <span>I confirm that I am the applicant or hold lawful authorization to request IPE clearance for this Tracking ID in accordance with the <b className="text-dark">Nigeria Data Protection Act (NDPA) 2023</b>.</span>
          </label>
          {err && <p className="text-xs font-bold text-red-700">{err}</p>}
          {!wallet.loggedIn ? (
            <Link href="/login" className="block w-full rounded-xl bg-primary text-white font-extrabold py-4 text-center text-sm">LOGIN TO APPLY</Link>
          ) : (<>
            {wallet.balance >= FEE && (
              <button onClick={() => submit('wallet')} disabled={busy} className="w-full rounded-xl bg-primary text-white font-extrabold py-4 text-sm disabled:opacity-60">
                {busy ? 'Processing…' : 'PAY ₦' + FEE + ' FROM WALLET'}
              </button>
            )}
            <button onClick={() => submit('paystack')} disabled={busy} className="w-full rounded-xl bg-emerald-950 text-white font-extrabold py-4 text-sm disabled:opacity-60">
              {busy ? 'Redirecting…' : 'SUBMIT IPE CLEARANCE • ₦' + FEE}
            </button>
          </>)}
        </section>
        <section>
          <h2 className="text-sm font-extrabold text-dark mb-2">IPE History &amp; Status</h2>
          <div className="space-y-3">
            {rows.length === 0 && <p className="rounded-2xl border border-dashed border-border bg-white p-6 text-center text-xs text-muted">No IPE requests yet.</p>}
            {rows.map((r) => (
              <div key={r.reference} className="rounded-2xl border border-border bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-dark">IPE Clearance</p>
                    <p className="text-[10px] text-muted">{r.reference} • {new Date(r.created_at).toLocaleString()} • TRK: {r.tracking_id}</p>
                  </div>
                  <span className={'rounded-full border px-2 py-1 text-[10px] font-bold ' + (BADGE[r.status] ?? '')}>{r.status}</span>
                </div>
                {r.result_text && <p className="mt-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-[11px] text-green-800">{r.result_text}</p>}
                {r.status === 'failed' && <p className="mt-2 text-[11px] text-red-700">{r.error_message || 'Failed. Contact support.'}</p>}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

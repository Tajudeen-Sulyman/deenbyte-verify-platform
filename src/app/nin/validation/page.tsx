'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const input = 'w-full rounded-xl border border-border bg-light px-4 py-3 text-sm text-dark placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary';
const label = 'block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5';
const BADGE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200', awaiting_payment: 'bg-amber-50 text-amber-700 border-amber-200',
  processing: 'bg-blue-50 text-blue-700 border-blue-200', completed: 'bg-green-50 text-green-700 border-green-200', failed: 'bg-red-50 text-red-700 border-red-200',
};
const CATS = [
  { id: 'no_record', title: 'No Record Found', desc: 'Resolve NIN records showing No Record.', fee: 1100 },
  { id: 'sim_vnin', title: 'SIM/Bank & VNIN Validation', desc: 'Fix SIM/Bank verification & VNIN sync issues.', fee: 1100 },
  { id: 'modification', title: 'Modification Validation', desc: 'Validate recent modifications not reflecting.', fee: 1600 },
  { id: 'photographic', title: 'Photographic Error', desc: 'Resolve biometric/photo capture errors.', fee: 1600 },
];

export default function NinValidationPage() {
  const [cat, setCat] = useState<any>(null);
  const [modal, setModal] = useState(false);
  const [ack, setAck] = useState<Record<string, boolean>>({});
  const [f, setF] = useState({ nin: '', email: '', phone: '' });
  const [consent, setConsent] = useState(false);
  const [wallet, setWallet] = useState({ loggedIn: false, balance: 0 });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const load = () => fetch('/api/v1/ninval/history').then((r) => r.json()).then((j) => setRows(j.rows ?? [])).catch(() => {});
  useEffect(() => { fetch('/api/v1/taxid/me').then((r) => r.json()).then(setWallet).catch(() => {}); load(); }, []);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  function pick(c: any) { setCat(c); if (!ack[c.id]) setModal(true); }

  async function submit(payMethod: 'wallet' | 'paystack') {
    setErr(''); setBusy(true);
    try {
      const res = await fetch('/api/v1/ninval/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, category: cat.id, consent, payMethod }) });
      const json = await res.json();
      if (!res.ok) { setErr(json.error ?? 'Failed.'); return; }
      if (json.authorization_url) window.location.href = json.authorization_url;
      else window.location.href = '/nin/validation/success?reference=' + encodeURIComponent(json.reference);
    } catch { setErr('Network error. Try again.'); } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-light pb-16">
      {modal && cat && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <h3 className="text-lg font-extrabold text-dark">Processing Timeline</h3>
            <p className="mt-3 text-sm text-muted">This service will be processed within <b className="text-dark">24–48 hours</b> (official portal reflection may take up to 72 hours).</p>
            <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-bold text-amber-700">No Refund Policy: non-refundable once queued, as provider fulfillment costs are billed 100% upfront.</p>
            <button onClick={() => { setAck({ ...ack, [cat.id]: true }); setModal(false); }} className="mt-4 w-full rounded-xl bg-primary text-white font-extrabold py-3.5 text-sm">I Understand</button>
          </div>
        </div>
      )}
      <header className="bg-violet-950 text-white px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Link href="/dashboard" className="text-xs font-bold text-violet-300">← Back to Dashboard</Link>
          <h1 className="mt-2 text-2xl font-extrabold">NIN Validation</h1>
          <p className="mt-1 text-sm text-violet-100">Validate your NIN record, VNIN sync, or record modifications.</p>
        </div>
      </header>
      <main className="max-w-2xl mx-auto p-4 space-y-5 mt-5">
        <section className="rounded-2xl border border-border bg-white p-5">
          <h2 className="text-sm font-extrabold text-dark">1. Select Validation Category</h2>
          <div className="space-y-3 mt-3">
            {CATS.map((c) => (
              <button key={c.id} onClick={() => pick(c)} className={'w-full rounded-xl border-2 p-4 text-left ' + (cat?.id === c.id ? 'border-violet-700 bg-violet-50' : 'border-border bg-white')}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-extrabold text-dark">{c.title}</p>
                  <span className="rounded-full bg-green-50 border border-green-200 text-green-700 px-2.5 py-1 text-[10px] font-extrabold">₦{c.fee.toLocaleString('en-NG')}</span>
                </div>
                <p className="mt-1 text-xs text-muted">{c.desc}</p>
              </button>
            ))}
          </div>
        </section>
        {cat && (
          <section className="rounded-2xl border border-border bg-white p-5 space-y-4">
            <div><label className={label}>National Identity Number (NIN) *</label>
              <input className={input} inputMode="numeric" maxLength={11} value={f.nin} onChange={set('nin')} placeholder="Enter 11-digit NIN" />
              <p className="mt-1 text-[10px] text-muted">{f.nin.length}/11 digits</p></div>
            <div><label className={label}>Email *</label><input className={input} type="email" value={f.email} onChange={set('email')} placeholder="your@email.com" /></div>
            <div><label className={label}>Phone *</label><input className={input} type="tel" value={f.phone} onChange={set('phone')} placeholder="e.g. 08012345678" /></div>
            <label className="flex items-start gap-3 text-xs text-muted">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-violet-700" />
              <span>I confirm that I am the applicant or hold lawful authorization to request this validation in accordance with the <b className="text-dark">Nigeria Data Protection Act (NDPA) 2023</b>, and I authorize the fee of <b className="text-dark">₦{cat.fee.toLocaleString('en-NG')}</b> to be debited.</span>
            </label>
            {err && <p className="text-xs font-bold text-red-700">{err}</p>}
            {!wallet.loggedIn ? (
              <Link href="/login" className="block w-full rounded-xl bg-primary text-white font-extrabold py-4 text-center text-sm">LOGIN TO APPLY</Link>
            ) : (<>
              {wallet.balance >= cat.fee && (
                <button onClick={() => submit('wallet')} disabled={busy} className="w-full rounded-xl bg-primary text-white font-extrabold py-4 text-sm disabled:opacity-60">
                  {busy ? 'Processing…' : 'PAY ₦' + cat.fee.toLocaleString('en-NG') + ' FROM WALLET'}
                </button>
              )}
              <button onClick={() => submit('paystack')} disabled={busy} className="w-full rounded-xl bg-violet-950 text-white font-extrabold py-4 text-sm disabled:opacity-60">
                {busy ? 'Redirecting…' : 'SUBMIT • PAY ₦' + cat.fee.toLocaleString('en-NG')}
              </button>
            </>)}
          </section>
        )}
        <section>
          <h2 className="text-sm font-extrabold text-dark mb-2">Validation History</h2>
          <div className="space-y-3">
            {rows.length === 0 && <p className="rounded-2xl border border-dashed border-border bg-white p-6 text-center text-xs text-muted">No validation requests yet.</p>}
            {rows.map((r) => (
              <div key={r.reference} className="rounded-2xl border border-border bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-dark">{CATS.find((c) => c.id === r.category)?.title ?? r.category}</p>
                    <p className="text-[10px] text-muted">{r.reference} • {new Date(r.created_at).toLocaleString()} • NIN: {r.nin}</p>
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

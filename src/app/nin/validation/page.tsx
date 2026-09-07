'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { VAL_FEE, SLIP_PREMIUM, VAL_CATEGORIES } from '@/lib/val-data';

const input = 'w-full rounded-xl border border-border bg-light px-4 py-3 text-sm text-dark placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary';

export default function ValidationPage() {
  const [cat, setCat] = useState(VAL_CATEGORIES[0]);
  const [slip, setSlip] = useState<'nonprem' | 'prem'>('nonprem');
  const [nin, setNin] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [wallet, setWallet] = useState({ loggedIn: false, balance: 0 });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [view, setView] = useState<any>(null);
  const fee = VAL_FEE + (slip === 'prem' ? SLIP_PREMIUM : 0);
  const load = () => { fetch('/api/v1/taxid/me').then((r) => r.json()).then(setWallet).catch(() => {}); fetch('/api/v1/ninval/history').then((r) => r.json()).then((j) => setRows(j.rows ?? [])).catch(() => {}); };
  useEffect(() => { load(); }, []);
  async function submit(payMethod: 'wallet' | 'paystack') {
    setErr(''); setBusy(true);
    try {
      const res = await fetch('/api/v1/ninval/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category: cat, slip_type: slip, nin, email, phone, consent, payMethod }) });
      const j = await res.json();
      if (!res.ok) { setErr(j.error ?? 'Failed.'); return; }
      if (j.authorization_url) window.location.href = j.authorization_url;
      else { load(); setNin(''); }
    } catch { setErr('Network error.'); } finally { setBusy(false); }
  }
  async function check(reference: string) {
    setBusy(true);
    await fetch('/api/v1/ninval/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reference }) }).catch(() => {});
    load(); setBusy(false);
  }
  return (
    <div className="min-h-screen bg-light pb-16">
      <header className="vibe-mesh bg-violet-950 text-white px-4 py-6">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-700 text-2xl"></div>
          <div>
            <h1 className="text-xl font-extrabold">Validation</h1>
            <p className="text-xs text-violet-200">NIN validation request</p>
          </div>
        </div>
        <div className="max-w-2xl mx-auto mt-4">
          <span className="inline-block rounded-full border border-amber-300/40 bg-amber-100/10 px-4 py-2 text-xs font-bold text-amber-200">🕐 Processing time: 24h to 48h</span>
        </div>
      </header>
      <main className="max-w-2xl mx-auto p-4 space-y-4 mt-4">
        <section className="card3d rounded-2xl bg-white p-5">
          <p className="text-sm font-extrabold text-dark"><span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-xs text-white">1</span>DETAILS NEEDED</p>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {VAL_CATEGORIES.map((c) => (
              <button key={c} onClick={() => setCat(c)} className={'rounded-xl border p-3 text-center ' + (cat === c ? 'border-primary bg-primary/10' : 'border-border bg-light')}>
                <p className="text-sm font-extrabold text-dark">₦{VAL_FEE.toLocaleString('en-NG')}</p>
                <p className="mt-1 text-[11px] font-bold text-muted">{c}</p>
              </button>
            ))}
          </div>
        </section>
        <section className="card3d rounded-2xl bg-white p-5">
          <p className="text-sm font-extrabold text-dark"><span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-xs text-white">2</span>SLIP TYPE</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button onClick={() => setSlip('nonprem')} className={'rounded-xl border p-4 text-center ' + (slip === 'nonprem' ? 'border-primary bg-primary/10' : 'border-border bg-light')}>
              <p className="text-sm font-extrabold text-dark">₦0.00</p>
              <p className="mt-2 text-2xl text-muted">✕</p>
              <p className="mt-1 text-[11px] font-bold text-muted">No Slip</p>
            </button>
            <button onClick={() => setSlip('prem')} className={'rounded-xl border p-4 text-center ' + (slip === 'prem' ? 'border-primary bg-primary/10' : 'border-border bg-light')}>
              <p className="text-sm font-extrabold text-dark">+₦{SLIP_PREMIUM.toLocaleString('en-NG')}</p>
              <p className="mt-2 text-2xl">🪪</p>
              <p className="mt-1 text-[11px] font-bold text-muted">Premium Slip</p>
            </button>
          </div>
        </section>
        <section className="card3d rounded-2xl bg-white p-5 space-y-4">
          <p className="text-sm font-extrabold text-dark"><span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-xs text-white">3</span>SUPPLY TRACKING / NIN</p>
          <input className={input} value={nin} onChange={(e) => setNin(e.target.value)} placeholder="Enter Tracking ID / NIN" inputMode="numeric" />
          <div className="grid grid-cols-2 gap-3">
            <input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
            <input className={input} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" />
          </div>
          <label className="flex items-start gap-3 rounded-xl bg-light p-3 text-xs text-muted">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-violet-700" />
            <span>By checking this box, you agree that the owner of the ID has granted you consent to verify his/her identity (NDPA 2023).</span>
          </label>
          {err && <p className="text-xs font-bold text-red-700">{err}</p>}
          {!wallet.loggedIn ? (
            <Link href="/login" className="block w-full rounded-xl bg-primary py-4 text-center text-sm font-extrabold text-white">LOGIN TO SUBMIT</Link>
          ) : (<>
            {wallet.balance >= fee && <button onClick={() => submit('wallet')} disabled={busy || !consent} className="w-full rounded-xl bg-primary py-4 text-sm font-extrabold text-white disabled:opacity-60">PAY ₦{fee.toLocaleString('en-NG')} FROM WALLET</button>}
            <button onClick={() => submit('paystack')} disabled={busy || !consent} className="w-full rounded-xl bg-violet-950 py-4 text-sm font-extrabold text-white disabled:opacity-60">SUBMIT • PAY ₦{fee.toLocaleString('en-NG')}</button>
          </>)}
        </section>
        <section className="space-y-3">
          <p className="text-sm font-extrabold text-dark">Validation History</p>
          {rows.length === 0 && <p className="card3d rounded-2xl bg-white p-6 text-center text-xs text-muted">No validation requests yet.</p>}
          {rows.map((r) => (
            <div key={r.reference} className="card3d rounded-2xl bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-extrabold text-dark">{r.category}</p>
                  <p className="text-[10px] text-muted">{r.reference} • ₦{Number(r.fee).toLocaleString('en-NG')} • {new Date(r.created_at).toLocaleDateString()}</p>
                </div>
                <span className={'rounded-full px-2 py-1 text-[10px] font-bold ' + (r.status === 'completed' ? 'bg-green-50 text-green-700' : r.status === 'failed' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700')}>{r.status}</span>
              </div>
              <div className="mt-3 flex gap-2">
                {r.status !== 'completed' && r.status !== 'failed' && <button onClick={() => check(r.reference)} disabled={busy} className="rounded-lg bg-primary px-3 py-2 text-[10px] font-extrabold text-white disabled:opacity-60">Check status</button>}
                {r.status === 'completed' && r.slip && <button onClick={() => setView(r)} className="rounded-lg bg-green-600 px-3 py-2 text-[10px] font-extrabold text-white">View slip</button>}
              </div>
            </div>
          ))}
        </section>
      </main>
      {view && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setView(null)}>
          <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-extrabold text-dark">Validation Slip</p>
              <button onClick={() => setView(null)} className="text-xs font-bold text-muted">✕</button>
            </div>
            {view.slip?.photo && <img src={view.slip.photo} alt="photo" className="mt-3 h-32 w-32 rounded-xl object-cover" />}
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
              {Object.entries(view.slip ?? {}).filter(([k]) => !['photo', 'signature'].includes(k)).map(([k, v]: any) => (
                <p key={k} className="text-muted"><b className="text-dark">{k}:</b> {String(v)}</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

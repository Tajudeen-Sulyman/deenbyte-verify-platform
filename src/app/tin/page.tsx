'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const input = 'w-full rounded-xl border border-border bg-light px-4 py-3 text-sm text-dark placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary';
const label = 'block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5';
const CATS = ['Business Name', 'Company (LLC)', 'Incorporated Trustee', 'Limited Partnership', 'Limited Liability Partnership'];

export default function TinPage() {
  const [type, setType] = useState<'individual' | 'non_individual'>('individual');
  const [f, setF] = useState({ nin: '', firstName: '', lastName: '', dob: '', rcNumber: '', category: '', orgName: '', email: '', phone: '' });
  const [consent, setConsent] = useState(false);
  const [wallet, setWallet] = useState({ loggedIn: false, balance: 0 });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: any) => setF({ ...f, [k]: e.target.value });
  const fee = type === 'individual' ? 500 : 1000;

  useEffect(() => { fetch('/api/v1/taxid/me').then((r) => r.json()).then(setWallet).catch(() => {}); }, []);

  async function submit(payMethod: 'wallet' | 'paystack') {
    setErr(''); setBusy(true);
    try {
      const res = await fetch('/api/v1/tin/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, type, consent, payMethod }) });
      const json = await res.json();
      if (!res.ok) { setErr(json.error ?? 'Failed.'); return; }
      if (json.authorization_url) window.location.href = json.authorization_url;
      else window.location.href = '/tin/success?reference=' + encodeURIComponent(json.reference);
    } catch { setErr('Network error. Try again.'); } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-light pb-16">
      <header className="bg-violet-950 text-white px-4 py-8 text-center">
        <h1 className="text-2xl font-extrabold">Generate Tax ID (TIN)</h1>
        <p className="mt-1 text-sm text-violet-100">Get your 13-digit Tax Identification Number — processed for you by DeenByte Verify.</p>
        <Link href="/tin/history" className="mt-4 inline-block rounded-xl bg-white/10 px-4 py-2.5 text-xs font-bold">≡ View History &amp; Status →</Link>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-5 mt-5">
        <section className="rounded-2xl border border-border bg-white p-5">
          <h2 className="text-sm font-extrabold text-dark">1. Select Request Type</h2>
          <div className="grid grid-cols-2 gap-2 mt-3 rounded-xl bg-light p-1">
            <button onClick={() => setType('individual')} className={'rounded-lg py-2.5 text-xs font-bold ' + (type === 'individual' ? 'bg-violet-800 text-white' : 'text-muted')}>Individual (NIN)</button>
            <button onClick={() => setType('non_individual')} className={'rounded-lg py-2.5 text-xs font-bold ' + (type === 'non_individual' ? 'bg-violet-800 text-white' : 'text-muted')}>Non-Individual (CAC)</button>
          </div>
          <span className="mt-3 inline-block rounded-full bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 text-xs font-extrabold">🏷 PROCESSING FEE: ₦{fee.toLocaleString('en-NG')}</span>
        </section>

        {type === 'individual' ? (
          <section className="rounded-2xl border border-border bg-white p-5 space-y-4">
            <div><label className={label}>National Identity Number (NIN) *</label><input className={input} inputMode="numeric" maxLength={11} value={f.nin} onChange={set('nin')} placeholder="Enter your 11-digit NIN" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label}>First Name *</label><input className={input} value={f.firstName} onChange={set('firstName')} placeholder="e.g. John" /></div>
              <div><label className={label}>Last Name *</label><input className={input} value={f.lastName} onChange={set('lastName')} placeholder="e.g. Doe" /></div>
            </div>
            <div><label className={label}>Date of Birth *</label><input className={input} type="date" value={f.dob} onChange={set('dob')} /></div>
          </section>
        ) : (
          <section className="rounded-2xl border border-border bg-white p-5 space-y-4">
            <div><label className={label}>CAC Registration Number *</label><input className={input} value={f.rcNumber} onChange={set('rcNumber')} placeholder="e.g. RC123456 or BN987654" /></div>
            <div><label className={label}>Registration Category *</label>
              <select className={input} value={f.category} onChange={set('category')}>
                <option value="">Select your CAC Category…</option>
                {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><label className={label}>Organization Name (optional)</label><input className={input} value={f.orgName} onChange={set('orgName')} placeholder="e.g. DEENBYTE TECHNOLOGIES" /></div>
          </section>
        )}

        <section className="rounded-2xl border border-border bg-white p-5 space-y-4">
          <h2 className="text-sm font-extrabold text-dark">2. Delivery Details</h2>
          <div><label className={label}>Email address *</label><input className={input} type="email" value={f.email} onChange={set('email')} placeholder="your@email.com" /></div>
          <div><label className={label}>Phone number *</label><input className={input} type="tel" value={f.phone} onChange={set('phone')} placeholder="e.g. 08012345678" /></div>
        </section>

        <section className="rounded-2xl border border-border bg-white p-5">
          <label className="flex items-start gap-3 text-xs text-muted">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-violet-700" />
            <span>I hereby declare under the <b className="text-dark">Nigeria Data Protection Act (NDPA) 2023</b> that I am the applicant or authorized corporate proxy for this entity, and authorize <b className="text-dark">DeenByte Verify</b> to process this tax identity application with relevant revenue authorities.</span>
          </label>
          {err && <p className="mt-3 text-xs font-bold text-red-700">{err}</p>}
          {!wallet.loggedIn ? (
            <Link href="/login" className="mt-4 block w-full rounded-xl bg-primary text-white font-extrabold py-4 text-center text-sm">LOGIN TO APPLY</Link>
          ) : (
            <>
              {wallet.balance >= fee && (
                <button onClick={() => submit('wallet')} disabled={busy} className="mt-4 w-full rounded-xl bg-primary text-white font-extrabold py-4 text-sm disabled:opacity-60">
                  {busy ? 'Processing…' : 'PAY ₦' + fee.toLocaleString('en-NG') + ' FROM WALLET (BALANCE: ₦' + wallet.balance.toLocaleString('en-NG') + ')'}
                </button>
              )}
              <button onClick={() => submit('paystack')} disabled={busy} className="mt-3 w-full rounded-xl bg-violet-950 text-white font-extrabold py-4 text-sm disabled:opacity-60">
                {busy ? 'Redirecting…' : 'PAY ₦' + fee.toLocaleString('en-NG') + ' WITH CARD / BANK TRANSFER'}
              </button>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

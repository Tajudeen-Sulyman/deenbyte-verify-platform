'use client';
import { useState } from 'react';

const input = 'w-full rounded-xl border border-border bg-light px-4 py-3 text-sm text-dark placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary';
const label = 'block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5';

export default function TaxIdPage() {
  const [tier, setTier] = useState<'standard' | 'premium'>('premium');
  const [slipType, setSlipType] = useState<'individual' | 'corporate'>('individual');
  const [f, setF] = useState({ firstName: '', lastName: '', middleName: '', address: '', tin: '', fullName: '', email: '', phone: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [rec, setRec] = useState('');
  const set = (k: keyof typeof f) => (e: any) => setF({ ...f, [k]: e.target.value });
  const price = 50; // TEST PRICE

  async function pay() {
    setErr(''); setBusy(true);
    try {
      const res = await fetch('/api/v1/taxid/initialize', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, tier, slipType }),
      });
      const json = await res.json();
      if (!res.ok) { setErr(json.error ?? 'Failed to start payment.'); return; }
      window.location.href = json.authorization_url;
    } catch { setErr('Network error. Try again.'); } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-light pb-16">
      <header className="bg-emerald-950 text-white text-center px-4 py-12">
        <div className="mx-auto h-16 w-16 rounded-full border-4 border-emerald-400 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-emerald-300"><path d="M5 13l4 4L19 7" /></svg>
        </div>
        <p className="mt-4 text-xs font-bold tracking-[0.25em] text-emerald-300">DEENBYTE VERIFY</p>
        <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold">Get Your TIN Verification Slip</h1>
        <p className="mt-3 text-sm text-emerald-100 max-w-md mx-auto">No account. No wallet funding. Pay once, and your slip is ready in under 90 seconds.</p>
        <span className="inline-flex items-center gap-2 mt-5 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold"><span className="h-2 w-2 rounded-full bg-emerald-400" />Verified &amp; instant</span>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-5 mt-5">
        <section className="rounded-2xl border border-border bg-white p-5">
          <h2 className="flex items-center gap-3 text-sm font-extrabold tracking-widest text-emerald-950"><span className="h-8 w-8 rounded-full bg-emerald-950 text-white text-sm font-bold flex items-center justify-center">1</span>CHOOSE YOUR SLIP</h2>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <button onClick={() => setTier('standard')} className={'relative rounded-xl border-2 p-4 text-center ' + (tier === 'standard' ? 'border-emerald-700 bg-emerald-50' : 'border-border bg-white')}>
              <p className="text-base font-extrabold text-dark">STANDARD</p>
              <p className="text-xs text-muted mt-1">Validation summary slip</p>
              <p className="text-lg font-extrabold text-emerald-800 mt-2">₦50</p>
            </button>
            <button onClick={() => setTier('premium')} className={'relative rounded-xl border-2 p-4 text-center ' + (tier === 'premium' ? 'border-emerald-700 bg-emerald-50' : 'border-border bg-white')}>
              <span className="absolute -top-3 right-3 rounded-full bg-red-700 text-white text-[10px] font-bold px-2 py-0.5">POPULAR</span>
              <p className="text-base font-extrabold text-dark">PREMIUM</p>
              <p className="text-xs text-muted mt-1">Certificate-style slip with seal &amp; QR</p>
              <p className="text-lg font-extrabold text-red-700 mt-2">₦50</p>
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-white p-5">
          <h2 className="flex items-center gap-3 text-sm font-extrabold tracking-widest text-emerald-950"><span className="h-8 w-8 rounded-full bg-emerald-950 text-white text-sm font-bold flex items-center justify-center">2</span>SELECT SLIP TYPE</h2>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <button onClick={() => setSlipType('corporate')} className={'rounded-xl border-2 p-4 text-center ' + (slipType === 'corporate' ? 'border-emerald-700 bg-emerald-50' : 'border-border bg-white')}>
              <p className="text-2xl">🏢</p>
              <p className="font-bold text-dark mt-1">Corporate</p>
              <p className="text-xs text-muted">For registered businesses</p>
            </button>
            <button onClick={() => setSlipType('individual')} className={'rounded-xl border-2 p-4 text-center ' + (slipType === 'individual' ? 'border-emerald-700 bg-emerald-50' : 'border-border bg-white')}>
              <p className="text-2xl">👤</p>
              <p className="font-bold text-dark mt-1">Individual</p>
              <p className="text-xs text-muted">For personal TIN</p>
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-white p-5">
          <h2 className="flex items-center gap-3 text-sm font-extrabold tracking-widest text-emerald-950"><span className="h-8 w-8 rounded-full bg-emerald-950 text-white text-sm font-bold flex items-center justify-center">3</span>ENTER YOUR DETAILS</h2>
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <div><label className={label}>First name *</label><input className={input} value={f.firstName} onChange={set('firstName')} placeholder="e.g. JENNIFER" /></div>
            <div><label className={label}>Last name *</label><input className={input} value={f.lastName} onChange={set('lastName')} placeholder="e.g. OKAFOR" /></div>
            <div><label className={label}>Middle name (optional)</label><input className={input} value={f.middleName} onChange={set('middleName')} placeholder="e.g. OGONNA" /></div>
            <div><label className={label}>Tax ID number *</label><input className={input} value={f.tin} onChange={set('tin')} placeholder="e.g. 2510405078938" inputMode="numeric" /></div>
          </div>
          <div className="mt-4"><label className={label}>Residential address (optional)</label><textarea className={input} rows={2} value={f.address} onChange={set('address')} placeholder="e.g. 55 Isaiah Nwafor Road, Uruagu Nnewi" /></div>
          <a href="https://taxid.nrs.gov.ng" target="_blank" rel="noreferrer" className="inline-block mt-3 text-xs font-bold text-red-700">▶ Don&apos;t know your TIN? Get it free from the official portal</a>
        </section>

        <section className="rounded-2xl border border-border bg-white p-5">
          <h2 className="flex items-center gap-3 text-sm font-extrabold tracking-widest text-emerald-950"><span className="h-8 w-8 rounded-full bg-emerald-950 text-white text-sm font-bold flex items-center justify-center">4</span>DELIVERY DETAILS</h2>
          <div className="space-y-4 mt-4">
            <div><label className={label}>Your full name *</label><input className={input} value={f.fullName} onChange={set('fullName')} placeholder="Name for slip greeting" /></div>
            <div><label className={label}>Email address * (slip reference sent here)</label><input className={input} type="email" value={f.email} onChange={set('email')} placeholder="your@email.com" /></div>
            <div><label className={label}>Phone number *</label><input className={input} type="tel" value={f.phone} onChange={set('phone')} placeholder="e.g. 08012345678" /></div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-white p-5">
          <h2 className="flex items-center gap-3 text-sm font-extrabold tracking-widest text-emerald-950"><span className="h-8 w-8 rounded-full bg-emerald-950 text-white text-sm font-bold flex items-center justify-center">5</span>PAYMENT</h2>
          <div className="mt-4 rounded-xl bg-emerald-950 text-white px-4 py-4 flex items-center justify-between">
            <span className="text-sm font-semibold">{tier === 'premium' ? 'Premium' : 'Standard'} {slipType === 'corporate' ? 'Corporate' : 'Individual'} TIN Slip</span>
            <span className="text-xl font-extrabold text-white">₦{price}</span>
          </div>
          {err && <p className="mt-3 text-xs font-bold text-red-700">{err}</p>}
          <button onClick={pay} disabled={busy} className="mt-4 w-full rounded-xl bg-primary text-white font-extrabold py-4 text-sm disabled:opacity-60">
            {busy ? 'Redirecting…' : '🔒 PAY ₦' + price + ' & GET MY TIN SLIP'}
          </button>
          <div className="flex flex-wrap justify-center gap-4 mt-4 text-[11px] text-muted">
            <span>🔒 Secured by Paystack</span><span>⚡ Instant delivery</span><span>✅ Verified slips</span>
          </div>
        </section>

        <section className="rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50 p-5">
          <h3 className="text-sm font-extrabold text-emerald-950">⚠️ ALREADY PAID BUT DIDN&apos;T GET YOUR SLIP?</h3>
          <p className="text-xs text-muted mt-1">Enter your payment reference to verify and download your slip again.</p>
          <label className={label + ' mt-3'}>Payment reference</label>
          <input className={input} value={rec} onChange={(e) => setRec(e.target.value)} placeholder="e.g. TAXID-1788420975000" />
          <a href={rec.trim() ? '/taxid/success?reference=' + encodeURIComponent(rec.trim()) : '#'} className="mt-3 block w-full rounded-xl border-2 border-emerald-900 text-emerald-950 font-extrabold py-3 text-center text-sm">VERIFY &amp; DOWNLOAD MY SLIP</a>
        </section>
      </main>
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CAC_FEES } from '@/lib/cac-data';

const input = 'w-full rounded-xl border border-border bg-light px-4 py-3 text-sm text-dark placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary';
const label = 'block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5';

export default function AnnualReturnsPage() {
  const [structure, setStructure] = useState<'bn' | 'ltd'>('bn');
  const [f, setF] = useState({ officialName: '', regNumber: '', filingYear: '2026', officerName: '', officerRole: 'Proprietor / Business Owner', email: '', phone: '' });
  const [docType, setDocType] = useState('certificate');
  const [doc, setDoc] = useState(''); const [docName, setDocName] = useState('');
  const [consent, setConsent] = useState(false);
  const [wallet, setWallet] = useState({ loggedIn: false, balance: 0 });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { fetch('/api/v1/taxid/me').then((r) => r.json()).then(setWallet).catch(() => {}); }, []);
  const fee = structure === 'ltd' ? CAC_FEES.ar_ltd : CAC_FEES.ar_bn;
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  function onFile(e: any) {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 2000000) { setErr('Max 2MB.'); return; }
    setErr(''); setDocName(file.name);
    const r = new FileReader();
    r.onload = () => setDoc(String(r.result ?? '').split(',')[1] ?? '');
    r.readAsDataURL(file);
  }
  async function submit(payMethod: 'wallet' | 'paystack') {
    setErr(''); setBusy(true);
    try {
      const res = await fetch('/api/v1/cac/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entity: 'annual_returns', structure, company: f, docs: { '0_cert': doc }, consent, payMethod, phone: f.phone }) });
      const json = await res.json();
      if (!res.ok) { setErr(json.error ?? 'Failed.'); return; }
      if (json.authorization_url) window.location.href = json.authorization_url;
      else window.location.href = '/cac/history?reference=' + encodeURIComponent(json.reference);
    } catch { setErr('Network error.'); } finally { setBusy(false); }
  }
  return (
    <div className="min-h-screen bg-light pb-16">
      <header className="bg-violet-950 text-white px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <Link href="/cac" className="text-xs font-bold text-violet-300">← Back to CAC Hub</Link>
          <h1 className="mt-1 text-xl font-extrabold">CAC Annual Returns</h1>
          <p className="text-xs text-violet-200">Official statutory compliance filing for Business Names and Limited Liability Companies.</p>
        </div>
      </header>
      <main className="max-w-2xl mx-auto p-4 space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setStructure('bn')} className={'card3d rounded-2xl p-4 text-left ' + (structure === 'bn' ? 'border-2 border-primary bg-white' : 'bg-white')}>
            <p className="text-xs font-extrabold text-dark">Business Name / Enterprise</p>
            <p className="mt-1 text-sm font-extrabold text-primary">₦{CAC_FEES.ar_bn.toLocaleString('en-NG')}</p>
          </button>
          <button onClick={() => setStructure('ltd')} className={'card3d rounded-2xl p-4 text-left ' + (structure === 'ltd' ? 'border-2 border-primary bg-white' : 'bg-white')}>
            <p className="text-xs font-extrabold text-dark">Limited Liability Company</p>
            <p className="mt-1 text-sm font-extrabold text-primary">₦{CAC_FEES.ar_ltd.toLocaleString('en-NG')}</p>
          </button>
        </div>
        <section className="card3d rounded-2xl bg-white p-5 space-y-4">
          <div><label className={label}>Official Registered Name *</label>
            <input className={input} value={f.officialName} onChange={set('officialName')} placeholder="e.g. ACME GLOBAL VENTURES & LOGISTICS" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>CAC Registration Number *</label>
              <input className={input} value={f.regNumber} onChange={set('regNumber')} placeholder={structure === 'ltd' ? 'e.g. RC 1234567' : 'e.g. BN 3829104'} /></div>
            <div><label className={label}>Filing Year *</label>
              <input className={input} inputMode="numeric" maxLength={4} value={f.filingYear} onChange={set('filingYear')} /></div>
          </div>
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3">
            <p className="text-[11px] font-bold text-amber-800">Upload either CAC Certificate OR Status Report (only one required)</p>
          </div>
          <div className="flex gap-4 text-xs font-bold text-dark">
            <label className="flex items-center gap-2"><input type="radio" checked={docType === 'certificate'} onChange={() => setDocType('certificate')} className="accent-violet-700" />CAC Certificate</label>
            <label className="flex items-center gap-2"><input type="radio" checked={docType === 'report'} onChange={() => setDocType('report')} className="accent-violet-700" />CAC Status Report</label>
          </div>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={onFile} className="w-full text-xs text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-xs file:font-bold file:text-white" />
          {docName && <p className="text-[10px] font-bold text-green-700">✓ {docName} ({docType})</p>}
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Authorizing Officer Name *</label>
              <input className={input} value={f.officerName} onChange={set('officerName')} placeholder="e.g. Babatunde Adeyemi" /></div>
            <div><label className={label}>Designation / Role *</label>
              <select className={input} value={f.officerRole} onChange={set('officerRole')}>
                <option>Proprietor / Business Owner</option><option>Director</option><option>Company Secretary</option>
              </select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Email *</label><input className={input} type="email" value={f.email} onChange={set('email')} /></div>
            <div><label className={label}>Phone *</label><input className={input} type="tel" value={f.phone} onChange={set('phone')} /></div>
          </div>
          <label className="flex items-start gap-3 text-xs text-muted">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-violet-700" />
            <span>I confirm the registered details match the CAC portal record and authorize the filing fee of <b className="text-dark">₦{fee.toLocaleString('en-NG')}</b>.</span>
          </label>
          {err && <p className="text-xs font-bold text-red-700">{err}</p>}
          {!wallet.loggedIn ? (
            <Link href="/login" className="block w-full rounded-xl bg-primary py-4 text-center text-sm font-extrabold text-white">LOGIN TO FILE</Link>
          ) : (<>
            {wallet.balance >= fee && <button onClick={() => submit('wallet')} disabled={busy || !consent} className="w-full rounded-xl bg-primary py-4 text-sm font-extrabold text-white disabled:opacity-60">PAY ₦{fee.toLocaleString('en-NG')} FROM WALLET</button>}
            <button onClick={() => submit('paystack')} disabled={busy || !consent} className="w-full rounded-xl bg-violet-950 py-4 text-sm font-extrabold text-white disabled:opacity-60">PROCEED TO CONFIRMATION • ₦{fee.toLocaleString('en-NG')}</button>
          </>)}
        </section>
      </main>
    </div>
  );
}

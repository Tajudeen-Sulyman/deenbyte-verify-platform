'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const input = 'w-full rounded-xl border border-border bg-light px-4 py-3 text-sm text-dark placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary';
const label = 'block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5';
const FEE = 5800;

const SERVICES = [
  { id: 'name', title: 'Change of Name', desc: 'Update First Name, Surname, or Middle Name on your NIN record.' },
  { id: 'phone', title: 'Change of Phone', desc: 'Link a new active phone number to your National Identity record.' },
  { id: 'address', title: 'Change of Address', desc: 'Update your registered residential address, State, and LGA.' },
];

export default function NinModificationPage() {
  const [type, setType] = useState('');
  const [modal, setModal] = useState(false);
  const [ack, setAck] = useState<Record<string, boolean>>({});
  const [f, setF] = useState<any>({ nin: '', email: '', phone: '', curFirstname: '', curMiddlename: '', curLastname: '', newFirstname: '', newMiddlename: '', newLastname: '', curFullName: '', curPhone: '', newPhone: '', curAddress: '', newAddress: '', newState: '', newLga: '' });
  const [doc, setDoc] = useState(''); const [docName, setDocName] = useState('');
  const [consent, setConsent] = useState(false);
  const [wallet, setWallet] = useState({ loggedIn: false, balance: 0 });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  useEffect(() => { fetch('/api/v1/taxid/me').then((r) => r.json()).then(setWallet).catch(() => {}); }, []);

  function pick(id: string) {
    setType(id);
    if (!ack[id]) { setModal(true); }
  }
  function onFile(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1500000) { setErr('Document too large. Max 1.5MB.'); return; }
    setErr(''); setDocName(file.name);
    const r = new FileReader();
    r.onload = () => setDoc(String(r.result ?? '').split(',')[1] ?? '');
    r.readAsDataURL(file);
  }

  async function submit(payMethod: 'wallet' | 'paystack') {
    setErr(''); setBusy(true);
    try {
      const res = await fetch('/api/v1/ninmod/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, modType: type, docBase64: doc, docName, consent, payMethod }) });
      const json = await res.json();
      if (!res.ok) { setErr(json.error ?? 'Failed.'); return; }
      if (json.authorization_url) window.location.href = json.authorization_url;
      else window.location.href = '/nin/modification/success?reference=' + encodeURIComponent(json.reference);
    } catch { setErr('Network error. Try again.'); } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-light pb-16">
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <div className="flex items-center gap-3">
              <span className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">i</span>
              <h3 className="text-lg font-extrabold text-dark">Processing Timeline</h3>
            </div>
            <p className="mt-4 text-sm text-muted">This service will be processed within <b className="text-dark">1–48 hours</b> (official portal reflection may take longer).</p>
            <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-bold text-amber-700">No Refund Policy: This service is non-refundable once submitted, as provider fulfillment costs are billed 100% upfront.</p>
            <button onClick={() => { setAck({ ...ack, [type]: true }); setModal(false); }} className="mt-4 w-full rounded-xl bg-primary text-white font-extrabold py-3.5 text-sm">I Understand</button>
          </div>
        </div>
      )}

      <header className="bg-emerald-950 text-white px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Link href="/dashboard" className="text-xs font-bold text-emerald-300">← Back to Dashboard</Link>
          <h1 className="mt-2 text-2xl font-extrabold">NIN Modification</h1>
          <p className="mt-1 text-sm text-emerald-100">Official processing for Change of Name, Phone Number, and Address on your National Identity record.</p>
          <Link href="/nin/modification/history" className="mt-4 inline-block rounded-xl bg-white/10 px-4 py-2.5 text-xs font-bold">≡ Modification History →</Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-5 mt-5">
        <section className="rounded-2xl border border-border bg-white p-5">
          <span className="inline-block rounded-full bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 text-xs font-extrabold">🏷 PROCESSING FEE: ₦{FEE.toLocaleString('en-NG')}</span>
          <h2 className="mt-4 text-sm font-extrabold text-dark">SELECT MODIFICATION SERVICE</h2>
          <div className="space-y-3 mt-3">
            {SERVICES.map((s) => (
              <button key={s.id} onClick={() => pick(s.id)} className={'w-full rounded-xl border-2 p-4 text-left ' + (type === s.id ? 'border-emerald-700 bg-emerald-50' : 'border-border bg-white')}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-extrabold text-dark">{s.title}</p>
                  <span className="rounded-full bg-green-50 border border-green-200 text-green-700 px-2.5 py-1 text-[10px] font-extrabold">₦{FEE.toLocaleString('en-NG')}</span>
                </div>
                <p className="mt-1 text-xs text-muted">{s.desc}</p>
              </button>
            ))}
          </div>
        </section>

        {type && (
          <section className="rounded-2xl border border-border bg-white p-5 space-y-4">
            <h2 className="text-sm font-extrabold text-dark">{SERVICES.find((s) => s.id === type)?.title} Application Form</h2>
            <div><label className={label}>National Identification Number (NIN) *</label>
              <input className={input} inputMode="numeric" maxLength={11} value={f.nin} onChange={set('nin')} placeholder="e.g. 12345678901" />
              <p className="mt-1 text-[10px] text-muted">Must be exactly 11 digits • {f.nin.length}/11</p></div>

            {type === 'name' && (<>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={label}>Current First Name</label><input className={input} value={f.curFirstname} onChange={set('curFirstname')} placeholder="e.g. JOHN" /></div>
                <div><label className={label}>Current Surname</label><input className={input} value={f.curLastname} onChange={set('curLastname')} placeholder="e.g. DOE" /></div>
              </div>
              <div><label className={label}>New First Name *</label><input className={input} value={f.newFirstname} onChange={set('newFirstname')} placeholder="e.g. Chukwuma" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={label}>New Surname *</label><input className={input} value={f.newLastname} onChange={set('newLastname')} placeholder="e.g. Danjuma" /></div>
                <div><label className={label}>New Middle Name</label><input className={input} value={f.newMiddlename} onChange={set('newMiddlename')} placeholder="Optional" /></div>
              </div>
            </>)}
            {type === 'phone' && (<>
              <div><label className={label}>Full Name on the NIN</label><input className={input} value={f.curFullName} onChange={set('curFullName')} placeholder="e.g. Chukwuma Olawale Danjuma" /></div>
              <div><label className={label}>Current Phone Number</label><input className={input} value={f.curPhone} onChange={set('curPhone')} placeholder="e.g. 08012345678" /></div>
              <div><label className={label}>New Phone Number to Link *</label><input className={input} value={f.newPhone} onChange={set('newPhone')} placeholder="e.g. 08123456789" />
                <p className="mt-1 text-[10px] text-muted">Ensure this new SIM is registered and currently active.</p></div>
            </>)}
            {type === 'address' && (<>
              <div><label className={label}>Current Full Name on NIN</label><input className={input} value={f.curFullName} onChange={set('curFullName')} placeholder="e.g. Chukwuma Olawale Danjuma" /></div>
              <div><label className={label}>Current Address</label><input className={input} value={f.curAddress} onChange={set('curAddress')} placeholder="Current residential address" /></div>
              <div><label className={label}>New Street Address *</label><input className={input} value={f.newAddress} onChange={set('newAddress')} placeholder="e.g. 14 Admiralty Way, Lekki Phase 1" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={label}>State of Residence</label><input className={input} value={f.newState} onChange={set('newState')} placeholder="e.g. Lagos" /></div>
                <div><label className={label}>LGA</label><input className={input} value={f.newLga} onChange={set('newLga')} placeholder="e.g. Ikeja" /></div>
              </div>
            </>)}

            <div><label className={label}>Supporting Document * (PDF/JPG/PNG, max 1.5MB)</label>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={onFile} className="w-full text-xs text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-800 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white" />
              {docName && <p className="mt-1 text-[10px] font-bold text-green-700">✓ {docName}</p>}
              <p className="mt-1 text-[10px] text-muted">e.g. affidavit, marriage certificate, utility bill, or NIMC enrollment slip.</p></div>

            <div><label className={label}>Email *</label><input className={input} type="email" value={f.email} onChange={set('email')} placeholder="your@email.com" /></div>
            <div><label className={label}>Phone *</label><input className={input} type="tel" value={f.phone} onChange={set('phone')} placeholder="e.g. 08012345678" /></div>

            <label className="flex items-start gap-3 text-xs text-muted">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-emerald-700" />
              <span>I confirm that I am the applicant or hold lawful authorization to request this modification in accordance with the <b className="text-dark">Nigeria Data Protection Act (NDPA) 2023</b>, and I authorize the fee of <b className="text-dark">₦{FEE.toLocaleString('en-NG')}</b> to be debited.</span>
            </label>

            {err && <p className="text-xs font-bold text-red-700">{err}</p>}
            {!wallet.loggedIn ? (
              <Link href="/login" className="block w-full rounded-xl bg-primary text-white font-extrabold py-4 text-center text-sm">LOGIN TO APPLY</Link>
            ) : (<>
              {wallet.balance >= FEE && (
                <button onClick={() => submit('wallet')} disabled={busy} className="w-full rounded-xl bg-primary text-white font-extrabold py-4 text-sm disabled:opacity-60">
                  {busy ? 'Processing…' : 'PAY ₦' + FEE.toLocaleString('en-NG') + ' FROM WALLET (BALANCE: ₦' + wallet.balance.toLocaleString('en-NG') + ')'}
                </button>
              )}
              <button onClick={() => submit('paystack')} disabled={busy} className="w-full rounded-xl bg-emerald-950 text-white font-extrabold py-4 text-sm disabled:opacity-60">
                {busy ? 'Redirecting…' : 'REVIEW & SUBMIT • PAY ₦' + FEE.toLocaleString('en-NG')}
              </button>
            </>)}
          </section>
        )}
      </main>
    </div>
  );
}

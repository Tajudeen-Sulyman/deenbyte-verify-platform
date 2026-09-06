'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CAC_CATEGORIES, CAC_FEES, NG_STATES } from '@/lib/cac-data';

const input = 'w-full rounded-xl border border-border bg-light px-4 py-3 text-sm text-dark placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary';
const label = 'block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5';
const BANNED = ['NATIONAL', 'FEDERAL', 'GOVERNMENT', 'CAC', 'NIMC', 'POLICE', 'ARMY', 'PRESIDENT'];

function blankPerson(position = 'Director') {
  return { surname: '', first: '', other: '', email: '', phone: '', gender: '', dob: '', state: '', lga: '', city: '', streetNo: '', address: '', position };
}

export default function CacApplyPage() {
  const [entity, setEntity] = useState('');
  const [step, setStep] = useState(1);
  const [nm, setNm] = useState({ proposed: '', category: '', nature: '', alt1: '', alt2: '', secured: false });
  const [modal, setModal] = useState('');
  const [ownership, setOwnership] = useState('');
  const [company, setCompany] = useState({ email: '', date: '', state: '', city: '', streetNo: '', street: '' });
  const [persons, setPersons] = useState<any[]>([blankPerson()]);
  const [editIdx, setEditIdx] = useState<number | null>(0);
  const [docs, setDocs] = useState<Record<string, string>>({});
  const [docNames, setDocNames] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [wallet, setWallet] = useState({ loggedIn: false, balance: 0 });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => {
    const e = new URLSearchParams(window.location.search).get('entity') ?? '';
    if (e === 'bn' || e === 'ltd') setEntity(e);
    fetch('/api/v1/taxid/me').then((r) => r.json()).then(setWallet).catch(() => {});
  }, []);
  const fee = entity === 'ltd' ? CAC_FEES.ltd : CAC_FEES.bn;
  const natures = CAC_CATEGORIES.find((c) => c.name === nm.category)?.natures ?? [];

  function checkName() {
    const n = nm.proposed.trim().toUpperCase();
    if (n.length < 3) return setModal('Name too short.');
    if (entity === 'ltd' && !/(LIMITED|LTD)$/.test(n)) return setModal('Company names must end with LIMITED or LTD.');
    if (BANNED.some((b) => n.includes(b))) return setModal('This name contains a restricted word (e.g. NATIONAL, GOVERNMENT). Choose another.');
    if (!nm.category || !nm.nature) return setModal('Select business category and specific nature.');
    setNm({ ...nm, proposed: n, secured: true });
    setModal('');
    setStep(1.5);
  }

  function setPerson(i: number, k: string, v: string) {
    const p = [...persons]; p[i] = { ...p[i], [k]: v }; setPersons(p);
  }
  function onFile(pi: number, kind: string, e: any) {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 1000000) { setErr('Max 1MB per file.'); return; }
    setErr('');
    const r = new FileReader();
    r.onload = () => { setDocs({ ...docs, [pi + '_' + kind]: String(r.result ?? '').split(',')[1] ?? '' }); setDocNames({ ...docNames, [pi + '_' + kind]: f.name }); };
    r.readAsDataURL(f);
  }

  async function checkout(payMethod: 'wallet' | 'paystack') {
    setErr(''); setBusy(true);
    try {
      const res = await fetch('/api/v1/cac/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entity, name: nm, ownership, company, persons, docs, consent, payMethod }) });
      const json = await res.json();
      if (!res.ok) { setErr(json.error ?? 'Failed.'); return; }
      if (json.authorization_url) window.location.href = json.authorization_url;
      else window.location.href = '/cac/history?reference=' + encodeURIComponent(json.reference);
    } catch { setErr('Network error.'); } finally { setBusy(false); }
  }

  if (!entity) return (
    <div className="min-h-screen bg-light p-4">
      <div className="max-w-2xl mx-auto space-y-4 pt-6">
        <h1 className="text-xl font-extrabold text-dark">What would you like to register?</h1>
        <Link href="/cac/apply?entity=bn" className="card3d block rounded-2xl bg-white p-5">
          <p className="text-sm font-extrabold text-dark">Business Name</p>
          <p className="mt-1 text-xs text-muted">Fastest & most affordable way to register a small business — sole proprietor or partnership.</p>
          <p className="mt-2 text-sm font-extrabold text-primary">₦{CAC_FEES.bn.toLocaleString('en-NG')} • 30 mins – 1 hr</p>
        </Link>
        <Link href="/cac/apply?entity=ltd" className="card3d block rounded-2xl bg-white p-5 border-2 border-primary">
          <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-extrabold text-white">MOST POPULAR</span>
          <p className="mt-2 text-sm font-extrabold text-dark">Limited Liability (LTD)</p>
          <p className="mt-1 text-xs text-muted">Separate legal entity. Protects personal assets, issue shares, bid for contracts.</p>
          <p className="mt-2 text-sm font-extrabold text-primary">₦{CAC_FEES.ltd.toLocaleString('en-NG')} • 24 – 72 working hrs</p>
        </Link>
        <div className="card3d rounded-2xl bg-white p-5 opacity-60">
          <p className="text-sm font-extrabold text-dark">Incorporated Trustees</p>
          <p className="mt-1 text-xs text-muted">NGOs, churches, clubs & foundations.</p>
          <span className="mt-2 inline-block rounded-full bg-muted/20 px-3 py-1 text-[10px] font-bold text-muted">COMING SOON</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-light pb-16">
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center">
            <p className="text-sm font-bold text-red-700">{modal}</p>
            <button onClick={() => setModal('')} className="mt-4 w-full rounded-xl bg-primary py-3 text-xs font-extrabold text-white">OK</button>
          </div>
        </div>
      )}
      <header className="bg-violet-950 text-white px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <Link href="/cac" className="text-xs font-bold text-violet-300">← Back to CAC Hub</Link>
          <h1 className="mt-1 text-xl font-extrabold">{entity === 'ltd' ? 'Register a Company (LLC)' : 'Register Business Name'}</h1>
          <p className="text-xs text-violet-200">Step {step === 1.5 ? 1 : step} of 4</p>
          <div className="mt-3 h-1.5 rounded-full bg-white/15"><div className="h-1.5 rounded-full bg-primary" style={{ width: ((step === 1.5 ? 1 : step) / 4) * 100 + '%' }} /></div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-4 mt-4">
        {step === 1 && (
          <section className="card3d rounded-2xl bg-white p-5 space-y-4">
            <h2 className="text-sm font-extrabold text-dark">Name Availability</h2>
            <div><label className={label}>Proposed {entity === 'ltd' ? 'Company' : 'Business'} Name *</label>
              <input className={input} value={nm.proposed} onChange={(e) => setNm({ ...nm, proposed: e.target.value })} placeholder={entity === 'ltd' ? 'e.g. PEAK PERFORMANCE LOGISTICS LIMITED' : 'e.g. PEAK PERFORMANCE LOGISTICS'} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label}>Business Category *</label>
                <select className={input} value={nm.category} onChange={(e) => setNm({ ...nm, category: e.target.value, nature: '' })}>
                  <option value="">Search category…</option>
                  {CAC_CATEGORIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select></div>
              <div><label className={label}>Specific Nature *</label>
                <select className={input} value={nm.nature} onChange={(e) => setNm({ ...nm, nature: e.target.value })} disabled={!nm.category}>
                  <option value="">Select category first</option>
                  {natures.map((n) => <option key={n} value={n}>{n}</option>)}
                </select></div>
            </div>
            <button onClick={checkName} className="w-full rounded-xl bg-primary py-3.5 text-sm font-extrabold text-white"> Check Availability</button>
          </section>
        )}

        {step === 1.5 && (
          <section className="card3d rounded-2xl bg-white p-5 space-y-4">
            <div className="rounded-xl border-2 border-primary p-4">
              <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-extrabold text-white">PRIMARY NAME SECURED</span>
              <p className="mt-2 text-sm font-extrabold text-dark">{nm.proposed}</p>
              <p className="text-xs text-muted">{nm.nature}</p>
            </div>
            <div><label className={label}>Alternative Name 1 (recommended)</label><input className={input} value={nm.alt1} onChange={(e) => setNm({ ...nm, alt1: e.target.value })} placeholder="Optional backup name" /></div>
            <div><label className={label}>Alternative Name 2</label><input className={input} value={nm.alt2} onChange={(e) => setNm({ ...nm, alt2: e.target.value })} placeholder="Optional backup name" /></div>
            <p className="text-[10px] text-muted">If the CAC examiner rejects your primary name during manual review, one of these will be approved automatically to save days of delay.</p>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label}>Company Email *</label><input className={input} type="email" value={company.email} onChange={(e) => setCompany({ ...company, email: e.target.value })} /></div>
              <div><label className={label}>Commencement Date *</label><input className={input} type="date" value={company.date} onChange={(e) => setCompany({ ...company, date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className={label}>State *</label><select className={input} value={company.state} onChange={(e) => setCompany({ ...company, state: e.target.value })}><option value="">Select</option>{NG_STATES.map((s) => <option key={s}>{s}</option>)}</select></div>
              <div><label className={label}>City *</label><input className={input} value={company.city} onChange={(e) => setCompany({ ...company, city: e.target.value })} /></div>
              <div><label className={label}>Street No *</label><input className={input} value={company.streetNo} onChange={(e) => setCompany({ ...company, streetNo: e.target.value })} /></div>
            </div>
            <div><label className={label}>Street Address *</label><input className={input} value={company.street} onChange={(e) => setCompany({ ...company, street: e.target.value })} placeholder="e.g. 12 Awolowo Way" /></div>
            <button onClick={() => { if (!company.email || !company.date || !company.state || !company.city || !company.streetNo || !company.street) return setModal('Complete all company details.'); setStep(2); if (ownership === '') { setPersons(entity === 'ltd' ? [blankPerson()] : [blankPerson('Proprietor')]); setOwnership(entity === 'ltd' ? 'ltd' : 'sole'); } }} className="w-full rounded-xl bg-primary py-3.5 text-sm font-extrabold text-white">Save & Continue →</button>
          </section>
        )}

        {step === 2 && (
          <section className="card3d rounded-2xl bg-white p-5 space-y-4">
            <h2 className="text-sm font-extrabold text-dark">{entity === 'ltd' ? 'Directors & Shareholders' : 'Who owns this business?'}</h2>
            {entity === 'bn' && (
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => { setOwnership('sole'); setPersons([blankPerson('Proprietor')]); }} className={'rounded-xl border-2 p-4 text-left ' + (ownership === 'sole' ? 'border-primary bg-violet-50' : 'border-border')}>
                  <p className="text-sm font-extrabold text-dark">Sole Proprietor</p><p className="text-[10px] text-muted">Single 100% owner.</p>
                </button>
                <button onClick={() => { setOwnership('partnership'); setPersons([blankPerson('Proprietor'), blankPerson('Proprietor')]); }} className={'rounded-xl border-2 p-4 text-left ' + (ownership === 'partnership' ? 'border-primary bg-violet-50' : 'border-border')}>
                  <p className="text-sm font-extrabold text-dark">Partnership</p><p className="text-[10px] text-muted">Two or more co-owners.</p>
                </button>
              </div>
            )}
            {persons.map((p, i) => (
              <div key={i} className="rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-extrabold text-dark">{entity === 'ltd' ? 'Director' : 'Proprietor'} {i + 1}</p>
                  <button onClick={() => setEditIdx(editIdx === i ? null : i)} className="text-[10px] font-bold text-primary">{editIdx === i ? 'Close' : 'Edit'}</button>
                </div>
                {editIdx === i && (<>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={label}>Surname *</label><input className={input} value={p.surname} onChange={(e) => setPerson(i, 'surname', e.target.value)} /></div>
                    <div><label className={label}>First Name *</label><input className={input} value={p.first} onChange={(e) => setPerson(i, 'first', e.target.value)} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={label}>Email *</label><input className={input} type="email" value={p.email} onChange={(e) => setPerson(i, 'email', e.target.value)} /></div>
                    <div><label className={label}>Phone *</label><input className={input} value={p.phone} onChange={(e) => setPerson(i, 'phone', e.target.value)} placeholder="080…" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={label}>Gender *</label><select className={input} value={p.gender} onChange={(e) => setPerson(i, 'gender', e.target.value)}><option value="">Select</option><option>MALE</option><option>FEMALE</option></select></div>
                    <div><label className={label}>Date of Birth *</label><input className={input} type="date" value={p.dob} onChange={(e) => setPerson(i, 'dob', e.target.value)} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={label}>State *</label><select className={input} value={p.state} onChange={(e) => setPerson(i, 'state', e.target.value)}><option value="">Select</option>{NG_STATES.map((s) => <option key={s}>{s}</option>)}</select></div>
                    <div><label className={label}>LGA *</label><input className={input} value={p.lga} onChange={(e) => setPerson(i, 'lga', e.target.value)} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={label}>City *</label><input className={input} value={p.city} onChange={(e) => setPerson(i, 'city', e.target.value)} /></div>
                    <div><label className={label}>Street No *</label><input className={input} value={p.streetNo} onChange={(e) => setPerson(i, 'streetNo', e.target.value)} /></div>
                  </div>
                  <div><label className={label}>Service Address *</label><input className={input} value={p.address} onChange={(e) => setPerson(i, 'address', e.target.value)} /></div>
                </>)}
                {editIdx !== i && <p className="text-[11px] text-muted">{p.surname} {p.first} • {p.email} • {p.phone}</p>}
              </div>
            ))}
            {entity === 'bn' && ownership === 'partnership' && persons.length < 4 && (
              <button onClick={() => setPersons([...persons, blankPerson('Proprietor')])} className="w-full rounded-xl border border-dashed border-border py-3 text-xs font-bold text-primary">+ Add Partner</button>
            )}
            {entity === 'ltd' && persons.length < 4 && (
              <button onClick={() => setPersons([...persons, blankPerson()])} className="w-full rounded-xl border border-dashed border-border py-3 text-xs font-bold text-primary">+ Add Director</button>
            )}
            <button onClick={() => {
              for (const p of persons) if (!p.surname || !p.first || !p.email || !p.phone || !p.gender || !p.dob || !p.state || !p.lga || !p.city || !p.streetNo || !p.address) return setModal('Complete all fields for every person (open each card with Edit).');
              setEditIdx(null); setStep(3);
            }} className="w-full rounded-xl bg-primary py-3.5 text-sm font-extrabold text-white">Proceed to Documents →</button>
          </section>
        )}

        {step === 3 && (
          <section className="card3d rounded-2xl bg-white p-5 space-y-4">
            <h2 className="text-sm font-extrabold text-dark">Document Uploads</h2>
            <p className="text-[11px] text-muted">Upload valid IDs and signatures. Ensure documents are clear and readable. Max 1MB each.</p>
            {persons.map((p, i) => (
              <div key={i} className="rounded-xl border border-border p-4 space-y-3">
                <p className="text-xs font-extrabold text-dark">{p.surname} {p.first}&apos;s Documents</p>
                {[['nin', 'NIN Card/Slip (PDF/JPG/PNG)'], ['passport', 'Passport Photo (JPG/PNG, square)'], ['signature', 'Signature (JPG/PNG, plain white paper)']].map(([kind, lab]) => (
                  <div key={kind} className="flex items-center justify-between gap-2 rounded-lg border border-border p-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-dark">{lab}</p>
                      <p className="truncate text-[10px] text-muted">{docNames[i + '_' + kind] ?? 'Not uploaded'}</p>
                    </div>
                    {docs[i + '_' + kind] ? <span className="text-[10px] font-extrabold text-green-700">✓ Uploaded</span>
                      : <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => onFile(i, kind, e)} className="text-[10px] text-muted file:mr-2 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-[10px] file:font-bold file:text-white" />}
                  </div>
                ))}
              </div>
            ))}
            <button onClick={() => {
              for (let i = 0; i < persons.length; i++) for (const k of ['nin', 'passport', 'signature']) if (!docs[i + '_' + k]) return setModal('Upload all three documents for every person.');
              setStep(4);
            }} className="w-full rounded-xl bg-primary py-3.5 text-sm font-extrabold text-white">Continue →</button>
          </section>
        )}

        {step === 4 && (
          <section className="card3d rounded-2xl bg-white p-5 space-y-4">
            <h2 className="text-sm font-extrabold text-dark">Final Review</h2>
            <div className="rounded-xl border border-border p-4 text-[11px] space-y-1">
              <p className="text-dark"><b>Name:</b> {nm.proposed}</p>
              <p className="text-dark"><b>Nature:</b> {nm.nature}</p>
              {nm.alt1 && <p className="text-dark"><b>Alt 1:</b> {nm.alt1}</p>}
              {nm.alt2 && <p className="text-dark"><b>Alt 2:</b> {nm.alt2}</p>}
              <p className="text-dark"><b>Address:</b> {company.streetNo} {company.street}, {company.city}, {company.state}</p>
              <p className="text-dark"><b>Email:</b> {company.email}</p>
              <p className="text-dark"><b>Structure:</b> {ownership === 'sole' ? 'Sole Proprietor' : ownership === 'partnership' ? 'Partnership' : 'Limited Liability'}</p>
              {persons.map((p, i) => <p key={i} className="text-dark"><b>{entity === 'ltd' ? 'Director' : 'Proprietor'} {i + 1}:</b> {p.surname} {p.first} • {p.phone}</p>)}
            </div>
            <label className="flex items-start gap-3 text-xs text-muted">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-violet-700" />
              <span>I confirm the information provided is accurate and authorize DeenByte Verify to process this registration with the CAC on my behalf, and I authorize the fee of <b className="text-dark">₦{fee.toLocaleString('en-NG')}</b> to be debited.</span>
            </label>
            {err && <p className="text-xs font-bold text-red-700">{err}</p>}
            {!wallet.loggedIn ? (
              <Link href="/login" className="block w-full rounded-xl bg-primary py-4 text-center text-sm font-extrabold text-white">LOGIN TO CHECKOUT</Link>
            ) : (<>
              {wallet.balance >= fee && <button onClick={() => checkout('wallet')} disabled={busy || !consent} className="w-full rounded-xl bg-primary py-4 text-sm font-extrabold text-white disabled:opacity-60">{busy ? 'Processing…' : 'PAY ₦' + fee.toLocaleString('en-NG') + ' FROM WALLET'}</button>}
              <button onClick={() => checkout('paystack')} disabled={busy || !consent} className="w-full rounded-xl bg-violet-950 py-4 text-sm font-extrabold text-white disabled:opacity-60">{busy ? 'Redirecting…' : 'CHECKOUT & SUBMIT • ₦' + fee.toLocaleString('en-NG')}</button>
            </>)}
          </section>
        )}
      </main>
    </div>
  );
}

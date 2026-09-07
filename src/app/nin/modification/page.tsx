'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MOD_FEE, MOD_TYPES, pretty } from '@/lib/mod-data';

const input = 'w-full rounded-xl border border-border bg-light px-4 py-3 text-sm text-dark placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary';

export default function ModificationPage() {
const [type, setType] = useState(MOD_TYPES[0].key);
const [nin, setNin] = useState('');
const [vals, setVals] = useState<Record<string, string>>({});
const [support, setSupport] = useState('');
const [supportName, setSupportName] = useState('');
const [attest, setAttest] = useState('');
const [consent, setConsent] = useState(false);
const [wallet, setWallet] = useState({ loggedIn: false, balance: 0 });
const [err, setErr] = useState('');
const [busy, setBusy] = useState(false);
const t = MOD_TYPES.find((x) => x.key === type)!;
useEffect(() => { fetch('/api/v1/taxid/me').then((r) => r.json()).then(setWallet).catch(() => {}); }, []);
function onFile(kind: 'support' | 'attest', e: any) {
const f = e.target.files?.[0]; if (!f) return;
if (f.size > 2000000) { setErr('Max 2MB per document.'); return; }
const r = new FileReader();
r.onload = () => {
const b64 = String(r.result ?? '').split(',')[1] ?? '';
if (kind === 'support') { setSupport(b64); setSupportName(f.name); } else setAttest(b64);
};
r.readAsDataURL(f);
}
async function submit(payMethod: 'wallet' | 'paystack') {
setErr(''); setBusy(true);
try {
const res = await fetch('/api/v1/ninmod/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mod_type: type, nin, vals, support_doc: support, attest, consent, payMethod }) });
const j = await res.json();
if (!res.ok) { setErr(j.error ?? 'Failed.'); return; }
if (j.authorization_url) window.location.href = j.authorization_url;
else window.location.reload();
} catch { setErr('Network error.'); } finally { setBusy(false); }
}
return (
<div className="min-h-screen bg-light pb-16">
<header className="vibe-mesh bg-violet-950 text-white px-4 py-6">
<div className="max-w-2xl mx-auto">
<Link href="/dashboard" className="text-xs font-bold text-violet-300">← Back to Dashboard</Link>
<h1 className="mt-2 text-2xl font-extrabold">NIN Modification</h1>
<p className="mt-1 text-sm text-violet-200">Official processing for Change of Name, Phone Number, and Address on your National Identity record.</p>
<Link href="/nin/modification/history" className="mt-4 inline-block rounded-xl bg-white/10 px-4 py-3 text-xs font-extrabold">≡ Modification History →</Link>
</div>
</header>
<main className="max-w-2xl mx-auto p-4 space-y-4 mt-4">
<section className="card3d rounded-2xl bg-white p-5">
<span className="inline-block rounded-full bg-green-50 border border-green-200 px-4 py-2 text-xs font-extrabold text-green-700">🏷 PROCESSING FEE: ₦{MOD_FEE.toLocaleString('en-NG')}</span>
<p className="mt-4 text-sm font-extrabold text-dark"><span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-xs text-white">1</span>SELECT MODIFICATION SERVICE</p>
<div className="mt-3 space-y-3">
{MOD_TYPES.map((m) => (
<button key={m.key} onClick={() => setType(m.key)} className={'w-full rounded-xl border p-4 text-left ' + (type === m.key ? 'border-primary bg-primary/10' : 'border-border bg-light')}>
<div className="flex items-center justify-between gap-2">
<p className="text-sm font-extrabold text-dark">{m.label}</p>
<span className="rounded-full bg-green-50 px-3 py-1 text-xs font-extrabold text-green-700">₦{MOD_FEE.toLocaleString('en-NG')}</span>
</div>
<p className="mt-1 text-xs text-muted">{m.desc}</p>
</button>
))}
</div>
</section>
<section className="card3d rounded-2xl bg-white p-5 space-y-4">
<p className="text-sm font-extrabold text-dark"><span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-xs text-white">2</span>DETAILS</p>
<input className={input} value={nin} onChange={(e) => setNin(e.target.value)} placeholder="11-digit NIN" inputMode="numeric" />
{t.cur.length > 0 && (<>
<p className="text-[10px] font-extrabold uppercase tracking-wider text-muted">Current details (as on NIN — recommended)</p>
<div className="grid grid-cols-2 gap-3">
{t.cur.map((f) => <input key={f} className={input} value={vals[f] ?? ''} onChange={(e) => setVals({ ...vals, [f]: e.target.value })} placeholder={pretty(f)} />)}
</div>
</>)}
<p className="text-[10px] font-extrabold uppercase tracking-wider text-primary">New details</p>
<div className="grid grid-cols-2 gap-3">
{t.neu.map((f) => <input key={f} className={input} value={vals[f] ?? ''} onChange={(e) => setVals({ ...vals, [f]: e.target.value })} placeholder={pretty(f)} />)}
</div>
</section>
<section className="card3d rounded-2xl bg-white p-5 space-y-4">
<p className="text-sm font-extrabold text-dark"><span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-xs text-white">3</span>DOCUMENTS</p>
<div className="rounded-xl border border-dashed border-border p-4 text-center">
<p className="text-xs font-bold text-dark">Supporting document * {supportName && <span className="text-green-700">✓ {supportName}</span>}</p>
<p className="text-[10px] text-muted">PDF/JPG/PNG • Max 2MB (e.g. affidavit, marriage cert, utility bill)</p>
<input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => onFile('support', e)} className="mt-2 text-[10px] text-muted file:mr-2 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-[10px] file:font-bold file:text-white" />
</div>
<div className="rounded-xl border border-dashed border-border p-4 text-center">
<p className="text-xs font-bold text-dark">Attestation document (optional)</p>
<input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => onFile('attest', e)} className="mt-2 text-[10px] text-muted file:mr-2 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-[10px] file:font-bold file:text-white" />
</div>
<label className="flex items-start gap-3 rounded-xl bg-light p-3 text-xs text-muted">
<input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-violet-700" />
<span>I confirm I am the NIN owner or hold lawful authorization, per the <b>Nigeria Data Protection Act (NDPA) 2023</b>, and authorize the fee of ₦{MOD_FEE.toLocaleString('en-NG')}.</span>
</label>
{err && <p className="text-xs font-bold text-red-700">{err}</p>}
{!wallet.loggedIn ? (
<Link href="/login" className="block w-full rounded-xl bg-primary py-4 text-center text-sm font-extrabold text-white">LOGIN TO SUBMIT</Link>
) : (<>
{wallet.balance >= MOD_FEE && <button onClick={() => submit('wallet')} disabled={busy || !consent || !support} className="w-full rounded-xl bg-primary py-4 text-sm font-extrabold text-white disabled:opacity-60">PAY ₦{MOD_FEE.toLocaleString('en-NG')} FROM WALLET</button>}
<button onClick={() => submit('paystack')} disabled={busy || !consent || !support} className="w-full rounded-xl bg-violet-950 py-4 text-sm font-extrabold text-white disabled:opacity-60">SUBMIT • PAY ₦{MOD_FEE.toLocaleString('en-NG')}</button>
</>)}
</section>
</main>
</div>
);
}

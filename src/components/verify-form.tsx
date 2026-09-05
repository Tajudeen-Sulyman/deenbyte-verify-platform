'use client';

import { useState } from 'react';

type Service = {
  service_id: string;
  name: string;
  category: string;
  provider: string;
  selling_price: number;
};

const NIN_SLIPS = ['premium', 'standard', 'regular', 'vnin'];
const BVN_SLIPS = ['premium', 'standard'];

export function VerifyForm({ service, walletBalance }: { service: Service; walletBalance: number }) {
  const slips = service.provider === 'techhub'
    ? (service.category === 'BVN' ? BVN_SLIPS : NIN_SLIPS)
    : null;

  const [value, setValue] = useState('');
  const [slipType, setSlipType] = useState('premium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reverify, setReverify] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [consent1, setConsent1] = useState(false);
  const [consent2, setConsent2] = useState(false);
  const [timeline, setTimeline] = useState(false);
  const [specimen, setSpecimen] = useState(false);
  const [ack, setAck] = useState(false);
  const isAsync = /validation|ipe|personalization/.test(service.service_id);

  const price = Number(service.selling_price);
  const insufficient = walletBalance < price;
  const isBvn = service.category === 'BVN';
  const valid = /^\d{11}$/.test(value);
  const canSubmit = valid && !insufficient && !loading && consent1 && consent2;

  const doSubmit = async (confirm = false) => {
    setLoading(true); setError(''); setResult(null); setReverify(null);
    try {
      const res = await fetch('/api/v1/verify/' + service.service_id, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: value.trim(), slip_type: slipType, confirm_reverify: confirm }),
      });
      const data = await res.json();
      if (res.status === 409) { setReverify(data); return; }
      if (!res.ok) throw new Error(data.error || 'Verification failed.');
      setResult(data);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="card3d p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-dark">{service.name}</h2>
          <p className="text-xs text-muted">{service.category}</p>
        </div>
        <span className="text-sm font-bold text-primary">₦{price.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
      </div>

      <div className="mt-4 space-y-3">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, '').slice(0, 11))}
          placeholder={isBvn ? 'Enter 11-digit BVN' : 'Enter 11-digit NIN'}
          inputMode="numeric"
          className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        {slips && (
          <select value={slipType} onChange={(e) => setSlipType(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2.5 text-sm bg-white outline-none focus:border-primary">
            {slips.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)} Slip</option>)}
          </select>
        )}
        <button type="button" onClick={() => setSpecimen(true)} className="text-xs font-semibold text-primary underline">👁 View Example Slip</button>
        <label className="flex items-start gap-2 text-xs text-muted">
          <input type="checkbox" checked={consent1} onChange={(e) => setConsent1(e.target.checked)} className="mt-0.5 h-4 w-4 accent-emerald-700" />
          <span>I confirm that I am the owner of this {isBvn ? 'BVN' : 'NIN'} or have lawful authorization to retrieve this record in accordance with the <b className="text-dark">Nigeria Data Protection Act (NDPA) 2023</b>.</span>
        </label>
        <label className="flex items-start gap-2 text-xs text-muted">
          <input type="checkbox" checked={consent2} onChange={(e) => setConsent2(e.target.checked)} className="mt-0.5 h-4 w-4 accent-emerald-700" />
          <span>I authorize the fee of <b className="text-dark">₦{price.toLocaleString('en-NG')}</b> to be debited from my wallet.</span>
        </label>
        {insufficient && <p className="text-xs text-red-600">Insufficient wallet balance.</p>}
        <button onClick={() => (isAsync && !ack ? setTimeline(true) : doSubmit(false))} disabled={!canSubmit}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60">
          {loading ? 'Verifying…' : (isBvn ? 'Verify BVN' : 'Verify NIN')}
        </button>
      </div>

      {reverify && (
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800">{reverify.error}</p>
          <button onClick={() => doSubmit(true)}
            className="mt-2 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white">
            Verify Again (charge again)
          </button>
        </div>
      )}

      {error && <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}

      {result && (
        <div className="mt-3 bg-green-50 border border-green-100 rounded-lg p-4">
          <p className="text-sm font-semibold text-green-800">✓ {result.message}</p>
          <p className="text-xs text-muted mt-1">Ref: {result.reference}</p>
          {result.data && (
            <div className="mt-2 text-sm text-dark space-y-0.5">
              {(result.data.first_name || result.data.last_name) && (
                <p>Name: {result.data.first_name} {result.data.middle_name || ''} {result.data.last_name}</p>
              )}
              {result.data.nin && <p>NIN: {result.data.nin}</p>}
              {result.data.bvn && <p>BVN: {result.data.bvn}</p>}
              {result.data.date_of_birth && <p>DOB: {result.data.date_of_birth}</p>}
              {result.data.gender && <p>Gender: {result.data.gender}</p>}
              {result.data.phone && <p>Phone: {result.data.phone}</p>}
            </div>
          )}
          <a href={'/api/v1/slip/' + result.requestId} target="_blank" rel="noopener"
            className="mt-2 inline-block text-sm font-semibold text-primary underline">View / Download Slip</a>
        </div>
      )}
    {timeline && (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-6">
          <h3 className="text-lg font-extrabold text-dark">Processing Timeline</h3>
          <p className="mt-3 text-sm text-muted">This service will be processed within <b className="text-dark">24–48 hours</b> (official portal reflection may take up to 72 hours).</p>
          <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-bold text-amber-700">No Refund Policy: This service is non-refundable once queued, as provider fulfillment costs are billed 100% upfront.</p>
          <button onClick={() => { setAck(true); setTimeline(false); doSubmit(false); }} className="mt-4 w-full rounded-xl bg-primary text-white font-extrabold py-3.5 text-sm">I Understand — Proceed</button>
        </div>
      </div>
    )}
    {specimen && (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setSpecimen(false)}>
        <div className="w-full max-w-md rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-dark">{(!isBvn && ['regular', 'standard', 'premium'].includes(slipType)) ? slipType.charAt(0).toUpperCase() + slipType.slice(1) + ' Slip Example Specimen' : service.name + ' — Example Specimen'}</h3>
            <button onClick={() => setSpecimen(false)} className="font-bold text-muted">✕</button>
          </div>
          {(!isBvn && ['regular', 'standard', 'premium'].includes(slipType)) ? (
            <>
              <img src={'/specimens/' + slipType + '.jpg'} alt={slipType + ' slip example specimen'} className="mt-4 w-full rounded-lg border border-border bg-white" />
              <p className="mt-2 text-center text-[10px] text-muted">Official NIMC {slipType} slip format — specimen with placeholder data.</p>
            </>
          ) : (
            <div className="mt-4 rounded-xl border-2 border-emerald-700 bg-emerald-50 p-4">
              <p className="text-center text-xs font-extrabold text-emerald-900">DEENBYTE VERIFY — {isBvn ? 'BVN' : 'NIN'} VERIFICATION SLIP</p>
              <div className="mt-3 space-y-1 text-[11px] text-dark">
                <p>First Name: <b>JOHN</b> • Last Name: <b>DOE</b></p>
                <p>DOB: <b>01 JAN 1990</b> • Gender: <b>M</b></p>
                <p>{isBvn ? 'BVN' : 'NIN'}: <b>{isBvn ? '22***8901' : '12***78901'}</b></p>
                <p>Phone: <b>0800-000-0000</b></p>
              </div>
              <p className="mt-3 text-center text-[10px] font-bold text-green-700">✓ Verified (sample — placeholder data)</p>
            </div>
          )}
          <p className="mt-3 text-[10px] text-muted">Specimen uses placeholder data. Your slip is generated live from the official database at purchase.</p>
        </div>
      </div>
    )}
    </div>
  );
}

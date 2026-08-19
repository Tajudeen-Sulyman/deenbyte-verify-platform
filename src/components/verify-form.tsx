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

  const price = Number(service.selling_price);
  const insufficient = walletBalance < price;
  const isBvn = service.category === 'BVN';
  const valid = /^\d{11}$/.test(value);
  const canSubmit = valid && !insufficient && !loading;

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
        {insufficient && <p className="text-xs text-red-600">Insufficient wallet balance.</p>}
        <button onClick={() => doSubmit(false)} disabled={!canSubmit}
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
    </div>
  );
}

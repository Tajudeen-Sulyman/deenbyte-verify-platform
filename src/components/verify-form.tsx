'use client';

import { useState } from 'react';

type Service = {
  service_id: string;
  name: string;
  category: string;
  selling_price: number;
  supports_pdf: boolean;
};

export function VerifyForm({ service, walletBalance }: { service: Service; walletBalance: number }) {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const [reverify, setReverify] = useState<any>(null);

  const price = Number(service.selling_price);
  const insufficient = walletBalance < price;

  const submit = async (confirm: boolean) => {
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/v1/verify/' + service.service_id, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: value, confirm_reverify: confirm }),
      });
      const data = await res.json();
      if (res.status === 409 && data.code === 'reverify_required') {
        setReverify(data);
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Verification failed.');
      setReverify(null);
      setResult(data);
      setValue('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-dark">{service.name}</h2>
          <p className="text-xs text-muted">{service.category}</p>
        </div>
        <span className="text-sm font-bold text-primary">
          ₦{price.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
        </span>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); submit(false); }} className="mt-4 space-y-3">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, '').slice(0, 11))}
          placeholder={service.category === 'BVN' ? 'Enter 11-digit BVN' : 'Enter 11-digit NIN'}
          inputMode="numeric"
          className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        {insufficient && (
          <p className="text-xs text-red-600">Insufficient wallet balance for this service.</p>
        )}
        <button
          type="submit"
          disabled={loading || value.length !== 11 || insufficient}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
        >
          {loading ? 'Verifying…' : 'Verify ' + service.category}
        </button>
      </form>

      {reverify && (
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-amber-800">This number was verified recently.</p>
          <p className="text-xs text-amber-700 mt-1">
            Previous ref: {reverify.previous_reference}. Verifying again costs ₦{price.toLocaleString('en-NG', { minimumFractionDigits: 2 })}. Only do this if the data may have changed.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setReverify(null)}
              className="flex-1 rounded-lg border border-border bg-white py-2 text-sm font-semibold text-dark"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => submit(true)}
              className="flex-1 rounded-lg bg-amber-500 py-2 text-sm font-semibold text-white hover:bg-amber-600"
            >
              Verify again
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
      )}

      {result && (
        <div className="mt-3 bg-green-50 border border-green-100 rounded-lg p-4">
          <p className="text-sm font-semibold text-green-800">✓ {result.message}</p>
          <p className="text-xs text-muted mt-1">Ref: {result.reference}</p>
          {result.data && (
            <div className="mt-2 text-sm text-dark space-y-0.5">
              {(result.data.first_name || result.data.firstName) && (
                <p>Name: {result.data.first_name ?? result.data.firstName} {result.data.middle_name ?? result.data.middleName ?? ''} {result.data.last_name ?? result.data.lastName ?? ''}</p>
              )}
              {result.data.date_of_birth && <p>Date of birth: {result.data.date_of_birth}</p>}
              {result.data.gender && <p>Gender: {result.data.gender}</p>}
              {result.data.residence_state && <p>State: {result.data.residence_state}</p>}
            </div>
          )}
          {result.hasSlip && (
            <a
              href={'/api/v1/slip/' + result.requestId}
              target="_blank"
              rel="noopener"
              className="mt-2 inline-block text-sm font-semibold text-primary underline"
            >
              View / Download Slip
            </a>
          )}
        </div>
      )}
    </div>
  );
}

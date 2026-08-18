'use client';

import { useState } from 'react';

type Service = { service_id: string; name: string; selling_price: number };

const NIN_INPUT = ['nin_validation'];

export function AsyncForm({ service, walletBalance }: { service: Service; walletBalance: number }) {
  const isNin = NIN_INPUT.includes(service.service_id);
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  const price = Number(service.selling_price);
  const insufficient = walletBalance < price;

  const valid = isNin ? /^\d{11}$/.test(value) : value.trim().length >= 5;
  const canSubmit = valid && !insufficient && !loading;

  const submit = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/v1/async/' + service.service_id, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: value.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed.');
      setResult(data);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const checkStatus = async () => {
    if (!result?.requestId) return;
    setChecking(true); setError('');
    try {
      const res = await fetch('/api/v1/async/' + service.service_id + '/status', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: result.requestId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Status check failed.');
      setResult((prev: any) => ({ ...prev, ...data }));
    } catch (err: any) { setError(err.message); }
    finally { setChecking(false); }
  };

  return (
    <div className="bg-white border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-dark">{service.name}</h2>
          <p className="text-xs text-muted">
            {isNin ? 'Submit the NIN — we track it until completion.' : 'Submit the enrollment tracking ID — we track it until completion.'}
            {' '}Processing: 10 min – 24 hrs.
          </p>
        </div>
        <span className="text-sm font-bold text-primary">₦{price.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
      </div>

      <div className="mt-4 space-y-3">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value.replace(isNin ? /\D/g : /[^a-zA-Z0-9]/g, ''))}
          placeholder={isNin ? 'Enter 11-digit NIN' : 'Enter Tracking ID'}
          inputMode={isNin ? 'numeric' : 'text'}
          className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        {insufficient && <p className="text-xs text-red-600">Insufficient wallet balance.</p>}
        <button onClick={submit} disabled={!canSubmit}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60">
          {loading ? 'Submitting…' : 'Submit Request'}
        </button>
      </div>

      {error && <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}

      {result?.status === 'processing' && (
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-amber-800">⏳ Submitted — processing (10 min to 24 hrs).</p>
          <p className="text-xs text-muted mt-1">Ref: {result.reference}</p>
          <button onClick={checkStatus} disabled={checking}
            className="mt-2 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60">
            {checking ? 'Checking…' : 'Check Status'}
          </button>
        </div>
      )}

      {result?.status === 'successful' && (
        <div className="mt-3 bg-green-50 border border-green-100 rounded-lg p-4">
          <p className="text-sm font-semibold text-green-800">✓ Completed</p>
          <p className="text-xs text-muted mt-1">Ref: {result.reference}</p>
          {result.data && (
            <div className="mt-2 text-sm text-dark space-y-0.5">
              {result.data.nin && <p>NIN: {result.data.nin}</p>}
              {result.data.tracking_id && <p>Tracking ID: {result.data.tracking_id}</p>}
              {(result.data.first_name || result.data.firstname) && (
                <p>Name: {result.data.first_name ?? result.data.firstname} {result.data.last_name ?? result.data.surname}</p>
              )}
            </div>
          )}
          <a href={'/api/v1/slip/' + result.requestId} target="_blank" rel="noopener"
            className="mt-2 inline-block text-sm font-semibold text-primary underline">View / Download Slip</a>
        </div>
      )}

      {result?.status === 'failed' && (
        <div className="mt-3 bg-red-50 border border-red-100 rounded-lg p-4">
          <p className="text-sm font-semibold text-red-700">✗ Failed — wallet reversed.</p>
          <p className="text-xs text-muted mt-1">{result.message ?? 'The request failed at the provider. Your wallet has been refunded.'}</p>
        </div>
      )}
    </div>
  );
}

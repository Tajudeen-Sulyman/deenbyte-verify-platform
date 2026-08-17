'use client';

import { useState } from 'react';

type Service = { service_id: string; name: string; selling_price: number };

export function DemographicForm({ service, walletBalance }: { service: Service; walletBalance: number }) {
  const [form, setForm] = useState({ firstname: '', lastname: '', gender: '', dob: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  const price = Number(service.selling_price);
  const insufficient = walletBalance < price;

  const submit = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/v1/verify/' + service.service_id, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed.');
      setResult(data);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const canSubmit = form.firstname && form.lastname && form.gender && form.dob && !insufficient && !loading;

  return (
    <div className="bg-white border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-dark">{service.name}</h2>
          <p className="text-xs text-muted">Find a NIN by name, gender and date of birth</p>
        </div>
        <span className="text-sm font-bold text-primary">₦{price.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
      </div>

      <div className="mt-4 space-y-3">
        <input value={form.firstname}
          onChange={(e) => setForm({ ...form, firstname: e.target.value.replace(/[^a-zA-Z\s]/g, '') })}
          placeholder="First name"
          className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        <input value={form.lastname}
          onChange={(e) => setForm({ ...form, lastname: e.target.value.replace(/[^a-zA-Z\s]/g, '') })}
          placeholder="Last name"
          className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        <div className="grid grid-cols-2 gap-3">
          <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}
            className="w-full rounded-lg border border-border px-3 py-2.5 text-sm bg-white outline-none focus:border-primary">
            <option value="">Gender</option>
            <option value="m">Male</option>
            <option value="f">Female</option>
          </select>
          <input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })}
            className="w-full rounded-lg border border-border px-3 py-2.5 text-sm bg-white outline-none focus:border-primary" />
        </div>
        {insufficient && <p className="text-xs text-red-600">Insufficient wallet balance.</p>}
        <button onClick={submit} disabled={!canSubmit}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60">
          {loading ? 'Searching…' : 'Search NIN'}
        </button>
      </div>

      {error && <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
      {result && (
        <div className="mt-3 bg-green-50 border border-green-100 rounded-lg p-4">
          <p className="text-sm font-semibold text-green-800">✓ {result.message}</p>
          <p className="text-xs text-muted mt-1">Ref: {result.reference}</p>
          {result.data && (
            <div className="mt-2 text-sm text-dark space-y-0.5">
              <p>Name: {result.data.first_name} {result.data.middle_name || ''} {result.data.last_name}</p>
              {result.data.nin && <p>NIN: {result.data.nin}</p>}
              {result.data.date_of_birth && <p>DOB: {result.data.date_of_birth}</p>}
              {result.data.phone && <p>Phone: {result.data.phone}</p>}
              {result.data.residence_state && <p>State: {result.data.residence_state}</p>}
            </div>
          )}
          <a href={'/api/v1/slip/' + result.requestId} target="_blank" rel="noopener"
            className="mt-2 inline-block text-sm font-semibold text-primary underline">View / Download Slip</a>
        </div>
      )}
    </div>
  );
}

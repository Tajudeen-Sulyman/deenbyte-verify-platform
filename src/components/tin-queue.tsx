'use client';
import { useState } from 'react';

const BADGE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  awaiting_payment: 'bg-amber-50 text-amber-700 border-amber-200',
  processing: 'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
};

export function TinQueue({ rows }: { rows: any[] }) {
  const [list, setList] = useState(rows);
  const [filter, setFilter] = useState('open');
  const [tin, setTin] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');

  async function act(reference: string, action: string) {
    setBusy(reference);
    const res = await fetch('/api/v1/admin/tin', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference, action, issued_tin: (tin[reference] ?? '').trim() }),
    });
    const j = await res.json();
    setBusy('');
    if (!res.ok) { alert(j.error ?? 'Failed'); return; }
    setList((l) => l.map((r) => (r.reference === reference ? { ...r, status: j.status, issued_tin: j.issued_tin ?? r.issued_tin } : r)));
  }

  const shown = list.filter((r) => filter === 'all' ? true : filter === 'open' ? ['pending', 'awaiting_payment', 'processing'].includes(r.status) : r.status === filter);

  return (
    <div className="space-y-4">
      <div className="card3d p-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-dark">TIN applications</h2>
        <select className="rounded-lg border border-border bg-light px-3 py-2 text-xs text-dark" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="open">Open (needs action)</option>
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
      </div>
      {shown.length === 0 && <p className="card3d p-6 text-center text-xs text-muted">No applications in this view.</p>}
      {shown.map((r) => (
        <div key={r.reference} className="card3d p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-dark">{r.org_name || ((r.first_name ?? '') + ' ' + (r.last_name ?? '')).trim() || 'Application'}</p>
              <p className="text-[10px] text-muted">{r.reference} • {new Date(r.created_at).toLocaleString()} • ₦{Number(r.fee).toLocaleString()}</p>
            </div>
            <span className={'rounded-full border px-2 py-1 text-[10px] font-bold ' + (BADGE[r.status] ?? '')}>{r.status}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-muted">
            <p>Type: <b className="text-dark">{r.request_type === 'individual' ? 'Individual (NIN)' : 'Non-Individual (CAC)'}</b></p>
            <p>{r.request_type === 'individual' ? 'NIN: ' + (r.nin ?? '—') : 'RC: ' + (r.rc_number ?? '—')}</p>
            {r.request_type !== 'individual' && <p>Category: <b className="text-dark">{r.category ?? '—'}</b></p>}
            {r.dob && <p>DOB: <b className="text-dark">{r.dob}</b></p>}
            <p className="col-span-2">Contact: <b className="text-dark">{r.email}</b> • {r.phone}</p>
          </div>
          {r.status === 'completed' ? (
            <p className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs font-extrabold text-green-700">Issued TIN: {r.issued_tin}</p>
          ) : (
            <>
              <input className="w-full rounded-lg border border-border bg-light px-3 py-2 text-xs text-dark" placeholder="Paste 13-digit NRS-issued TIN here" value={tin[r.reference] ?? ''} onChange={(e) => setTin({ ...tin, [r.reference]: e.target.value })} />
              <div className="flex flex-wrap gap-2">
                {r.status !== 'processing' && <button onClick={() => act(r.reference, 'processing')} disabled={busy === r.reference} className="rounded-lg bg-blue-600 text-white px-3 py-2 text-[11px] font-bold disabled:opacity-50">Mark Processing</button>}
                <button onClick={() => act(r.reference, 'completed')} disabled={busy === r.reference} className="rounded-lg bg-green-600 text-white px-3 py-2 text-[11px] font-bold disabled:opacity-50">Complete with TIN</button>
                <button onClick={() => act(r.reference, 'failed')} disabled={busy === r.reference} className="rounded-lg bg-red-600 text-white px-3 py-2 text-[11px] font-bold disabled:opacity-50">Mark Failed</button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

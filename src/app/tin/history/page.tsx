'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const BADGE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  awaiting_payment: 'bg-amber-50 text-amber-700 border-amber-200',
  processing: 'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
};

export default function TinHistoryPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { fetch('/api/v1/tin/history').then((r) => r.json()).then((j) => { setRows(j.rows ?? []); setLoaded(true); }).catch(() => setLoaded(true)); }, []);

  const count = (s: string[]) => rows.filter((r) => s.includes(r.status)).length;
  const shown = rows.filter((r) => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (!q) return true;
    const hay = [r.reference, r.rc_number, r.org_name, r.first_name, r.last_name, r.nin].join(' ').toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-light pb-16">
      <header className="bg-violet-950 text-white px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Link href="/tin" className="text-xs font-bold text-violet-300">← New application</Link>
          <h1 className="mt-1 text-2xl font-extrabold">Tax ID (TIN) History</h1>
          <p className="mt-1 text-sm text-violet-100">Track your requests and copy your generated Tax IDs.</p>
        </div>
      </header>
      <main className="max-w-2xl mx-auto p-4 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          {[
            { l: 'Pending', n: count(['pending', 'awaiting_payment']), c: 'text-amber-600' },
            { l: 'Processing', n: count(['processing']), c: 'text-blue-600' },
            { l: 'Completed', n: count(['completed']), c: 'text-green-600' },
            { l: 'Failed', n: count(['failed']), c: 'text-red-600' },
          ].map((k) => (
            <div key={k.l} className="rounded-2xl border border-border bg-white p-4">
              <p className="text-xs font-bold text-muted">{k.l}</p>
              <p className={'text-2xl font-extrabold ' + k.c}>{k.n}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-white p-4 space-y-3">
          <input className="w-full rounded-xl border border-border bg-light px-4 py-3 text-sm text-dark" placeholder="🔍 Search by RC number, name or reference…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="w-full rounded-xl border border-border bg-light px-4 py-3 text-sm text-dark" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div className="space-y-3">
          {!loaded && <p className="text-center text-xs text-muted">Loading…</p>}
          {loaded && shown.length === 0 && (
            <div className="rounded-2xl border border-border bg-white p-8 text-center">
              <p className="text-sm font-bold text-dark">No requests found</p>
              <p className="mt-1 text-xs text-muted">Adjust your filters or submit a new Tax ID request.</p>
            </div>
          )}
          {shown.map((r) => (
            <div key={r.reference} className="rounded-2xl border border-border bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-dark truncate">{r.org_name || ((r.first_name ?? '') + ' ' + (r.last_name ?? '')).trim() || (r.request_type === 'individual' ? 'Individual TIN' : 'Corporate TIN')}</p>
                  <p className="text-[10px] text-muted">{r.reference} • {new Date(r.created_at).toLocaleDateString()} • {r.request_type === 'individual' ? 'NIN: ' + (r.nin ?? '') : 'RC: ' + (r.rc_number ?? '')}</p>
                </div>
                <span className={'shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold ' + (BADGE[r.status] ?? 'bg-light text-muted border-border')}>{r.status}</span>
              </div>
              {r.status === 'completed' && r.issued_tin && (
                <div className="mt-3 flex items-center justify-between rounded-xl bg-green-50 border border-green-200 px-3 py-2">
                  <p className="text-sm font-extrabold text-green-700">TIN: {r.issued_tin}</p>
                  <button onClick={() => navigator.clipboard.writeText(r.issued_tin)} className="text-xs font-bold text-violet-800 underline">Copy ID</button>
                </div>
              )}
              {r.status === 'failed' && <p className="mt-2 text-[11px] text-red-700">This request failed. Your fee will be reviewed for refund — contact support.</p>}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

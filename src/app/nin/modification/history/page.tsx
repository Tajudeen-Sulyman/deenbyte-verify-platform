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
const TITLES: Record<string, string> = { name: 'Change of Name', phone: 'Change of Phone', address: 'Change of Address' };

export default function ModHistoryPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { fetch('/api/v1/ninmod/history').then((r) => r.json()).then((j) => { setRows(j.rows ?? []); setLoaded(true); }).catch(() => setLoaded(true)); }, []);
  return (
    <div className="min-h-screen bg-light pb-16">
      <header className="bg-violet-950 text-white px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Link href="/nin/modification" className="text-xs font-bold text-violet-300">← New modification</Link>
          <h1 className="mt-1 text-2xl font-extrabold">Modification History</h1>
          <p className="mt-1 text-sm text-violet-100">Track your NIN modification requests and download results.</p>
        </div>
      </header>
      <main className="max-w-2xl mx-auto p-4 space-y-3 mt-4">
        {!loaded && <p className="text-center text-xs text-muted">Loading…</p>}
        {loaded && rows.length === 0 && (
          <div className="rounded-2xl border border-border bg-white p-8 text-center">
            <p className="text-sm font-bold text-dark">No modification requests yet</p>
            <p className="mt-1 text-xs text-muted">Submit a new NIN modification to see it here.</p>
          </div>
        )}
        {rows.map((r) => (
          <div key={r.reference} className="rounded-2xl border border-border bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-dark">{TITLES[r.mod_type] ?? r.mod_type}</p>
                <p className="text-[10px] text-muted">{r.reference} • {new Date(r.created_at).toLocaleString()} • NIN: {r.nin}</p>
              </div>
              <span className={'rounded-full border px-2 py-1 text-[10px] font-bold ' + (BADGE[r.status] ?? '')}>{r.status}</span>
            </div>
            {r.status === 'completed' && r.completed_document && (
              <a href={r.completed_document} target="_blank" rel="noreferrer" className="mt-3 block rounded-xl bg-green-50 border border-green-200 px-3 py-2 text-center text-xs font-extrabold text-green-700">↓ DOWNLOAD RESULT DOCUMENT</a>
            )}
            {r.status === 'failed' && <p className="mt-2 text-[11px] text-red-700">{r.admin_note || r.error_message || 'This request failed. Contact support for refund review.'}</p>}
          </div>
        ))}
      </main>
    </div>
  );
}

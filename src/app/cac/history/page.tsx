'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const BADGE: Record<string, string> = {
  awaiting_payment: 'bg-amber-50 text-amber-700 border-amber-200', pending: 'bg-amber-50 text-amber-700 border-amber-200',
  processing: 'bg-blue-50 text-blue-700 border-blue-200', queried: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-green-50 text-green-700 border-green-200', failed: 'bg-red-50 text-red-700 border-red-200',
};

export default function CacHistoryPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('reference');
    if (ref) {
      let n = 0;
      const t = setInterval(async () => {
        n++;
        const j = await fetch('/api/v1/cac/confirm?reference=' + encodeURIComponent(ref)).then((x) => x.json()).catch(() => null);
        if (j?.confirmed || n > 20) clearInterval(t);
      }, 3000);
    }
    fetch('/api/v1/cac/history').then((r) => r.json()).then((j) => { setRows(j.rows ?? []); setLoaded(true); }).catch(() => setLoaded(true));
  }, []);
  async function openDoc(path: string) {
    const j = await fetch('/api/v1/cac/doc-url?path=' + encodeURIComponent(path)).then((r) => r.json()).catch(() => null);
    if (j?.url) window.open(j.url, '_blank');
  }
  return (
    <div className="min-h-screen bg-light pb-16">
      <header className="bg-violet-950 text-white px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <Link href="/cac" className="text-xs font-bold text-violet-300">← CAC Hub</Link>
          <h1 className="mt-1 text-xl font-extrabold">CAC Application History</h1>
        </div>
      </header>
      <main className="max-w-2xl mx-auto p-4 space-y-3 mt-4">
        {!loaded && <p className="text-center text-xs text-muted">Loading…</p>}
        {loaded && rows.length === 0 && <p className="card3d rounded-2xl bg-white p-8 text-center text-xs text-muted">No CAC applications yet.</p>}
        {rows.map((r) => (
          <div key={r.reference} className="card3d rounded-2xl bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-dark">{r.payload?.name?.proposed ?? r.entity_type}</p>
                <p className="text-[10px] text-muted">{r.reference} • {r.entity_type.toUpperCase()} • {new Date(r.created_at).toLocaleString()}</p>
              </div>
              <span className={'rounded-full border px-2 py-1 text-[10px] font-bold ' + (BADGE[r.status] ?? '')}>{r.status}</span>
            </div>
            {r.status === 'queried' && r.admin_note && <p className="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-800">Query: {r.admin_note}</p>}
            {r.status === 'failed' && <p className="mt-2 text-[11px] text-red-700">{r.admin_note || 'Failed. Contact support.'}</p>}
            {r.status === 'completed' && Array.isArray(r.completed_docs) && r.completed_docs.length > 0 && (
              <div className="mt-3 space-y-2">
                {r.completed_docs.map((d: any, i: number) => (
                  <button key={i} onClick={() => openDoc(d.path)} className="w-full rounded-xl bg-green-50 border border-green-200 px-3 py-2.5 text-left text-xs font-extrabold text-green-700">↓ {d.name}</button>
                ))}
              </div>
            )}
          </div>
        ))}
      </main>
    </div>
  );
}

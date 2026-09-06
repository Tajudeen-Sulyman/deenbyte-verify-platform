'use client';
import { useEffect, useState } from 'react';

const BADGE: Record<string, string> = {
  awaiting_payment: 'bg-amber-50 text-amber-700', pending: 'bg-amber-50 text-amber-700', processing: 'bg-blue-50 text-blue-700',
  queried: 'bg-amber-50 text-amber-700', completed: 'bg-green-50 text-green-700', failed: 'bg-red-50 text-red-700',
};

export function CacAdmin() {
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [files, setFiles] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const load = () => fetch('/api/v1/cac/admin/list').then((r) => r.json()).then((j) => setRows(j.rows ?? [])).catch(() => {});
  useEffect(() => { load(); }, []);

  async function act(reference: string, action: string) {
    setBusy(true);
    let docs: any[] = [];
    if (action === 'completed') {
      docs = Object.keys(files).filter((k) => k.startsWith(reference + '|')).map((k) => ({ name: k.split('|')[1], base64: files[k] }));
      if (docs.length === 0) { alert('Choose the finished document(s) first.'); setBusy(false); return; }
    }
    await fetch('/api/v1/cac/admin/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reference, action, note, docs }) });
    setNote(''); setBusy(false); load();
  }
  async function openDoc(path: string) {
    const j = await fetch('/api/v1/cac/doc-url?path=' + encodeURIComponent(path)).then((r) => r.json()).catch(() => null);
    if (j?.url) window.open(j.url, '_blank');
  }
  function onFiles(reference: string, e: any) {
    const list = Array.from(e.target.files ?? []) as File[];
    list.forEach((f) => {
      if (f.size > 2000000) { alert('Max 2MB per file: ' + f.name); return; }
      const r = new FileReader();
      r.onload = () => setFiles((prev) => ({ ...prev, [reference + '|' + f.name]: String(r.result ?? '').split(',')[1] ?? '' }));
      r.readAsDataURL(f);
    });
  }

  const shown = rows.filter((r) => !filter || r.status === filter);
  return (
    <div className="space-y-3">
      <div className="card3d flex items-center gap-2 rounded-xl bg-white p-3">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-lg border border-border bg-light px-3 py-2 text-xs font-bold text-dark">
          <option value="">All statuses</option>
          {['awaiting_payment', 'pending', 'processing', 'queried', 'completed', 'failed'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <p className="ml-auto text-xs font-bold text-muted">{shown.length} applications</p>
      </div>
      {shown.map((r) => (
        <div key={r.reference} className="card3d rounded-2xl bg-white p-4">
          <button onClick={() => setOpen(open === r.reference ? null : r.reference)} className="flex w-full items-center justify-between gap-2 text-left">
            <div>
              <p className="text-sm font-bold text-dark">{r.payload?.name?.proposed ?? '—'}</p>
              <p className="text-[10px] text-muted">{r.reference} • {r.entity_type.toUpperCase()} • ₦{Number(r.fee).toLocaleString('en-NG')} • {new Date(r.created_at).toLocaleDateString()}</p>
            </div>
            <span className={'rounded-full px-2 py-1 text-[10px] font-bold ' + (BADGE[r.status] ?? '')}>{r.status}</span>
          </button>
          {open === r.reference && (
            <div className="mt-4 space-y-3 border-t border-border pt-3">
              <div className="rounded-xl border border-border p-3 text-[11px] space-y-1">
                <p className="text-dark"><b>Nature:</b> {r.payload?.name?.nature}</p>
                {r.payload?.name?.alt1 && <p className="text-dark"><b>Alt 1:</b> {r.payload.name.alt1}</p>}
                {r.payload?.name?.alt2 && <p className="text-dark"><b>Alt 2:</b> {r.payload.name.alt2}</p>}
                <p className="text-dark"><b>Address:</b> {r.payload?.company?.streetNo} {r.payload?.company?.street}, {r.payload?.company?.city}, {r.payload?.company?.state}</p>
                <p className="text-dark"><b>Email:</b> {r.email} • <b>Phone:</b> {r.phone}</p>
                <p className="text-dark"><b>Structure:</b> {r.payload?.ownership}</p>
                {(r.payload?.persons ?? []).map((p: any, i: number) => (
                  <p key={i} className="text-dark"><b>Person {i + 1}:</b> {p.surname} {p.first} • {p.gender} • {p.dob} • {p.phone} • {p.email} • {p.address}, {p.city}, {p.lga}, {p.state}</p>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(r.payload?.docPaths ?? {}).map(([k, path]: any) => (
                  <button key={k} onClick={() => openDoc(path)} className="rounded-lg bg-violet-50 border border-violet-200 px-3 py-2 text-[10px] font-bold text-violet-700">📄 {k.replace('_', ' ')}</button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {r.status !== 'processing' && r.status !== 'completed' && <button onClick={() => act(r.reference, 'processing')} disabled={busy} className="rounded-lg bg-blue-600 px-3 py-2 text-[10px] font-extrabold text-white">Mark Processing</button>}
                {r.status !== 'completed' && (<>
                  <button onClick={() => act(r.reference, 'queried')} disabled={busy} className="rounded-lg bg-amber-600 px-3 py-2 text-[10px] font-extrabold text-white">Query</button>
                  <button onClick={() => act(r.reference, 'failed')} disabled={busy} className="rounded-lg bg-red-600 px-3 py-2 text-[10px] font-extrabold text-white">Fail</button>
                </>)}
              </div>
              {r.status !== 'completed' && (<>
                <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note / query message for customer" className="w-full rounded-lg border border-border bg-light px-3 py-2 text-xs text-dark" />
                <div>
                  <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => onFiles(r.reference, e)} className="text-[10px] text-muted file:mr-2 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-[10px] file:font-bold file:text-white" />
                  <p className="mt-1 text-[10px] text-muted">Staged: {Object.keys(files).filter((k) => k.startsWith(r.reference + '|')).map((k) => k.split('|')[1]).join(', ') || 'none'}</p>
                </div>
                <button onClick={() => act(r.reference, 'completed')} disabled={busy} className="w-full rounded-xl bg-green-600 py-3 text-xs font-extrabold text-white disabled:opacity-60">{busy ? 'Uploading…' : 'Complete & Deliver Documents'}</button>
              </>)}
              {r.status === 'completed' && Array.isArray(r.completed_docs) && (
                <div className="space-y-1">{r.completed_docs.map((d: any, i: number) => <button key={i} onClick={() => openDoc(d.path)} className="block text-[10px] font-bold text-green-700 underline">✓ {d.name}</button>)}</div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

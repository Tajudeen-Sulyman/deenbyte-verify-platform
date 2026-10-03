'use client';
import { useState } from 'react';

type Row = {
  id: string;
  state: 'queued' | 'submitting' | 'pending' | 'failed';
  reference?: string;
  message?: string;
  status?: string;
  note?: string | null;
  newNin?: string | null;
  newTrackingId?: string | null;
};

const RE = /^[A-Za-z0-9]{1,20}$/;

export default function IpeForm({ price }: { price: number }) {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [text, setText] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);

  const ids =
    mode === 'single'
      ? text.trim() ? [text.trim()] : []
      : Array.from(new Set(text.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean)));
  const invalid = ids.filter((i) => !RE.test(i));
  const tooMany = ids.length > 50;
  const total = ids.length * price;
  const canSubmit = !busy && ids.length > 0 && invalid.length === 0 && !tooMany;

  const patch = (id: string, p: Partial<Row>) =>
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...p } : x)));

  function switchMode(m: 'single' | 'bulk') {
    if (busy) return;
    setMode(m); setText(''); setRows([]);
  }

  async function submit() {
    setBusy(true);
    setRows(ids.map((id) => ({ id, state: 'queued' })));
    for (const id of ids) {
      patch(id, { state: 'submitting' });
      try {
        const res = await fetch('/api/v1/ipe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tracking_id: id }),
        });
        const j = await res.json();
        if (!res.ok) {
          patch(id, { state: 'failed', message: j.error ?? 'Failed' });
          if (/balance/i.test(j.error ?? '')) break; // stop charging further IDs
        } else {
          patch(id, { state: 'pending', reference: j.reference });
        }
      } catch {
        patch(id, { state: 'failed', message: 'Network error. Check History before retrying.' });
      }
    }
    setBusy(false);
  }

  async function check(row: Row) {
    const res = await fetch('/api/v1/ipe?reference=' + encodeURIComponent(row.reference!));
    const j = await res.json();
    patch(row.id, {
      status: j.status,
      note: j.note ?? j.error ?? null,
      newNin: j.new_nin ?? null,
      newTrackingId: j.new_tracking_id ?? null,
    });
  }

  const tab = (m: 'single' | 'bulk') =>
    'flex-1 rounded-xl px-4 py-3 text-sm font-semibold ' +
    (mode === m ? 'bg-primary text-white' : 'text-muted');

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
        Service cost: ₦{price.toLocaleString()} per tracking ID
      </div>

      <div className="flex gap-1 rounded-2xl border border-border p-1">
        <button type="button" className={tab('single')} onClick={() => switchMode('single')}>Single</button>
        <button type="button" className={tab('bulk')} onClick={() => switchMode('bulk')}>Bulk</button>
      </div>

      {mode === 'single' ? (
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter Tracking ID"
          maxLength={20}
          className="w-full rounded-xl border border-border px-4 py-3"
        />
      ) : (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'One tracking ID per line\nTRACK001\nTRACK002'}
          rows={7}
          className="w-full rounded-xl border border-border px-4 py-3 font-mono text-sm"
        />
      )}

      <div className="flex items-center justify-between text-sm">
        <span>IDs: <b>{ids.length}</b> / 50</span>
        <span className="rounded-lg bg-primary/10 px-3 py-1 font-semibold text-primary">
          Total: ₦{total.toLocaleString()}
        </span>
      </div>
      {invalid.length > 0 && (
        <p className="text-sm text-red-600">
          Invalid (1-20 letters/numbers only): {invalid.slice(0, 3).join(', ')}{invalid.length > 3 ? '…' : ''}
        </p>
      )}
      {tooMany && <p className="text-sm text-red-600">Maximum 50 IDs per batch.</p>}

      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit}
        className="w-full rounded-xl bg-primary py-3 font-semibold text-white disabled:opacity-50"
      >
        {busy ? 'Submitting…' : ids.length > 1 ? `Submit ${ids.length} requests` : 'Submit'}
      </button>

      {rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="rounded-xl border border-border p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold">{r.id}</span>
                <span>
                  {r.state === 'queued' && 'Not submitted'}
                  {r.state === 'submitting' && 'Submitting…'}
                  {r.state === 'failed' && <span className="text-red-600">Failed</span>}
                  {r.state === 'pending' && <span className="text-amber-700">{r.status ?? 'pending'}</span>}
                </span>
              </div>
              {r.message && <p className="mt-1 text-red-600">{r.message}</p>}
              {r.reference && <p className="mt-1 text-xs text-muted">Ref: {r.reference}</p>}
              {r.note && <p className="mt-1">{r.note}</p>}
              {r.newNin && <p className="mt-1">New NIN: <b>{r.newNin}</b></p>}
              {r.newTrackingId && <p className="mt-1">New tracking ID: <b>{r.newTrackingId}</b></p>}
              {r.reference && (
                <button type="button" onClick={() => check(r)} className="mt-2 text-primary underline">
                  Check status
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

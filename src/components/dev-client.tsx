'use client';

import { useState } from 'react';

export function DevClient({ initialKeys }: { initialKeys: any[] }) {
  const [keys, setKeys] = useState(initialKeys);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState('');

  async function refresh() {
    const list = await fetch('/api/keys').then((r) => r.json());
    setKeys(list.keys ?? []);
  }

  async function create() {
    setBusy(true); setErr(''); setNewKey(null);
    const res = await fetch('/api/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { setErr(json.error ?? 'Could not create key.'); return; }
    setNewKey(json.key);
    setName('');
    await refresh();
  }

  async function copy() {
    if (!newKey) return;
    try {
      await navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  async function revoke(id: string) {
    await fetch('/api/keys/' + id, { method: 'DELETE' });
    await refresh();
  }

  return (
    <section className="rounded-2xl bg-white border border-border shadow-card p-5 space-y-4">
      <h3 className="text-sm font-bold text-dark">API keys</h3>

      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Key name (e.g. My POS app)"
          className="flex-1 rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-dark placeholder:text-muted focus:border-primary focus:outline-none"
        />
        <button onClick={create} disabled={busy}
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50">
          {busy ? 'Creating…' : 'Create key'}
        </button>
      </div>
      {err && <p className="text-xs text-red-600">{err}</p>}

      {newKey && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-semibold text-amber-700">Copy now — this key is shown only once.</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 break-all text-xs text-dark">{newKey}</code>
            <button onClick={copy}
              className="shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white">
              {copied ? 'Copied ✓' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {keys.length === 0 ? (
        <p className="text-sm text-muted">No API keys yet. Create one to start integrating.</p>
      ) : (
        <div className="space-y-2">
          {keys.map((k: any) => (
            <div key={k.id} className="flex items-center justify-between gap-3 border-b border-border last:border-0 pb-2 last:pb-0">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-dark truncate">{k.name}</p>
                <p className="text-xs text-muted">{k.key_prefix}… · created {new Date(k.created_at).toLocaleDateString()}
                  {k.last_used_at ? ' · last used ' + new Date(k.last_used_at).toLocaleDateString() : ' · never used'}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={'text-[10px] font-semibold px-2 py-1 rounded-full border ' + (k.enabled ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200')}>
                  {k.enabled ? 'active' : 'revoked'}
                </span>
                {k.enabled && (
                  <button onClick={() => revoke(k.id)} className="text-xs font-semibold text-red-600 underline">Revoke</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

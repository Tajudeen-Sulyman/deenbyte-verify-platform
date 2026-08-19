'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Service = {
  id: string;
  service_id: string;
  name: string;
  category: string;
  reference_price: number | null;
  provider_cost: number | null;
  selling_price: number;
  enabled: boolean;
  status: string;
};

export function AdminServices({ services }: { services: Service[] }) {
  const supabase = createClient();
  const [rows, setRows] = useState(services);
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  const update = (id: string, patch: Partial<Service>) => {
    setRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const save = async (row: Service) => {
    setSaving(row.id);
    setMsg('');
    const { error } = await supabase
      .from('verification_services')
      .update({ selling_price: row.selling_price, enabled: row.enabled, status: row.status })
      .eq('id', row.id);
    setSaving(null);
    setMsg(error ? 'Error: ' + error.message : row.name + ' updated — live immediately.');
  };

  return (
    <div className="space-y-4">
      {msg && (
        <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2 text-sm text-green-700">{msg}</div>
      )}

      {rows.map((s) => {
        const margin = Number(s.selling_price) - Number(s.provider_cost ?? 0);
        return (
          <div key={s.id} className="card3d p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-dark">{s.name}</p>
                <p className="text-xs text-muted">{s.category} · {s.service_id}</p>
              </div>
              <label className="flex items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={s.enabled}
                  onChange={(e) => update(s.id, { enabled: e.target.checked })}
                  className="h-4 w-4 accent-primary"
                />
                Enabled
              </label>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted">Reference price</p>
                <p className="font-medium text-dark">₦{Number(s.reference_price ?? 0).toLocaleString('en-NG')}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Provider cost</p>
                <p className="font-medium text-dark">₦{Number(s.provider_cost ?? 0).toLocaleString('en-NG')}</p>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">Selling price (₦)</p>
                <input
                  type="number"
                  value={s.selling_price}
                  onChange={(e) => update(s.id, { selling_price: Number(e.target.value) })}
                  className="w-full rounded-lg border border-border px-2 py-1.5 text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <p className="text-xs text-muted mb-1">Status</p>
                <select
                  value={s.status}
                  onChange={(e) => update(s.id, { status: e.target.value })}
                  className="w-full rounded-lg border border-border px-2 py-1.5 text-sm bg-white outline-none focus:border-primary"
                >
                  <option value="active">active</option>
                  <option value="coming_soon">coming_soon</option>
                  <option value="maintenance">maintenance</option>
                  <option value="inactive">inactive</option>
                </select>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-muted">
                Margin per verification:{' '}
                <span className={margin > 0 ? 'text-primary font-semibold' : 'text-red-600 font-semibold'}>
                  ₦{margin.toLocaleString('en-NG')}
                </span>
              </p>
              <button
                onClick={() => save(s)}
                disabled={saving === s.id}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving === s.id ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

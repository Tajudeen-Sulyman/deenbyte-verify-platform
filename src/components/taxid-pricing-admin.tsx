'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type TierPrice = { tier: string; price: number };

export function TaxIdPricingAdmin({ prices }: { prices: TierPrice[] }) {
  const supabase = createClient();
  const [rows, setRows] = useState(prices);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const update = (tier: string, price: number) => {
    setRows(rows.map((r) => (r.tier === tier ? { ...r, price } : r)));
  };

  const save = async () => {
    setSaving(true);
    setMsg('');
    let err: string | null = null;
    for (const r of rows) {
      const { error } = await supabase.from('taxid_pricing').update({ price: r.price, updated_at: new Date().toISOString() }).eq('tier', r.tier);
      if (error) err = error.message;
    }
    setSaving(false);
    setMsg(err ? 'Error: ' + err : 'TIN slip prices updated \u2014 live immediately.');
  };

  return (
    <div className="card3d p-5">
      <p className="font-semibold text-dark mb-3">TIN Verification Slip prices</p>
      {msg && <div className="mb-3 bg-green-50 border border-green-100 rounded-lg px-3 py-2 text-sm text-green-700">{msg}</div>}
      <div className="grid grid-cols-2 gap-3 text-sm">
        {rows.map((r) => (
          <div key={r.tier}>
            <p className="text-xs text-muted mb-1">{r.tier === 'premium' ? 'Premium' : 'Standard'} (\u20a6)</p>
            <input
              type="number"
              value={r.price}
              onChange={(e) => update(r.tier, Number(e.target.value))}
              className="w-full rounded-lg border border-border px-2 py-1.5 text-sm outline-none focus:border-primary"
            />
          </div>
        ))}
      </div>
      <button onClick={save} disabled={saving} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
        {saving ? 'Saving\u2026' : 'Save'}
      </button>
    </div>
  );
}

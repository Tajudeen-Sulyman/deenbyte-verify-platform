'use client';

import Link from 'next/link';
import { useState } from 'react';

const STATUS_STYLES: Record<string, string> = {
  successful: 'bg-green-50 text-green-700 border-green-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
  processing: 'bg-amber-50 text-amber-700 border-amber-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
};

const ASYNC_SERVICES = ['ipe_clearance', 'personalization', 'nin_validation'];

export function HistoryList({ initialRows }: { initialRows: any[] }) {
  const [rows, setRows] = useState(initialRows);
  const [checkingId, setCheckingId] = useState('');

  const checkStatus = async (row: any) => {
    const serviceId = row.verification_services?.service_id;
    if (!serviceId) return;
    setCheckingId(row.id);
    try {
      const res = await fetch('/api/v1/async/' + serviceId + '/status', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: row.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setRows((prev) => prev.map((r) =>
          r.id === row.id
            ? { ...r, status: data.status === 'processing' ? 'processing' : data.status, safe_response_data: data.data ?? r.safe_response_data }
            : r
        ));
      }
    } finally {
      setCheckingId('');
    }
  };

  if (!rows || rows.length === 0) {
    return <div className="bg-white border border-border rounded-2xl p-5 text-sm text-muted">No verifications yet.</div>;
  }

  return (
    <div className="space-y-3">
      {rows.map((r: any) => {
        const serviceId = r.verification_services?.service_id;
        const isAsync = ASYNC_SERVICES.includes(serviceId);
        return (
          <div key={r.id} className="bg-white border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between gap-3">
              <Link href={'/history/' + r.id} className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-dark truncate">
                  {r.verification_services?.name ?? 'Verification'}
                </p>
                <p className="text-xs text-muted mt-0.5">
                  {r.safe_request_data?.identifier} · {r.request_reference}
                </p>
                <p className="text-xs text-muted mt-0.5">{new Date(r.created_at).toLocaleString()}</p>
              </Link>
              <div className="text-right shrink-0">
                <span className={'inline-block text-xs font-semibold px-2 py-1 rounded-full border ' + (STATUS_STYLES[r.status] ?? 'bg-light text-muted border-border')}>
                  {r.status}
                </span>
                <p className="text-sm font-semibold text-dark mt-1">
                  ₦{Number(r.selling_price).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </p>
                {isAsync && r.status === 'processing' && (
                  <button
                    onClick={() => checkStatus(r)}
                    disabled={checkingId === r.id}
                    className="mt-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    {checkingId === r.id ? 'Checking…' : 'Check Status'}
                  </button>
                )}
                {r.status === 'successful' && (
                  <a href={'/api/v1/slip/' + r.id} target="_blank" rel="noopener"
                    className="mt-1 inline-block text-xs font-semibold text-primary underline">Slip</a>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

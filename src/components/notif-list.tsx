'use client';
import { useEffect, useState } from 'react';

export function NotifList() {
  const [rows, setRows] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const load = () => fetch('/api/v1/notifications').then((r) => r.json()).then((j) => { setRows(j.rows ?? []); setUnread(j.unread ?? 0); }).catch(() => {});
  useEffect(() => { load(); }, []);
  async function markAll() { await fetch('/api/v1/notifications/read', { method: 'POST' }); load(); }
  return (
    <div className="space-y-3">
      <div className="card3d p-4 flex items-center justify-between">
        <p className="text-sm font-bold text-dark">{unread} unread</p>
        {unread > 0 && <button onClick={markAll} className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white">Mark all read</button>}
      </div>
      {rows.length === 0 && <p className="card3d p-6 text-center text-xs text-muted">No notifications yet.</p>}
      {rows.map((r) => (
        <div key={r.id} className={'card3d p-4 ' + (!r.read ? 'border-l-4 border-l-violet-600' : 'opacity-70')}>
          <p className="text-sm font-bold text-dark">{r.title}</p>
          {r.body && <p className="mt-1 text-xs text-muted">{r.body}</p>}
          <p className="mt-1 text-[10px] text-muted">{new Date(r.created_at).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}

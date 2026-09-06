'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function ProfileCard() {
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({ full_name: '', phone: '' });
  const [msg, setMsg] = useState('');
  const [bal, setBal] = useState(0);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }: any) => {
      setUser(data.user);
      setF({ full_name: data.user?.user_metadata?.full_name ?? '', phone: data.user?.user_metadata?.phone ?? '' });
    });
    fetch('/api/v1/taxid/me').then((r) => r.json()).then((j) => setBal(j.balance ?? 0)).catch(() => {});
  }, []);
  async function save() {
    const { error } = await supabase.auth.updateUser({ data: { full_name: f.full_name, phone: f.phone } });
    setMsg(error ? 'Could not save: ' + error.message : 'Profile updated ✅');
    if (!error) { const { data } = await supabase.auth.getUser(); setUser(data.user); }
    setEdit(false);
  }
  async function logout() { await supabase.auth.signOut(); window.location.href = '/login'; }
  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Customer';
  const initial = (name[0] ?? 'D').toUpperCase();
  return (
    <div className="space-y-4">
      <div className="card3d rounded-2xl bg-white p-6 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary text-3xl font-extrabold text-white">{initial}</div>
        <p className="mt-3 text-lg font-extrabold text-dark">{name}</p>
        <p className="text-xs text-muted">{user?.email}</p>
        <p className="mt-1 text-[10px] text-muted">Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</p>
        <div className="mt-4 rounded-xl bg-primary/10 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Wallet Balance</p>
          <p className="text-xl font-extrabold text-primary">₦{Number(bal).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>
      <div className="card3d rounded-2xl bg-white p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-extrabold text-dark">Edit Profile</p>
          <button onClick={() => setEdit(!edit)} className="text-xs font-bold text-primary">{edit ? 'Cancel' : 'Edit'}</button>
        </div>
        {edit && (<>
          <input className="w-full rounded-xl border border-border bg-light px-4 py-3 text-sm text-dark" placeholder="Full name" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} />
          <input className="w-full rounded-xl border border-border bg-light px-4 py-3 text-sm text-dark" placeholder="Phone e.g. 08012345678" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          <button onClick={save} className="w-full rounded-xl bg-primary py-3 text-sm font-extrabold text-white">Save Changes</button>
        </>)}
        {msg && <p className="text-xs font-bold text-green-700">{msg}</p>}
      </div>
      <div className="card3d rounded-2xl bg-white p-5 space-y-2">
        <a href="mailto:deenbyte.technologies@gmail.com" className="block rounded-xl border border-border px-4 py-3 text-sm font-bold text-dark"> Support</a>
        <button onClick={logout} className="w-full rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-extrabold text-red-700">Log out</button>
      </div>
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function ProfileCard() {
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({ full_name: '', phone: '' });
  const [msg, setMsg] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }: any) => {
      setUser(data.user);
      setF({ full_name: data.user?.user_metadata?.full_name ?? '', phone: data.user?.user_metadata?.phone ?? '' });
    });
    fetch('/api/v1/profile').then((r) => r.json()).then((j) => setAvatarUrl(j.avatarUrl ?? null)).catch(() => {});
  }, []);
  async function save() {
    const { error } = await supabase.auth.updateUser({ data: { full_name: f.full_name, phone: f.phone } });
    setMsg(error ? 'Could not save: ' + error.message : 'Profile updated ✅');
    if (!error) { const { data } = await supabase.auth.getUser(); setUser(data.user); setEdit(false); }
  }
  async function onPhoto(e: any) {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 1500000) { setMsg('Max 1.5MB for photo.'); return; }
    const r = new FileReader();
    r.onload = async () => {
      const res = await fetch('/api/v1/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ base64: String(r.result ?? '').split(',')[1] ?? '', ext: (file.name.split('.').pop() ?? 'jpg').toLowerCase() }) });
      const j = await res.json();
      if (j.avatarUrl) { setAvatarUrl(j.avatarUrl); setMsg('Photo updated ✅'); } else setMsg(j.error ?? 'Upload failed');
    };
    r.readAsDataURL(file);
  }
  async function logout() { await supabase.auth.signOut(); window.location.href = '/login'; }
  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Customer';
  const initial = (name[0] ?? 'D').toUpperCase();
  return (
    <div className="plain-bg -m-4 min-h-[calc(100vh-3.5rem)] p-4 lg:-m-6 lg:p-6">
      <div className="mx-auto max-w-md space-y-3 pt-6">
        <div className="card3d rounded-2xl bg-white p-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              {avatarUrl ? <img src={avatarUrl} alt="profile" className="h-16 w-16 rounded-full object-cover border-2 border-primary" />
                : <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-extrabold text-white">{initial}</div>}
              <label className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-primary text-xs text-white shadow">📷
                <input type="file" accept="image/*" onChange={onPhoto} className="hidden" />
              </label>
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-extrabold text-dark">{name}</p>
              <p className="truncate text-xs text-muted">{user?.email}</p>
            </div>
          </div>
          <div className="mt-4 border-t border-border pt-2">
            <button onClick={() => setEdit(!edit)} className="flex w-full items-center gap-3 px-1 py-3 text-sm font-bold text-dark">
              <span>✏️</span> Edit Profile
            </button>
            <a href="mailto:deenbyte.technologies@gmail.com" className="flex w-full items-center gap-3 border-t border-border px-1 py-3 text-sm font-bold text-dark">
              <span>🎧</span> Support
            </a>
            <button onClick={logout} className="flex w-full items-center gap-3 border-t border-border px-1 py-3 text-sm font-bold text-red-600">
              <span>⎋</span> Log out
            </button>
          </div>
        </div>
        {edit && (
          <div className="card3d space-y-3 rounded-2xl bg-white p-5">
            <p className="text-sm font-extrabold text-dark">Edit Profile</p>
            <input className="w-full rounded-xl border border-border bg-light px-4 py-3 text-sm text-dark" placeholder="Full name" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} />
            <input className="w-full rounded-xl border border-border bg-light px-4 py-3 text-sm text-dark" placeholder="Phone e.g. 08012345678" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
            <button onClick={save} className="w-full rounded-xl bg-primary py-3 text-sm font-extrabold text-white">Save Changes</button>
          </div>
        )}
        {msg && <p className="text-center text-xs font-bold text-green-700">{msg}</p>}
      </div>
    </div>
  );
}

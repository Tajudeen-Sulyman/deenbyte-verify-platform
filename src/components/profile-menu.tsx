'use client';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function ProfileMenu({ email, avatarUrl }: { email: string; avatarUrl?: string }) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [f, setF] = useState({ full_name: '', phone: '' });
  const [msg, setMsg] = useState('');
  const [photo, setPhoto] = useState<string | null>(avatarUrl ?? null);
  const ref = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  useEffect(() => {
    supabase.auth.getUser().then(({ data }: any) => {
      setUser(data.user);
      setF({ full_name: data.user?.user_metadata?.full_name ?? '', phone: data.user?.user_metadata?.phone ?? '' });
    });
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setEdit(false); } }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
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
      if (j.avatarUrl) { setPhoto(j.avatarUrl); setMsg('Photo updated ✅'); } else setMsg(j.error ?? 'Upload failed');
    };
    r.readAsDataURL(file);
  }
  async function logout() { await supabase.auth.signOut(); window.location.href = '/login'; }
  const name = user?.user_metadata?.full_name || email.split('@')[0] || 'Customer';
  const initial = (name[0] ?? 'D').toUpperCase();
  return (
    <div className="relative shrink-0" ref={ref}>
      <button onClick={() => setOpen(!open)} aria-label="Profile" className="block">
        {photo ? <img src={photo} alt="profile" className="h-9 w-9 rounded-full object-cover border-2 border-primary" />
          : <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-white">{initial}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-72 rounded-2xl border border-border bg-white p-4 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="relative">
              {photo ? <img src={photo} alt="profile" className="h-12 w-12 rounded-full object-cover border-2 border-primary" />
                : <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-extrabold text-white">{initial}</div>}
              <label className="absolute -bottom-1 -right-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-primary text-[10px] text-white shadow">📷
                <input type="file" accept="image/*" onChange={onPhoto} className="hidden" />
              </label>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-dark">{name}</p>
              <p className="truncate text-[11px] text-muted">{email}</p>
            </div>
          </div>
          <div className="mt-3 border-t border-border pt-1">
            <button onClick={() => setEdit(!edit)} className="flex w-full items-center gap-3 px-1 py-3 text-sm font-bold text-dark">✏️ Edit Profile</button>
            <a href="mailto:deenbyte.technologies@gmail.com" className="flex w-full items-center gap-3 border-t border-border px-1 py-3 text-sm font-bold text-dark">🎧 Support</a>
            <button onClick={logout} className="flex w-full items-center gap-3 border-t border-border px-1 py-3 text-sm font-bold text-red-600">⎋ Log out</button>
          </div>
          {edit && (
            <div className="mt-2 space-y-2 border-t border-border pt-3">
              <input className="w-full rounded-xl border border-border bg-light px-3 py-2.5 text-xs text-dark" placeholder="Full name" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} />
              <input className="w-full rounded-xl border border-border bg-light px-3 py-2.5 text-xs text-dark" placeholder="Phone e.g. 08012345678" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
              <button onClick={save} className="w-full rounded-xl bg-primary py-2.5 text-xs font-extrabold text-white">Save Changes</button>
            </div>
          )}
          {msg && <p className="mt-2 text-center text-[10px] font-bold text-green-700">{msg}</p>}
        </div>
      )}
    </div>
  );
}

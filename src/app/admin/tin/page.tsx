import { AppShell } from '@/components/shell';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createClient as adminClient } from '@supabase/supabase-js';
import { TinQueue } from '@/components/tin-queue';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'TIN Queue — DeenByte Admin' };

export default async function AdminTinPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: p1 } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const { data: p2 } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle();
  if (String(p1?.role ?? p2?.role ?? '').toLowerCase() !== 'admin') redirect('/dashboard');
  const admin = adminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data } = await admin.from('tin_requests').select('*').order('created_at', { ascending: false }).limit(200);
  return (
    <AppShell title="TIN Queue">
      <TinQueue rows={data ?? []} />
    </AppShell>
  );
}

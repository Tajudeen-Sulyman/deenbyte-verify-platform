import { AppShell } from '@/components/shell';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AdminServices } from '@/components/admin-services';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') redirect('/dashboard');

  const { data: services } = await supabase
    .from('verification_services').select('*').order('category').order('name');
  const { data: requests } = await supabase
    .from('verification_requests').select('status, selling_price');
  const { count: userCount } = await supabase
    .from('profiles').select('*', { count: 'exact', head: true });

  const reqs = requests ?? [];
  const successful = reqs.filter((r) => r.status === 'successful');
  const failed = reqs.filter((r) => r.status === 'failed');
  const revenue = successful.reduce((s, r) => s + Number(r.selling_price ?? 0), 0);

  const stats = [
    { label: 'Total Verifications', value: String(reqs.length) },
    { label: 'Successful', value: String(successful.length) },
    { label: 'Failed', value: String(failed.length) },
    { label: 'Gross Revenue', value: '₦' + revenue.toLocaleString('en-NG', { minimumFractionDigits: 2 }) },
    { label: 'Registered Users', value: String(userCount ?? 0) },
  ];

  return (
    <AppShell title="Admin">

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-dark">Admin Dashboard</h1>
          <p className="text-sm text-muted">Services, pricing and system health.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="card3d p-4">
              <p className="text-xs text-muted">{s.label}</p>
              <p className="text-lg font-bold text-dark mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        <div>
          <h2 className="font-semibold text-dark mb-3">Services & Pricing</h2>
          <AdminServices services={(services ?? []) as any} />
        </div>
      </div>
    </AppShell>
  );
}

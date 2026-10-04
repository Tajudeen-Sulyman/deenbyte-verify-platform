import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/shell';
import IpeForm from '@/components/ipe-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'IPE Clearance — DeenByte Verify' };

export default async function IpePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: svc } = await supabase
    .from('verification_services')
    .select('selling_price, status, enabled')
    .eq('service_id', 'ipe_clearance')
    .single();

  const available = !!svc && svc.status === 'active' && svc.enabled;

  return (
    <AppShell title="IPE Clearance">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-dark">IPE Clearance</h2>
          <p className="text-sm text-muted mt-1">
            Submit a tracking ID for IPE clearance. Requests are processed in the background.
            Track progress in{' '}
            <Link href="/history?status=pending" className="text-primary underline">History</Link>.
          </p>
        </div>
        {available ? (
          <IpeForm price={Number(svc!.selling_price)} />
        ) : (
          <p className="rounded-xl border border-border p-4 text-sm text-muted">
            This service is currently unavailable.
          </p>
        )}
      </div>
    </AppShell>
  );
}

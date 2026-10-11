import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/shell';
import LorabizForm from '@/components/lorabiz-form';
import ServiceHistory from '@/components/service-history';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'IPE Clearance — DeenByte Verify' };

export default async function IpeLorabizPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: svc } = await supabase
    .from('verification_services')
    .select('selling_price, status, enabled')
    .eq('service_id', 'lorabiz_ipe')
    .maybeSingle();
  const available = !!svc && svc.status === 'active' && svc.enabled;

  return (
    <AppShell title="IPE Clearance">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-dark">IPE Clearance</h2>
          <p className="text-sm text-muted mt-1">
            Clear an In-Processing Error on a NIN. Processing can take a while. Track it in History.
          </p>
        </div>
        {available ? (
          <LorabizForm kind="ipe" endpoint="/api/v1/lorabiz-ipe" price={Number(svc!.selling_price)} />
        ) : (
          <p className="rounded-xl border border-border p-4 text-sm text-muted">
            This service is currently unavailable.
          </p>
        )}
        <ServiceHistory serviceId="lorabiz_ipe" />
      </div>
    </AppShell>
  );
}

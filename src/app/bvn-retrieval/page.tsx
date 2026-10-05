import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/shell';
import ServiceHistory from '@/components/service-history';
import BvnRetrievalForm from '@/components/bvn-retrieval-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'BVN Retrieval — DeenByte Verify' };

export default async function BvnRetrievalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: svc } = await supabase
    .from('verification_services')
    .select('selling_price, status, enabled')
    .eq('service_id', 'bvn_retrieval')
    .single();
  const available = !!svc && svc.status === 'active' && svc.enabled;

  return (
    <AppShell title="BVN Retrieval">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-dark">BVN Retrieval</h2>
          <p className="text-sm text-muted mt-1">
            Retrieve a BVN using the owner&apos;s name and registered phone number. Processing can take a while.
            Track it in <Link href="/history?status=pending" className="text-primary underline">History</Link>.
          </p>
        </div>
        {available ? (
          <BvnRetrievalForm price={Number(svc!.selling_price)} />
        ) : (
          <p className="rounded-xl border border-border p-4 text-sm text-muted">
            This service is currently unavailable.
          </p>
        )}
        <ServiceHistory serviceId="bvn_retrieval" />
      </div>
    </AppShell>
  );
}

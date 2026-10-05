import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/shell';
import NinValidationForm from '@/components/nin-validation-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'NIN Validation — DeenByte Verify' };

export default async function NinValidationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: svc } = await supabase
    .from('verification_services')
    .select('selling_price, status, enabled')
    .eq('service_id', 'nin_validation')
    .single();
  const available = !!svc && svc.status === 'active' && svc.enabled;

  return (
    <AppShell title="NIN Validation">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-dark">NIN Validation</h2>
          <p className="text-sm text-muted mt-1">
            Submit a NIN for validation. The result is delivered when processing completes, and you get a
            notification. Track it in <Link href="/history?status=pending" className="text-primary underline">History</Link>.
          </p>
        </div>
        {available ? (
          <NinValidationForm price={Number(svc!.selling_price)} />
        ) : (
          <p className="rounded-xl border border-border p-4 text-sm text-muted">
            This service is currently unavailable.
          </p>
        )}
      </div>
    </AppShell>
  );
}

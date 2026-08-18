import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/shell';
import { VerifyForm } from '@/components/verify-form';
import { AsyncForm } from '@/components/async-form';
import { DemographicForm } from '@/components/demographic-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Verify — DeenByte Verify' };

function renderForm(s: any, walletBalance: number) {
  if (s.is_async) return <AsyncForm key={s.service_id} service={s} walletBalance={walletBalance} />;
  if (s.service_id === 'nin_demographic') return <DemographicForm key={s.service_id} service={s} walletBalance={walletBalance} />;
  return <VerifyForm key={s.service_id} service={s} walletBalance={walletBalance} />;
}

function Section({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted">{title}</h3>
        <p className="text-xs text-muted mt-0.5">{sub}</p>
      </div>
      {children}
    </section>
  );
}

export default async function VerifyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [walletRes, servicesRes] = await Promise.all([
    supabase.from('wallets').select('balance').eq('user_id', user.id).single(),
    supabase.from('verification_services').select('*')
      .eq('enabled', true).eq('status', 'active')
      .order('category').order('name'),
  ]);
  const walletBalance = Number(walletRes.data?.balance ?? 0);
  const services = servicesRes.data;

  const all = services ?? [];
  const nin = all.filter((s: any) => !s.is_async && s.category === 'NIN');
  const bvn = all.filter((s: any) => !s.is_async && s.category === 'BVN');
  const corrections = all.filter((s: any) => s.is_async);

  return (
    <AppShell title="Verify">
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold text-dark">Verify identity</h2>
          <p className="text-sm text-muted mt-1">Choose a service. Charges apply only from your wallet balance.</p>
        </div>

        {all.length === 0 && (
          <div className="bg-white border border-border rounded-2xl p-5 text-sm text-muted">No services available.</div>
        )}

        {nin.length > 0 && (
          <Section title="NIN services" sub="NIMC-sourced slips and searches">
            <div className="space-y-4">{nin.map((s: any) => renderForm(s, walletBalance))}</div>
          </Section>
        )}

        {bvn.length > 0 && (
          <Section title="BVN services" sub="NIBSS-sourced slips">
            <div className="space-y-4">{bvn.map((s: any) => renderForm(s, walletBalance))}</div>
          </Section>
        )}

        {corrections.length > 0 && (
          <Section title="Corrections & async requests" sub="Processed in 10 minutes to 24 hours — auto-refund on failure">
            <div className="space-y-4">{corrections.map((s: any) => renderForm(s, walletBalance))}</div>
          </Section>
        )}
      </div>
    </AppShell>
  );
}

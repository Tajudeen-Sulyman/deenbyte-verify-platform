import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Services — DeenByte Verify' };

const BLURB: Record<string, string> = {
  nin_regular: 'Verify an 11-digit NIN and get the official NIMC slip.',
  nin_by_phone: 'Retrieve the NIN slip using the registered phone number.',
  nin_demographic: 'Find a NIN by name, gender and date of birth.',
  bvn_basic: 'Verify a BVN and receive the official slip.',
  ipe_clearance: 'Submit an enrollment tracking ID for IPE clearance.',
  personalization: 'NIN personalization request via tracking ID.',
  nin_validation: 'Validate a NIN against issue types (SIM, photo, records).',
  bvn_retrieval: 'Retrieve a BVN using name and phone number.',
};

const ICON: Record<string, string> = {
  NIN: 'M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z',
  BVN: 'M3 6h18v12H3zM7 10h4M7 14h7',
  default: 'M12 8v4l3 3M21 12a9 9 0 11-9-9 9 9 0 019 9z',
};

export default async function ServicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: services } = await supabase
    .from('verification_services')
    .select('service_id, name, category, selling_price, is_async')
    .eq('enabled', true).eq('status', 'active')
    .order('category').order('name');

  const groups = new Map<string, any[]>();
  for (const s of services ?? []) {
    const cat = String(s.category ?? 'Other');
    groups.set(cat, [...(groups.get(cat) ?? []), s]);
  }
  const cats = [...groups.keys()].sort((a, b) =>
    (a === 'NIN' ? -1 : b === 'NIN' ? 1 : a === 'BVN' ? -1 : b === 'BVN' ? 1 : a.localeCompare(b))
  );

  return (
    <AppShell title="Services">
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold text-dark">Service catalog</h2>
          <p className="text-sm text-muted mt-1">Official verification and correction services. Pay from your wallet, results saved to your history.</p>
        </div>

        {cats.map((cat) => (
          <section key={cat}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">{cat} services</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {groups.get(cat)?.map((s: any) => (
                <div key={s.service_id} className="rounded-2xl bg-white border border-border shadow-card p-4 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                          strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                          <path d={ICON[cat] ?? ICON.default} />
                        </svg>
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-dark truncate">{s.name}</p>
                        <p className="text-xs text-muted mt-0.5">
                          {s.is_async ? '10 min – 24 hrs' : 'Instant'}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-primary shrink-0">
                      ₦{Number(s.selling_price).toLocaleString('en-NG')}
                    </p>
                  </div>
                  <p className="text-xs text-muted">{BLURB[s.service_id] ?? 'Submit the required details to run this service.'}</p>
                  <Link href="/verify"
                    className="mt-auto rounded-lg bg-primary py-2 text-center text-xs font-semibold text-white hover:bg-primary-dark">
                    Start
                  </Link>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}

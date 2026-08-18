import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Services — DeenByte Verify' };

const ICONS: Record<string, string> = {
  nin_regular: 'M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z',
  nin_by_phone: 'M7 3h10v18H7zM11 18h2',
  nin_demographic: 'M8 10a3 3 0 106 0 3 3 0 00-6 0zM4 20c0-3 3-5 8-5s8 2 8 5',
  bvn_basic: 'M3 6h18v12H3zM7 10h4M7 14h7',
  bvn_retrieval: 'M4 12a8 8 0 0114-5M20 12a8 8 0 01-14 5M18 3v4h-4M6 21v-4h4',
  ipe_clearance: 'M6 3h9l4 4v14H6zM9 11h7M9 15h7',
  personalization: 'M8 10a3 3 0 106 0 3 3 0 00-6 0zM4 20c0-3 3-5 8-5h2M17 14l2 2 4-4',
  nin_validation: 'M9 3h6v3H9zM9 3H7v18h10V3h-2M9 12l2 2 4-4',
};
const FALLBACK = 'M12 8v4l3 3M21 12a9 9 0 11-9-9 9 9 0 019 9z';

function badgeCls(cat: string, isAsync: boolean) {
  if (isAsync) return 'bg-amber-50 text-amber-700';
  if (cat === 'BVN') return 'bg-blue-50 text-blue-700';
  return 'bg-primary/10 text-primary';
}

export default async function ServicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: services } = await supabase
    .from('verification_services')
    .select('service_id, name, category, selling_price, is_async')
    .eq('enabled', true).eq('status', 'active')
    .order('category').order('name');

  return (
    <AppShell title="Services">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-dark">All services</h2>
          <p className="text-sm text-muted mt-1">Tap a product to start.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {(services ?? []).map((s: any) => (
            <Link key={s.service_id} href={'/verify?s=' + s.service_id}
              className="relative rounded-2xl bg-white border border-border shadow-card p-4 pt-6 flex flex-col items-center text-center gap-2 hover:border-primary">
              <span className={'absolute top-2.5 right-2.5 text-[9px] font-bold px-2 py-0.5 rounded-full ' + badgeCls(String(s.category), !!s.is_async)}>
                {s.is_async ? 'ASYNC' : String(s.category)}
              </span>
              <span className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                  strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
                  <path d={ICONS[s.service_id] ?? FALLBACK} />
                </svg>
              </span>
              <p className="text-sm font-semibold text-dark leading-tight">{s.name}</p>
              <p className="text-xs font-bold text-primary">
                ₦{Number(s.selling_price).toLocaleString('en-NG')}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

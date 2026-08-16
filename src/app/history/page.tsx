import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { BrandLogo } from '@/components/brand';
import { LogoutButton } from '@/components/logout-button';

export const dynamic = 'force-dynamic';

const STATUS_STYLES: Record<string, string> = {
  successful: 'bg-green-50 text-green-700 border-green-100',
  failed: 'bg-red-50 text-red-600 border-red-100',
  processing: 'bg-amber-50 text-amber-700 border-amber-100',
  pending: 'bg-amber-50 text-amber-700 border-amber-100',
};

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: rows } = await supabase
    .from('verification_requests')
    .select('id, request_reference, status, selling_price, created_at, safe_request_data, verification_services(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <main className="min-h-screen">
      <header className="bg-white border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard"><BrandLogo /></Link>
          <LogoutButton />
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <h1 className="text-xl font-bold text-dark">Verification History</h1>

        {!rows || rows.length === 0 ? (
          <div className="bg-white border border-border rounded-2xl p-5 text-sm text-muted">No verifications yet.</div>
        ) : (
          rows.map((r: any) => (
            <Link
              key={r.id}
              href={'/history/' + r.id}
              className="block bg-white border border-border rounded-2xl p-4 hover:border-primary transition"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-dark truncate">{r.verification_services?.name ?? 'Verification'}</p>
                  <p className="text-xs text-muted mt-0.5">{r.safe_request_data?.identifier} · {r.request_reference}</p>
                  <p className="text-xs text-muted mt-0.5">{new Date(r.created_at).toLocaleString()}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className={'inline-block text-xs font-semibold px-2 py-1 rounded-full border ' + (STATUS_STYLES[r.status] ?? 'bg-light text-muted border-border')}>
                    {r.status}
                  </span>
                  <p className="text-sm font-semibold text-dark mt-1">₦{Number(r.selling_price).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}

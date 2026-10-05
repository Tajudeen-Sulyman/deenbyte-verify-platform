import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createClient as adminClient } from '@supabase/supabase-js';

const BADGE: Record<string, string> = {
  successful: 'bg-green-50 text-green-700 border-green-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
  processing: 'bg-amber-50 text-amber-700 border-amber-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
};

export default async function ServiceHistory({ serviceId }: { serviceId: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // service id lookup only; request rows come from the signed-in user's own session
  const admin = adminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: svc } = await admin
    .from('verification_services').select('id').eq('service_id', serviceId).maybeSingle();
  if (!svc) return null;

  const { data: rows } = await supabase
    .from('verification_requests')
    .select('id, status, created_at, selling_price, request_reference, safe_request_data')
    .eq('user_id', user.id)
    .eq('service_id', svc.id)
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <section className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-dark">Your requests</h3>
        <Link href="/history" className="text-xs font-semibold text-primary">View all</Link>
      </div>
      {!rows || rows.length === 0 ? (
        <div className="card3d p-4 text-sm text-muted">No requests yet.</div>
      ) : (
        rows.map((r: any) => (
          <Link key={r.id} href={'/history/' + r.id} className="card3d flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-dark">
                {r.safe_request_data?.identifier ?? ''} · {r.request_reference}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {new Date(r.created_at).toLocaleString()} · ₦{Number(r.selling_price).toLocaleString()}
              </p>
            </div>
            <span className={'shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ' + (BADGE[r.status] ?? BADGE.pending)}>
              {r.status}
            </span>
          </Link>
        ))
      )}
    </section>
  );
}

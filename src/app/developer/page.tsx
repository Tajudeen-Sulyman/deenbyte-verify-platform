import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createClient as adminClient } from '@supabase/supabase-js';
import { AppShell } from '@/components/shell';
import { DevClient } from '@/components/dev-client';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Developer — DeenByte Verify' };

const supabaseAdmin = adminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function DeveloperPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: keys } = await supabaseAdmin
    .from('api_keys')
    .select('id, name, key_prefix, enabled, last_used_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <AppShell title="Developer">
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold text-dark">Developer API</h2>
          <p className="text-sm text-muted mt-1">Integrate DeenByte verification into your own application.</p>
        </div>

        <DevClient initialKeys={keys ?? []} />

        <section className="rounded-2xl bg-white border border-border shadow-card p-5 space-y-3">
          <h3 className="text-sm font-bold text-dark">Authentication</h3>
          <p className="text-xs text-muted">Send your key in the Authorization header on every request:</p>
          <pre className="bg-dark text-light text-xs p-4 rounded-xl overflow-x-auto">Authorization: Bearer db_live_…</pre>
        </section>

        <section className="rounded-2xl bg-white border border-border shadow-card p-5 space-y-3">
          <h3 className="text-sm font-bold text-dark">Endpoints</h3>
          <div className="space-y-2 text-xs text-muted">
            <p><code className="text-primary font-semibold">POST /api/v1/r/nin_regular</code> — verify NIN, body: {'{'}&quot;identifier&quot;: &quot;11-digit NIN&quot;{'}'}</p>
            <p><code className="text-primary font-semibold">POST /api/v1/r/nin_by_phone</code> — NIN slip by phone, body: {'{'}&quot;identifier&quot;: &quot;080…&quot;{'}'}</p>
            <p><code className="text-primary font-semibold">POST /api/v1/r/bvn_basic</code> — verify BVN, body: {'{'}&quot;identifier&quot;: &quot;11-digit BVN&quot;{'}'}</p>
          </div>
        </section>

        <section className="rounded-2xl bg-white border border-border shadow-card p-5 space-y-3">
          <h3 className="text-sm font-bold text-dark">Example</h3>
          <pre className="bg-dark text-light text-xs p-4 rounded-xl overflow-x-auto">{`curl -X POST https://deenbyte.com.ng/api/v1/r/nin_regular \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"identifier":"43878425512"}'`}</pre>
          <pre className="bg-dark text-light text-xs p-4 rounded-xl overflow-x-auto">{`{
  "success": true,
  "reference": "DBV-12345678",
  "status": "successful",
  "data": { "first_name": "…", "last_name": "…", "nin": "…" },
  "slip_url": "https://deenbyte.com.ng/api/v1/slip/…"
}`}</pre>
        </section>

        <section className="rounded-2xl bg-white border border-border shadow-card p-5 space-y-2">
          <h3 className="text-sm font-bold text-dark">Errors & billing</h3>
          <div className="text-xs text-muted space-y-1">
            <p>401 invalid/revoked key · 402 insufficient wallet balance · 404 unknown service · 422 bad identifier · 409 reverify required · 400 provider failure (auto-refunded).</p>
            <p>Each successful call is charged to your wallet at dashboard prices. Failed calls are automatically refunded.</p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

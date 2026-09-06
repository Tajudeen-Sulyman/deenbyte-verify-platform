import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/shell';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'CAC Services — DeenByte Verify' };

export default async function CacHubPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return (
    <AppShell title="CAC Services">
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-extrabold text-dark">Corporate Affairs Commission (CAC)</h1>
          <p className="mt-1 text-xs text-muted">Choose whether you are starting a new business registration or managing an existing incorporated entity.</p>
        </div>
        <Link href="/cac/apply?entity=bn" className="card3d block rounded-2xl bg-white p-5">
          <p className="text-sm font-extrabold text-dark">Registrations</p>
          <p className="mt-1 text-xs text-muted">Start new registrations and track ongoing Business Name, Company (LLC) applications.</p>
          <span className="mt-3 inline-block rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-white">Open Services →</span>
        </Link>
        <Link href="/cac/annual-returns" className="card3d block rounded-2xl bg-white p-5">
          <p className="text-sm font-extrabold text-dark">Post Incorporation</p>
          <p className="mt-1 text-xs text-muted">File annual returns, and more compliance services for existing entities.</p>
          <span className="mt-3 inline-block rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-white">Open Services →</span>
        </Link>
        <Link href="/cac/history" className="card3d block rounded-2xl bg-white p-4 text-center text-xs font-extrabold text-primary">≡ View CAC Application History →</Link>
      </div>
    </AppShell>
  );
}

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { BrandLogo } from '@/components/brand';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'DeenByte Verify — Instant TIN, NIN & BVN Verification Slips',
  description: 'Get your TIN verification slip in under 90 seconds — no account needed. NIN & BVN slips, NIN modification, validation and IPE clearance with wallet payments and automatic refunds.',
};

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

  const { data: services } = await supabase
    .from('verification_services')
    .select('name, category, selling_price, is_async')
    .eq('enabled', true).eq('status', 'active')
    .order('category').order('name');

  return (
    <main className="min-h-screen bg-light">
      <header className="bg-white border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <BrandLogo />
          <div className="flex items-center gap-2">
            <Link href="/login" className="px-3 py-2 text-sm font-semibold text-dark">Log in</Link>
            <Link href="/register" className="px-3 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary-dark">
              Create account
            </Link>
          </div>
        </div>
      </header>

      <section className="max-w-4xl mx-auto px-4 pt-12 pb-8 text-center">
        <p className="text-[11px] font-extrabold uppercase tracking-widest text-primary">Secure identity at light speed</p>
        <h1 className="mt-2 text-3xl font-bold text-dark">
          Get your TIN slip in under 90 seconds
        </h1>
        <p className="mt-3 text-sm text-muted max-w-xl mx-auto">
          No account. No wallet funding. Pay once and download instantly.
          Plus NIN &amp; BVN slips, NIN modification, validation and IPE clearance — all in one trusted platform.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
          <Link href="/taxid" className="px-5 py-3 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary-dark">
            Get TIN Slip — No Account →
          </Link>
          <Link href="/register" className="px-5 py-3 text-sm font-semibold text-dark card3d rounded-lg">
            Create free account
          </Link>
        </div>
        <div className="mt-8 grid sm:grid-cols-2 gap-3 text-left">
          <Link href="/taxid" className="card3d rounded-2xl p-4 bg-white">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-primary">Instant • from ₦300</p>
            <p className="mt-1 text-sm font-extrabold text-dark">TIN Verification Slip</p>
            <p className="mt-1 text-xs text-muted">Standard &amp; Premium certificate formats with QR verify. Ready in under 90 seconds.</p>
          </Link>
          <Link href="/nin/modification" className="card3d rounded-2xl p-4 bg-white">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-primary">1–48 hrs • NDPA compliant</p>
            <p className="mt-1 text-sm font-extrabold text-dark">NIN Modification &amp; Validation</p>
            <p className="mt-1 text-xs text-muted">Change name, phone or address. Fix No-Record, VNIN sync &amp; IPE errors.</p>
          </Link>
        </div>
      </section>

      <section id="pricing" className="max-w-4xl mx-auto px-4 pb-8">
        <h2 className="text-lg font-bold text-dark mb-3">Service prices</h2>
        <div className="grid grid-cols-2 gap-3">
          {services?.map((s: any) => (
            <div key={s.name} className="card3d p-4">
              <p className="text-sm font-semibold text-dark">{s.name}</p>
              <p className="text-xs text-muted mt-0.5">
                {s.is_async ? '10 min – 24 hrs' : 'Instant'} · {s.category}
              </p>
              <p className="mt-2 text-lg font-bold text-primary">
                ₦{Number(s.selling_price).toLocaleString('en-NG')}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 pb-8">
        <h2 className="text-lg font-bold text-dark mb-3">How it works</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="card3d p-4">
            <p className="text-sm font-bold text-primary">1</p>
            <p className="text-sm font-semibold text-dark mt-1">Create &amp; fund</p>
            <p className="text-xs text-muted mt-1">Open a free account and fund your wallet securely with Paystack.</p>
          </div>
          <div className="card3d p-4">
            <p className="text-sm font-bold text-primary">2</p>
            <p className="text-sm font-semibold text-dark mt-1">Verify</p>
            <p className="text-xs text-muted mt-1">Enter the NIN, BVN or tracking ID. We run it against the official database.</p>
          </div>
          <div className="card3d p-4">
            <p className="text-sm font-bold text-primary">3</p>
            <p className="text-sm font-semibold text-dark mt-1">Download slip</p>
            <p className="text-xs text-muted mt-1">Get the official PDF slip instantly, saved forever in your history.</p>
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 pb-10">
        <div className="card3d p-5 grid gap-2 sm:grid-cols-3 text-center">
          <p className="text-xs text-muted">✓ Official NIMC / NIBSS data</p>
          <p className="text-xs text-muted">✓ Auto-refund on any failure</p>
          <p className="text-xs text-muted">✓ Slips stored in your history</p>
        </div>
      </section>

      <footer className="border-t border-border bg-white">
        <div className="max-w-4xl mx-auto px-4 py-5 text-center text-xs text-muted">
          <Link href="/privacy" className="underline">Privacy Policy</Link>
          {' · '}
          <Link href="/terms" className="underline">Terms of Service</Link>
          {' · '}
          <a href="mailto:deenbyte.technologies@gmail.com" className="underline">Support</a>
          <p className="mt-2">© 2026 DeenByte Verify. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}

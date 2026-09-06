import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'DeenByte Verify — Instant Identity & Tax Document Platform',
  description: 'Verify, register and manage identity and tax documents in one place: TIN slips, NIN & BVN verification, NIN modification, validation and IPE clearance. Wallet payments with automatic refunds.',
};

const CHIPS = [
  { t: 'TIN Verification', c: 'bg-amber-100 text-amber-800', r: '-rotate-2' },
  { t: 'NIN Verification', c: 'bg-rose-600 text-white', r: 'rotate-1' },
  { t: 'BVN Verification', c: 'bg-indigo-200 text-indigo-900', r: '-rotate-1' },
  { t: 'NIN Modification', c: 'bg-emerald-200 text-emerald-900', r: 'rotate-2' },
  { t: 'IPE Clearance', c: 'bg-sky-200 text-sky-900', r: '-rotate-1' },
];

const SERVICES = [
  { t: 'TIN Verification Slip', d: 'Standard & premium certificates with QR verify, ready in under 90 seconds.', href: '/taxid', c: 'from-emerald-600 to-teal-800' },
  { t: 'NIN Verification', d: 'Official NIMC slips — Regular, Standard, Premium, VNIN — instant lookup.', href: '/register', c: 'from-teal-600 to-cyan-800' },
  { t: 'NIN Modification', d: 'Change of name, phone or address on your NIN record. 1–48 hrs.', href: '/nin/modification', c: 'from-cyan-700 to-blue-900' },
  { t: 'NIN Validation', d: 'Resolve No-Record, VNIN sync, SIM/Bank and photographic issues.', href: '/nin/validation', c: 'from-sky-700 to-blue-900' },
  { t: 'IPE Clearance', d: 'Clear In-Processing Errors on your NIN within ~24 hours.', href: '/nin/ipe', c: 'from-rose-600 to-red-900' },
  { t: 'BVN Verification', d: 'Official BVN slips and retrieval in seconds.', href: '/register', c: 'from-violet-600 to-purple-900' },
];

const FEATURES = [
  { t: 'Instant delivery', d: 'Slips generated in seconds from official databases; async services tracked in real time.' },
  { t: 'Real-time tracking', d: 'Track every request from submission to delivery — with status notifications.' },
  { t: 'NDPA-compliant', d: 'Every request carries explicit owner consent under the Nigeria Data Protection Act 2023.' },
  { t: 'Wallet & auto-refunds', d: 'Fund once, pay for anything. Failed requests are refunded automatically.' },
  { t: 'Secure payments', d: 'Paystack-secured cards, bank transfer and USSD — plus wallet balance.' },
];

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

  const { data: services } = await supabase
    .from('verification_services')
    .select('name, category, selling_price')
    .eq('enabled', true).eq('status', 'active')
    .order('category').order('name');

  return (
    <main className="min-h-screen bg-[#0b1120] text-white">
      <header className="border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <p className="text-lg font-extrabold">DeenByte <span className="text-emerald-400">Verify</span></p>
          <div className="flex items-center gap-2">
            <Link href="/login" className="px-4 py-2 text-sm font-semibold text-slate-200">Log in</Link>
            <Link href="/register" className="px-4 py-2 text-sm font-semibold bg-emerald-600 rounded-lg">Create account</Link>
          </div>
        </div>
      </header>

      <section className="max-w-4xl mx-auto px-4 pt-16 pb-10 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight">The easiest way to verify and manage your identity documents.</h1>
        <p className="mt-5 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">DeenByte Verify provides the complete infrastructure individuals and businesses need to verify, register and manage essential identity and tax documents — all in one place.</p>
        <div className="mt-8 flex justify-center">
          <Link href="/register" className="rounded-full bg-emerald-600 hover:bg-emerald-500 px-8 py-4 text-sm font-extrabold">Get started</Link>
        </div>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {CHIPS.map((ch) => <span key={ch.t} className={'rounded-full px-5 py-3 text-xs font-extrabold shadow-lg ' + ch.c + ' ' + ch.r}>{ch.t}</span>)}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-14">
        <h2 className="text-3xl font-extrabold max-w-xl">A fully integrated suite of identity services — everything you need in one platform.</h2>
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SERVICES.map((s) => (
            <Link key={s.t} href={s.href} className={'rounded-2xl p-5 bg-gradient-to-br ' + s.c}>
              <p className="text-sm font-extrabold">{s.t}</p>
              <p className="mt-2 text-xs text-white/80">{s.d}</p>
              <p className="mt-4 text-xs font-bold">Open →</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-white/5 py-10">
        <p className="text-center text-xs font-bold uppercase tracking-[0.3em] text-slate-500">Facilitating verification across official databases</p>
        <div className="mt-6 flex justify-center gap-10 text-slate-300 font-extrabold text-sm">
          <span>NIMC</span><span>NIBSS</span><span>NRS</span>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-14 grid sm:grid-cols-2 gap-8">
        {FEATURES.map((f) => (
          <div key={f.t}>
            <p className="text-lg font-extrabold">{f.t}</p>
            <p className="mt-2 text-sm text-slate-400">{f.d}</p>
          </div>
        ))}
      </section>

      <section id="pricing" className="max-w-5xl mx-auto px-4 pb-14">
        <h2 className="text-2xl font-extrabold mb-4">Transparent service prices</h2>
        <div className="grid grid-cols-2 gap-3">
          {services?.map((s: any) => (
            <div key={s.name} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-[10px] font-bold uppercase text-slate-400">{s.category}</p>
              <p className="text-sm font-bold">{s.name}</p>
              <p className="mt-1 text-emerald-400 font-extrabold">₦{Number(s.selling_price).toLocaleString('en-NG')}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl font-extrabold">Start verifying with DeenByte</h2>
        <p className="mt-3 text-sm text-slate-400">Create a free account and get your first slip in under 90 seconds.</p>
        <Link href="/register" className="mt-6 inline-block rounded-full bg-emerald-600 px-8 py-4 text-sm font-extrabold">Get started →</Link>
      </section>

      <footer className="border-t border-white/5">
        <div className="max-w-5xl mx-auto px-4 py-10 grid grid-cols-2 gap-8 text-sm">
          <div>
            <p className="font-extrabold mb-3">Services</p>
            <ul className="space-y-2 text-slate-400">
              <li><Link href="/taxid">TIN Verification Slip</Link></li>
              <li><Link href="/nin/modification">NIN Modification</Link></li>
              <li><Link href="/nin/validation">NIN Validation</Link></li>
              <li><Link href="/nin/ipe">IPE Clearance</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-extrabold mb-3">Company</p>
            <ul className="space-y-2 text-slate-400">
              <li><Link href="/login">Log in</Link></li>
              <li><Link href="/register">Create account</Link></li>
              <li><Link href="/privacy">Privacy Policy</Link></li>
              <li><Link href="/terms">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <p className="pb-8 text-center text-[11px] text-slate-500">© 2026 DeenByte Technologies. Not affiliated with NIMC, NIBSS, NRS or any government agency.</p>
      </footer>
    </main>
  );
}

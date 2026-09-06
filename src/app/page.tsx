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
  { t: 'NIN Modification', c: 'bg-violet-200 text-violet-900', r: 'rotate-2' },
  { t: 'IPE Clearance', c: 'bg-sky-200 text-sky-900', r: '-rotate-1' },
  { t: 'CAC Registration', c: 'bg-fuchsia-200 text-fuchsia-900', r: 'rotate-1' },
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
          <p className="text-lg font-extrabold">DeenByte <span className="text-violet-400">Verify</span></p>
          <div className="flex items-center gap-2">
            <Link href="/login" className="px-4 py-2 text-sm font-semibold text-slate-200">Log in</Link>
            <Link href="/register" className="px-4 py-2 text-sm font-semibold bg-violet-600 rounded-lg">Create account</Link>
          </div>
        </div>
      </header>

      <section className="max-w-4xl mx-auto px-4 pt-16 pb-10 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight">The easiest way to verify and manage your identity documents.</h1>
        <p className="mt-5 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">DeenByte Verify provides the complete infrastructure individuals and businesses need to verify, register and manage essential identity and tax documents — all in one place.</p>
        <div className="mt-8 flex justify-center">
          <Link href="/register" className="rounded-full bg-violet-600 hover:bg-violet-500 px-8 py-4 text-sm font-extrabold">Get started</Link>
        </div>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {CHIPS.map((ch) => <span key={ch.t} className={'rounded-full px-5 py-3 text-xs font-extrabold shadow-lg ' + ch.c + ' ' + ch.r}>{ch.t}</span>)}
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

      <section className="max-w-4xl mx-auto px-4 pb-14">
        <div className="rounded-3xl bg-gradient-to-br from-fuchsia-600 to-purple-900 p-8 text-center">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-fuchsia-200">New — Corporate Affairs Commission</p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold">Register your business with CAC</h2>
          <p className="mt-3 text-sm text-fuchsia-100 max-w-2xl mx-auto">Business Name ₦29,000 • Limited Liability ₦36,000 • Annual Returns from ₦8,000. Apply online, we process it on the official CAC portal, and your documents are delivered for download or email.</p>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
            <Link href="/register" className="rounded-full bg-white px-6 py-3.5 text-sm font-extrabold text-purple-800">Start CAC Registration →</Link>
            <Link href="/login" className="rounded-full border border-white/40 px-6 py-3.5 text-sm font-extrabold text-white">Track an application</Link>
          </div>
        </div>
      </section>
      <section id="pricing" className="max-w-5xl mx-auto px-4 pb-14">
        <h2 className="text-2xl font-extrabold mb-4">Transparent service prices</h2>
        <div className="grid grid-cols-2 gap-3">
          {services?.map((s: any) => (
            <div key={s.name} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-[10px] font-bold uppercase text-slate-400">{s.category}</p>
              <p className="text-sm font-bold">{s.name}</p>
              <p className="mt-1 text-violet-400 font-extrabold">₦{Number(s.selling_price).toLocaleString('en-NG')}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl font-extrabold">Start verifying with DeenByte</h2>
        <p className="mt-3 text-sm text-slate-400">Create a free account and get your first slip in under 90 seconds.</p>
        <Link href="/register" className="mt-6 inline-block rounded-full bg-violet-600 px-8 py-4 text-sm font-extrabold">Get started →</Link>
      </section>

      <footer className="border-t border-white/5">
        <div className="max-w-5xl mx-auto px-4 py-10 grid grid-cols-2 gap-8 text-sm">
          <div>
            <p className="font-extrabold mb-3">Services</p>
            <ul className="space-y-2 text-slate-400">
              <li><Link href="/taxid">TIN Verification Slip</Link></li>
              <li><Link href="/register">CAC Registration</Link></li>
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

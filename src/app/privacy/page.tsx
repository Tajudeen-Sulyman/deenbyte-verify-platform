import Link from 'next/link';

export const metadata = { title: 'Privacy Policy — DeenByte Verify' };

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-light">
      <header className="bg-white border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <Link href="/" className="text-sm font-semibold text-primary">← Back</Link>
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-dark">Privacy Policy</h1>
        <p className="text-xs text-muted mt-1">Effective date: 18 August 2026</p>

        <div className="mt-4 space-y-4 text-sm text-dark bg-white border border-border rounded-2xl p-5">
          <section>
            <h2 className="font-semibold">1. What we collect</h2>
            <p className="mt-1 text-muted">When you use DeenByte Verify we process: your account email; wallet and transaction records; and the identifiers you submit for verification (NIN, BVN, phone number, name, date of birth, gender, or enrollment tracking ID), together with the verification result returned by the data provider.</p>
          </section>
          <section>
            <h2 className="font-semibold">2. Why we process it</h2>
            <p className="mt-1 text-muted">Solely to perform the verification you requested, generate the resulting slip, keep the transaction record required for disputes and refunds, and operate billing (wallet and payments).</p>
          </section>
          <section>
            <h2 className="font-semibold">3. Who processes it</h2>
            <p className="mt-1 text-muted">Identity records are sourced from licensed verification providers who hold authorized access to NIMC (NIN) and NIBSS (BVN) data. We act as an agent of your request; providers process the identifiers under their own licences and policies.</p>
          </section>
          <section>
            <h2 className="font-semibold">4. Storage & retention</h2>
            <p className="mt-1 text-muted">Verification results (including provider slips) are stored on secured infrastructure to power your history and slip downloads. Identifiers are masked in listings. We retain records for as long as your account exists plus any period required for dispute resolution.</p>
          </section>
          <section>
            <h2 className="font-semibold">5. Your rights (NDPR)</h2>
            <p className="mt-1 text-muted">Under the Nigeria Data Protection Regulation you may request access to, correction of, or deletion of your personal data, and may withdraw consent at any time by contacting us. Deletion of statutory transaction records may be limited by law.</p>
          </section>
          <section>
            <h2 className="font-semibold">6. Consent requirement</h2>
            <p className="mt-1 text-muted">You confirm that, for every verification you submit, you are the data subject or you hold the data subject&apos;s explicit consent to verify their identity.</p>
          </section>
          <section>
            <h2 className="font-semibold">7. Contact</h2>
            <p className="mt-1 text-muted">deenbyte.technologies@gmail.com</p>
          </section>
        </div>
      </div>
    </main>
  );
}

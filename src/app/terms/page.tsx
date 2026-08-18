import Link from 'next/link';

export const metadata = { title: 'Terms of Service — DeenByte Verify' };

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-light">
      <header className="bg-white border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <Link href="/" className="text-sm font-semibold text-primary">← Back</Link>
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-dark">Terms of Service</h1>
        <p className="text-xs text-muted mt-1">Effective date: 18 August 2026</p>

        <div className="mt-4 space-y-4 text-sm text-dark bg-white border border-border rounded-2xl p-5">
          <section>
            <h2 className="font-semibold">1. The service</h2>
            <p className="mt-1 text-muted">DeenByte Verify provides paid identity verification lookups (NIN, BVN, phone, demographic search) and async correction requests (IPE clearance, validation, personalization, BVN retrieval) sourced from licensed third-party providers.</p>
          </section>
          <section>
            <h2 className="font-semibold">2. Consent & lawful use</h2>
            <p className="mt-1 text-muted">You may only verify identities you own or for which you hold the data subject&apos;s explicit consent. Using the service for harassment, fraud, stalking, or any unlawful purpose is prohibited and leads to account termination.</p>
          </section>
          <section>
            <h2 className="font-semibold">3. Wallet, pricing & refunds</h2>
            <p className="mt-1 text-muted">Services are prepaid via the wallet. Prices are shown before each purchase. If a request fails at the provider, the charge is automatically reversed to your wallet. Async requests that ultimately fail are likewise refunded. Successful verifications are non-refundable.</p>
          </section>
          <section>
            <h2 className="font-semibold">4. Provider availability</h2>
            <p className="mt-1 text-muted">Results depend on third-party providers and national databases. We do not guarantee uninterrupted availability, and processing times for async services follow the provider (typically 10 minutes to 24 hours).</p>
          </section>
          <section>
            <h2 className="font-semibold">5. Accuracy</h2>
            <p className="mt-1 text-muted">Slips reflect the data held by the source database at the time of the request. If your official records are wrong, correct them at NIMC/your bank first, then re-verify.</p>
          </section>
          <section>
            <h2 className="font-semibold">6. Liability</h2>
            <p className="mt-1 text-muted">Our liability for any claim is limited to the amount you paid for the specific request that is the subject of the claim. We are not liable for decisions you or third parties make based on verification results.</p>
          </section>
          <section>
            <h2 className="font-semibold">7. Changes</h2>
            <p className="mt-1 text-muted">We may update these terms and prices; continued use after changes constitutes acceptance.</p>
          </section>
          <section>
            <h2 className="font-semibold">8. Contact</h2>
            <p className="mt-1 text-muted">deenbyte.technologies@gmail.com</p>
          </section>
        </div>
      </div>
    </main>
  );
}

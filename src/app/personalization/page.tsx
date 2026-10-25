'use client';
import { useEffect, useState } from 'react';

type Status = {
  reference: string;
  status: string;
  nin_masked: string | null;
  pdf_ready: boolean;
  error?: string;
};

const PRICE = 350;
const TRACKING_RE = /^[A-Za-z0-9]{15}$/;

export default function PersonalizationPage() {
  const [tid, setTid] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ref, setRef] = useState<string | null>(null);
  const [st, setSt] = useState<Status | null>(null);

  const valid = TRACKING_RE.test(tid.trim());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch('/api/v1/personalization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tracking_id: tid.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Request failed.');
      setSt(null);
      setRef(json.reference);
      setTid('');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!ref) return;
    let done = false;
    async function check() {
      const res = await fetch('/api/v1/personalization?reference=' + encodeURIComponent(ref!), {
        cache: 'no-store',
      });
      const json: Status = await res.json();
      if (!res.ok) return;
      setSt(json);
      if (json.status === 'successful' || json.status === 'failed') done = true;
    }
    check();
    const t = setInterval(() => { if (!done) check(); }, 30000);
    return () => clearInterval(t);
  }, [ref]);

  return (
    <main className="mx-auto max-w-md p-4 space-y-4">
      <header>
        <h1 className="text-xl font-bold">NIN Personalization</h1>
        <p className="text-sm opacity-70">
          Enter the 15-character NIMC tracking ID from the enrolment slip. ₦{PRICE} is charged
          when the request is accepted. If it cannot be completed, the full amount is returned to
          your wallet.
        </p>
      </header>

      <form onSubmit={submit} className="space-y-3">
        <label className="block text-sm font-semibold" htmlFor="tid">Tracking ID</label>
        <input
          id="tid"
          value={tid}
          onChange={(e) => setTid(e.target.value)}
          maxLength={15}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          placeholder="15 letters or numbers"
          className="w-full rounded-xl border px-4 py-3 font-mono tracking-wider"
        />
        <p className="text-xs opacity-70">{tid.trim().length}/15 characters</p>
        <button
          type="submit"
          disabled={!valid || busy || !!(st && st.status === 'pending')}
          className="w-full rounded-xl bg-primary text-white py-3 font-semibold disabled:opacity-40"
        >
          {busy ? 'Submitting...' : `Pay ₦${PRICE} and submit`}
        </button>
        {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
      </form>

      {ref && st && (
        <section className="rounded-2xl border p-4 space-y-2">
          <p className="text-xs opacity-70">Reference {st.reference}</p>

          {st.status === 'pending' && (
            <p className="text-sm">Processing. This usually takes under a minute. This page checks automatically.</p>
          )}

          {st.status === 'successful' && st.pdf_ready && (
            <>
              <p className="text-sm font-semibold">Your slip is ready.</p>
              {st.nin_masked && <p className="text-sm">NIN: <span className="font-mono">{st.nin_masked}</span></p>}
              <a
                href={'/api/v1/personalization/pdf?reference=' + encodeURIComponent(st.reference)}
                target="_blank"
                rel="noopener"
                className="block text-center rounded-xl bg-primary text-white py-3 font-semibold"
              >
                Download slip (PDF)
              </a>
            </>
          )}

          {st.status === 'failed' && (
            <p className="text-sm text-red-600">
              This request could not be completed. ₦{PRICE} was returned to your wallet.
              {st.error ? ` (${st.error})` : ''}
            </p>
          )}
        </section>
      )}
    </main>
  );
}

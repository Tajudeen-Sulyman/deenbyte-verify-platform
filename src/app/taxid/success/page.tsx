'use client';
import { useEffect, useState } from 'react';

async function qrDataUrl(data: string) {
  const buf = await fetch('https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(data)).then((r) => r.arrayBuffer());
  const bytes = new Uint8Array(buf); let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return 'data:image/png;base64,' + btoa(bin);
}

async function downloadPdf(slip: any) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(6, 78, 59); doc.rect(0, 0, W, 90, 'F');
  doc.setTextColor(253, 224, 71); doc.setFont('helvetica', 'bold'); doc.setFontSize(17);
  doc.text((slip.slipType === 'corporate' ? 'CORPORATE' : 'INDIVIDUAL') + ' TAXID SLIP', W / 2, 42, { align: 'center' });
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  doc.text('Tax Record Summary', W / 2, 62, { align: 'center' });

  let y = 120;
  const block = (title: string, lines: string[]) => {
    const h = 30 + lines.length * 15;
    doc.setFillColor(31, 41, 55); doc.roundedRect(40, y, W - 80, h, 8, 8, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text(title, 56, y + 20);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    lines.forEach((l, i) => doc.text(l, 56, y + 37 + i * 15));
    y += h + 14;
  };
  block('PERSONAL INFORMATION', [
    'FIRST NAME: ' + slip.firstName,
    ...(slip.middleName ? ['MIDDLE NAME: ' + slip.middleName] : []),
    'LAST NAME: ' + slip.lastName,
  ]);
  if (slip.address) block('RESIDENTIAL ADDRESS', String(slip.address).split('\n'));
  block('TAX IDENTIFICATION NUMBER', [slip.tin]);

  doc.setTextColor(154, 52, 18); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text('DOCUMENT DETAILS', W / 2, y + 10, { align: 'center' });
  doc.setTextColor(31, 41, 55); doc.setFontSize(9);
  doc.text('DOCUMENT ID', 56, y + 30); doc.text('PREPARED DATE', W - 56, y + 30, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  doc.text(slip.reference, 56, y + 45);
  doc.text(new Date(slip.prepared).toLocaleDateString('en-NG', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase(), W - 56, y + 45, { align: 'right' });
  y += 70;

  try {
    const qr = await qrDataUrl('https://deenbyte.com.ng/taxid/verify?reference=' + slip.reference);
    doc.addImage(qr, 'PNG', W / 2 - 45, y, 90, 90);
    doc.setFontSize(8); doc.setTextColor(107, 114, 128);
    doc.text('SCAN TO VERIFY', W / 2, y + 102, { align: 'center' });
  } catch {}
  if (slip.tier === 'premium') {
    doc.setDrawColor(154, 52, 18); doc.setLineWidth(3); doc.circle(W / 2 + 90, y + 45, 26, 'S');
    doc.setFillColor(154, 52, 18); doc.circle(W / 2 + 90, y + 45, 19, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(16); doc.text('✓', W / 2 + 90, y + 51, { align: 'center' });
    doc.setTextColor(154, 52, 18); doc.setFontSize(8); doc.text('CERTIFIED', W / 2 + 90, y + 82, { align: 'center' });
  }
  y += 130;
  doc.setFillColor(254, 243, 199); doc.roundedRect(40, y, W - 80, 70, 6, 6, 'F');
  doc.setTextColor(120, 53, 15); doc.setFontSize(8);
  doc.text(doc.splitTextToSize('Important: This document reflects the Tax Identification Number and details as provided by the client. It is not issued by, endorsed by, or affiliated with any government agency. This TIN can be independently confirmed at taxid.nrs.gov.ng.', W - 100), 50, y + 18);
  doc.save(slip.reference + '.pdf');
}

export default function TaxIdSuccessPage() {
  const [ref, setRef] = useState('');
  const [slip, setSlip] = useState<any>(null);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get('reference') ?? '';
    setRef(r);
    if (!r) { setDone(true); return; }
    let n = 0;
    const t = setInterval(async () => {
      n++;
      const j = await fetch('/api/v1/taxid/confirm?reference=' + encodeURIComponent(r)).then((x) => x.json()).catch(() => null);
      if (j?.paid) { setSlip(j.slip); setDone(true); clearInterval(t); }
      else if (n > 20) { setDone(true); clearInterval(t); }
    }, 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-light flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-6 text-center">
        {!done && (
          <>
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-emerald-700 border-t-transparent" />
            <h1 className="mt-4 text-lg font-extrabold text-emerald-950">Confirming your payment…</h1>
            <p className="mt-1 text-xs text-muted">This takes a few seconds. Don&apos;t close this page.</p>
          </>
        )}
        {done && slip && (
          <>
            <div className="mx-auto h-16 w-16 rounded-full border-4 border-emerald-800 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-emerald-800"><path d="M5 13l4 4L19 7" /></svg>
            </div>
            <h1 className="mt-4 text-xl font-extrabold text-emerald-950">Payment Successful!</h1>
            <p className="mt-2 text-sm text-muted">Your TIN Slip for <span className="font-bold text-dark">{slip.email}</span> is ready.</p>
            <button onClick={() => downloadPdf(slip)} className="mt-5 w-full rounded-xl bg-emerald-950 text-yellow-300 font-extrabold py-4 text-sm">↓ DOWNLOAD PDF</button>
            <div className="mt-4 rounded-xl border-2 border-dashed border-border p-3 flex items-center justify-between gap-2">
              <div className="text-left">
                <p className="text-[10px] font-bold uppercase text-muted">Your reference (save this)</p>
                <p className="text-sm font-extrabold text-dark">{slip.reference}</p>
              </div>
              <button onClick={() => { navigator.clipboard.writeText(slip.reference); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="rounded-lg bg-emerald-800 text-white text-xs font-bold px-3 py-2">{copied ? 'Copied' : 'Copy'}</button>
            </div>
          </>
        )}
        {done && !slip && (
          <>
            <h1 className="text-lg font-extrabold text-emerald-950">Payment not confirmed yet</h1>
            <p className="mt-2 text-xs text-muted">If you paid, wait a minute and refresh this page{ref ? '' : ' with your reference'}. Your reference: <span className="font-bold text-dark">{ref || '—'}</span></p>
          </>
        )}
      </div>
    </div>
  );
}

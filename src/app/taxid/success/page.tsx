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
  const H = doc.internal.pageSize.getHeight();
  const dateStr = new Date(slip.prepared).toLocaleDateString('en-NG', { day: '2-digit', month: '2-digit', year: 'numeric' });
  let qr: string | null = null;
  try { qr = await qrDataUrl('https://deenbyte.com.ng/taxid/verify?reference=' + slip.reference); } catch {}
  const name = ((slip.firstName ?? '') + ' ' + (slip.middleName ?? '') + ' ' + (slip.lastName ?? '')).trim().toUpperCase();

  if (slip.tier === 'premium') {
    doc.setFillColor(154, 52, 18); doc.rect(0, 0, W, 14, 'F'); doc.rect(0, H - 14, W, 14, 'F');
    doc.setDrawColor(202, 168, 66); doc.setLineWidth(2.5); doc.roundedRect(34, 34, W - 68, H - 68, 4, 4, 'S');
    doc.setLineWidth(0.8); doc.roundedRect(42, 42, W - 84, H - 84, 3, 3, 'S');
    doc.setTextColor(154, 52, 18); doc.setFont('helvetica', 'bold'); doc.setFontSize(20);
    doc.text('DEENBYTE VERIFY', W / 2, 92, { align: 'center' });
    doc.setTextColor(107, 114, 128); doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text('PRIVATE TAX RECORD VERIFICATION', W / 2, 108, { align: 'center' });
    doc.setDrawColor(202, 168, 66); doc.setLineWidth(1.2);
    doc.line(W / 2 - 150, 132, W / 2 + 150, 132);
    doc.setTextColor(31, 41, 55); doc.setFont('times', 'bold'); doc.setFontSize(26);
    doc.text('Certificate of Registration', W / 2, 168, { align: 'center' });
    doc.line(W / 2 - 150, 186, W / 2 + 150, 186);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(75, 85, 99);
    doc.text(doc.splitTextToSize('This is to certify that the taxpayer named below has been duly registered in the DeenByte Verify registry, and that the Tax Identification Number shown is consistent with the details provided by the client at registration.', W - 160), W / 2, 216, { align: 'center' });
    doc.setFont('times', 'bold'); doc.setFontSize(24); doc.setTextColor(31, 41, 55);
    doc.text(name, W / 2, 286, { align: 'center' });
    doc.setFillColor(250, 235, 235); doc.setDrawColor(220, 180, 180);
    doc.roundedRect(W / 2 - 110, 306, 220, 26, 5, 5, 'FD');
    doc.setTextColor(154, 52, 18); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('Tax ID: ' + slip.tin, W / 2, 323, { align: 'center' });
    const ty = 366;
    doc.setDrawColor(229, 231, 235); doc.setLineWidth(0.8);
    doc.rect(60, ty, W - 120, 46, 'S'); doc.line(W / 2, ty, W / 2, ty + 46);
    doc.rect(60, ty + 50, W - 120, 46, 'S');
    doc.setTextColor(107, 114, 128); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text('TAXPAYER CLASSIFICATION', W * 0.25, ty + 18, { align: 'center' });
    doc.text('DATE OF REGISTRATION', W * 0.75, ty + 18, { align: 'center' });
    doc.setTextColor(31, 41, 55); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text(String(slip.slipType).toUpperCase(), W * 0.25, ty + 36, { align: 'center' });
    doc.text(dateStr, W * 0.75, ty + 36, { align: 'center' });
    doc.setTextColor(107, 114, 128); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text('ASSIGNED REFERENCE', W / 2, ty + 68, { align: 'center' });
    doc.setTextColor(31, 41, 55); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text(slip.reference, W / 2, ty + 86, { align: 'center' });
    const qy = ty + 130;
    if (qr) { doc.addImage(qr, 'PNG', 70, qy, 80, 80); doc.setTextColor(107, 114, 128); doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.text('Scan to Verify', 70, qy + 92); }
    doc.setDrawColor(202, 168, 66); doc.setLineWidth(2); doc.circle(W / 2, qy + 40, 26, 'S');
    doc.setFillColor(222, 190, 90); doc.circle(W / 2, qy + 40, 21, 'F');
    doc.setTextColor(120, 84, 10); doc.setFontSize(7); doc.setFont('helvetica', 'bold');
    doc.text('CERTIFIED', W / 2, qy + 43, { align: 'center' });
    doc.setDrawColor(31, 41, 55); doc.setLineWidth(1); doc.line(W - 190, qy + 66, W - 70, qy + 66);
    doc.setTextColor(31, 41, 55); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text('Founder, DeenByte Verify', W - 130, qy + 80, { align: 'center' });
    doc.setTextColor(107, 114, 128); doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
    doc.text('Certificate No: ' + slip.reference + ' | Issued: ' + dateStr, W / 2, H - 78, { align: 'center' });
    doc.text(doc.splitTextToSize('This certificate is a private verification summary produced by DeenByte Verify from client-provided data. It is not issued by, endorsed by, or affiliated with the Nigeria Revenue Service or any government agency. TIN can be independently confirmed at taxid.nrs.gov.ng.', W - 120), W / 2, H - 64, { align: 'center' });
    doc.save(slip.reference + '-certificate.pdf');
    return;
  }

  doc.setFillColor(6, 78, 59); doc.rect(0, 0, W, 64, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
  doc.text('DEENBYTE VERIFY - TIN VALIDATION RESULT', W / 2, 38, { align: 'center' });
  doc.setFillColor(5, 150, 105); doc.circle(70, 120, 16, 'F');
  doc.setDrawColor(255, 255, 255); doc.setLineWidth(2.5);
  doc.line(62, 120, 67, 126); doc.line(67, 126, 79, 112);
  doc.setTextColor(31, 41, 55); doc.setFontSize(16); doc.setFont('helvetica', 'bold');
  doc.text('Hello, ' + String(slip.fullName ?? '').toUpperCase(), 96, 124);
  doc.setTextColor(30, 64, 175); doc.setFontSize(11); doc.setFont('helvetica', 'normal');
  doc.text(doc.splitTextToSize('Your Tax Identification Number has been successfully validated and matches the details provided at registration.', W - 120), 60, 170);
  doc.text('Your Tax ID is ' + slip.tin + '.', 60, 210);
  doc.setTextColor(107, 114, 128); doc.setFontSize(8);
  doc.text('Reference: ' + slip.reference + '  |  ' + dateStr, 60, 240);
  if (qr) { doc.addImage(qr, 'PNG', W - 140, 280, 80, 80); doc.text('Scan to Verify', W - 100, 372, { align: 'center' }); }
  doc.setTextColor(107, 114, 128); doc.setFontSize(7.5);
  doc.text(doc.splitTextToSize('This document is a private validation summary produced by DeenByte Verify from client-provided data. It is not issued by, endorsed by, or affiliated with any government agency. TIN can be independently confirmed at taxid.nrs.gov.ng.', W - 80), 60, H - 60);
  doc.save(slip.reference + '-validation.pdf');
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
            <button onClick={() => downloadPdf(slip)} className="mt-5 w-full rounded-xl bg-primary text-white font-extrabold py-4 text-sm">↓ DOWNLOAD PDF</button>
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

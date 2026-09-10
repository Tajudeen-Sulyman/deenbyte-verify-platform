export function openProviderPdf(pdfBase64: string, name: string) {
  const a = document.createElement('a');
  a.href = 'data:application/pdf;base64,' + pdfBase64;
  a.download = name;
  a.click();
}
export async function openSlipFor(result: any) {
  const u = { ...(result?.data ?? {}), ...(result?.user_data ?? {}), ...result };
  const pdf = u.pdf_base64 ?? u.pdf ?? u.slip_base64;
  const name = 'NIN-slip-' + (u.nin ?? result?.reference ?? 'slip') + '.pdf';
  if (pdf) return openProviderPdf(pdf, name);
  if (result?.reference) {
    const j = await fetch('/api/v1/slip/by-ref', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reference: result.reference }) }).then((x) => x.json()).catch(() => null);
    if (j?.pdf_base64) return openProviderPdf(j.pdf_base64, name);
  }
  const cands = [result?.requestId, result?.reference, u.nin].filter(Boolean);
  for (const c of cands) {
    try {
      const r = await fetch('/api/v1/slip/' + encodeURIComponent(String(c)));
      if (!r.ok) continue;
      const ct = r.headers.get('content-type') || '';
      if (ct.includes('pdf')) {
        const b = await r.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = name;
        a.click();
        return;
      }
      const j = await r.json().catch(() => null);
      if (j?.pdf_base64) return openProviderPdf(j.pdf_base64, name);
    } catch {}
  }
  const tries: Array<() => Promise<Response>> = [
    () => fetch('/api/v1/slip?nin=' + encodeURIComponent(u.nin ?? '') + '&reference=' + encodeURIComponent(result?.reference ?? '')),
    () => fetch('/api/v1/slip/' + encodeURIComponent(result?.reference ?? '')),
    () => fetch('/api/v1/slip', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nin: u.nin ?? '', reference: result?.reference ?? '', number: u.nin ?? '' }) }),
  ];
  for (const t of tries) {
    try {
      const r = await t();
      if (!r.ok) continue;
      const ct = r.headers.get('content-type') || '';
      if (ct.includes('pdf')) {
        const b = await r.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = name;
        a.click();
        return;
      }
      const j = await r.json().catch(() => null);
      const p = j?.pdf_base64 ?? j?.pdf;
      if (p) return openProviderPdf(p, name);
    } catch {}
  }
  alert('Slip PDF is not available for this request yet.');
}

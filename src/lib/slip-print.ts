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
  alert('Slip PDF is not available for this request yet.');
}

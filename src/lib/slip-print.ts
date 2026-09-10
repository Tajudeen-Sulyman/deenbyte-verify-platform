export function slipPrintHtml(u: any): string {
  const L = (k: string, v: any) => `<tr><td class="k">${k}:</td><td class="v">${v ?? ''}</td></tr>`;
  const photo = u.photo ?? u.base64Image ?? '';
  const photoSrc = photo ? (String(photo).startsWith('data:') ? String(photo) : 'data:image/jpeg;base64,' + String(photo)) : '';
  return `<!doctype html><html><head><meta charset="utf-8"><title>NIN Slip</title>
<style>
body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:20px}
.notes{font-size:11px;text-align:center;font-weight:700;line-height:1.5}
.box{border:1px solid #888;padding:14px;margin-top:14px}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
.crest{font-size:28px;line-height:1}
.t{text-align:center;font-size:15px;font-weight:800;margin:0}
.st{text-align:center;font-size:12px;font-weight:700;margin:2px 0 0}
.nimc{color:#0a7a2f;font-style:italic;font-weight:800;font-size:15px}
.cols{display:flex;gap:10px;margin-top:10px;align-items:flex-start}
.col{flex:1;font-size:11px}
table{border-collapse:collapse;width:100%}
td{padding:2px 4px;vertical-align:top}
.k{font-weight:700;width:45%}
.mid{text-align:center}
.mid img{width:110px;height:130px;object-fit:cover;border:1px solid #999}
.right{font-size:9px;line-height:1.5}
.ver{color:#0a7a2f;font-weight:800;font-size:14px;text-align:center;margin:4px 0}
.red{color:#c00;font-weight:800}
</style></head><body>
<p class="notes">Please find below your Digital NIN Slip<br>You may cut it out of the paper, fold and laminate as desired.<br>For your security &amp; privacy, please DO NOT permit others to make photocopies of this slip.</p>
<div class="box">
<div class="hdr">
  <div class="crest"><img src="/coat-of-arms.png" alt="NG" style="width:46px;height:auto"/></div>
  <div><p class="t">Federal Republic of Nigeria</p><p class="st">Verified NIN Details</p></div>
  <div class="nimc">NIMC</div>
</div>
<div class="cols">
  <table class="col">
    ${L('First Name', u.first_name ?? u.firstname)}
    ${L('Middle Name', u.middle_name ?? u.middlename)}
    ${L('Last Name', u.last_name ?? u.surname)}
    ${L('Date of Birth', u.date_of_birth ?? u.birthdate)}
    ${L('Gender', u.gender)}
    ${L('NIN', u.nin)}
    ${L('Tracking ID', u.tracking_id)}
  </table>
  <div class="col mid">
    ${photoSrc ? `<img src="${photoSrc}" alt="photo"/>` : '<div style="width:110px;height:130px;border:1px solid #999;margin:auto"></div>'}
    <table><tr><td class="k">Signature:</td><td>NIL</td></tr><tr><td class="k">Phone Number:</td><td>${u.phone_number ?? u.phone ?? ''}</td></tr></table>
  </div>
  <div class="col right">
    <p class="ver">Verified</p>
    <p>This is a property of National Identity Management Commission (NIMC), Nigeria. If found, please return to the nearest NIMC's office.</p>
    <p>1. This NIN slip remains the property of the Federal Republic of Nigeria, and must be surrendered on demand;</p>
    <p>2. This NIN slip does not imply nor confer the citizenship of the Federal Republic of Nigeria on the individual the document is issued to;</p>
    <p>3. This NIN slip is valid for the lifetime of the owner and <span class="red">DOES NOT EXPIRE</span></p>
    <p class="ver">✓ Verified</p>
  </div>
</div>
</div>
<script>window.onload=function(){setTimeout(function(){window.print()},300)}</script>
</body></html>`;
}
export function openSlipPrint(u: any) {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(slipPrintHtml(u));
  w.document.close();
}
export function openProviderPdf(pdfBase64: string, name: string) {
  const a = document.createElement('a');
  a.href = 'data:application/pdf;base64,' + pdfBase64;
  a.download = name;
  a.click();
}

export async function openSlipFor(result: any) {
  const pdf = result?.pdf_base64 ?? result?.data?.pdf_base64 ?? result?.slip?.pdf_base64;
  const u = result?.user_data ?? result?.data ?? result ?? {};
  const name = 'NIN-slip-' + (u.nin ?? result?.reference ?? 'slip') + '.pdf';
  if (pdf) return openProviderPdf(pdf, name);
  if (result?.reference) {
    const j = await fetch('/api/v1/slip/by-ref', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reference: result.reference }) }).then((x) => x.json()).catch(() => null);
    if (j?.pdf_base64) return openProviderPdf(j.pdf_base64, name);
  }
  openSlipPrint(u);
}

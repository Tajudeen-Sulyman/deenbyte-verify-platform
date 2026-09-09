export function slipPrintHtml(u: any): string {
  const row = (k: string, v: any) => `<tr><td style="padding:4px 8px;font-weight:700;width:34%">${k}:</td><td style="padding:4px 8px">${v ?? ''}</td></tr>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>NIN Slip</title>
<style>body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:24px}.box{border:1px solid #999;padding:16px;margin-top:16px}.cols{display:flex;gap:24px}.cols table{flex:1;border-collapse:collapse;font-size:12px}.t{text-align:center;font-size:16px;font-weight:800}.st{text-align:center;font-size:13px;font-weight:700}.ver{text-align:center;color:#0a7a2f;font-weight:800;font-size:18px;margin-top:12px}.notes{font-size:11px;text-align:center;font-weight:700}</style>
</head><body>
<p class="notes">Please find below your Digital NIN Slip<br>You may cut it out of the paper, fold and laminate as desired.<br>For your security &amp; privacy, please DO NOT permit others to photocopy this slip.</p>
<div class="box">
<p class="t">Federal Republic of Nigeria</p>
<p class="st">Verified NIN Details</p>
<div class="cols"><table>
${row('First Name', u.first_name ?? u.firstname)}
${row('Middle Name', u.middle_name ?? u.middlename)}
${row('Last Name', u.last_name ?? u.surname)}
${row('Date of Birth', u.date_of_birth ?? u.birthdate)}
${row('Gender', u.gender)}
${row('NIN', u.nin)}
${row('Tracking ID', u.tracking_id)}
</table><table>
${row('Phone Number', u.phone_number ?? u.phone)}
${row('Signature', u.signature ?? 'NIL')}
${row('Residence State', u.residence_state ?? u.state)}
${row('Residence LGA/Town', u.residence_lga ?? u.lga)}
${row('Birth State', u.birth_state)}
${row('Birth LGA', u.birth_lga)}
${row('Address', u.address)}
</table></div>
<p class="ver">&#10003; Verified</p>
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

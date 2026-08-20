import { NextResponse } from 'next/server';
import { createClient as adminClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = adminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function esc(s: any) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { data: row } = await supabaseAdmin
    .from('verification_requests')
    .select('*, verification_services(name)')
    .eq('id', id)
    .single();

  if (!row) return new NextResponse('Not found', { status: 404 });

  const d = row.safe_response_data || {};
  const ref = row.request_reference || `DBV-${id.slice(0, 8).toUpperCase()}`;
  const svc = Array.isArray(row.verification_services) ? row.verification_services[0]?.name : row.verification_services?.name;
  const status = row.status?.toUpperCase() || 'VERIFIED';
  const date = new Date(row.created_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
  const issueDate = new Date(row.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();

  const fullName = `${d.first_name || ''} ${d.middle_name || ''} ${d.last_name || ''}`.trim();
  const ninFormatted = (d.nin || '').replace(/(\d{4})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4');

  const qrData = JSON.stringify({ ref, nin: d.nin, name: fullName, dob: d.date_of_birth });

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Digital NIN Slip - ${esc(ref)}</title><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;background:#fff;padding:20px}
    .slip{max-width:600px;margin:0 auto;background:#fff;box-shadow:0 2px 10px rgba(0,0,0,0.1)}
    .card{background:linear-gradient(135deg,#e8f5e9 0%,#c8e6c9 100%);padding:20px;position:relative;overflow:hidden}
    .card::before{content:'';position:absolute;top:0;left:0;right:0;bottom:0;background-image:url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23059669' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");opacity:0.4}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:15px;position:relative;z-index:1}
    .header-left h1{color:#059669;font-size:16px;font-weight:700;margin-bottom:2px}
    .header-left p{color:#047857;font-size:11px;font-weight:600}
    .header-right{text-align:right}
    .header-right .label{font-size:9px;color:#666}
    .header-right .value{font-size:11px;font-weight:600;color:#000}
    .content{display:flex;gap:15px;position:relative;z-index:1}
    .photo{width:130px;height:160px;background:#fff;border:2px solid #059669;border-radius:4px;flex-shrink:0;overflow:hidden}
    .photo img{width:100%;height:100%;object-fit:cover}
    .photo-placeholder{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f0f0f0;color:#999;font-size:11px;text-align:center}
    .details{flex:1}
    .field{margin-bottom:8px}
    .field-label{font-size:10px;color:#333;font-weight:600;text-transform:uppercase}
    .field-value{font-size:12px;color:#000;font-weight:600;margin-top:2px}
    .qr{width:80px;height:80px;background:#fff;padding:4px;border-radius:4px;margin-top:10px}
    .qr img{width:100%;height:100%}
    .nga{position:absolute;right:20px;top:50%;transform:translateY(-50%);text-align:center;z-index:1}
    .nga .code{font-size:24px;font-weight:800;color:#059669}
    .nga .label{font-size:9px;color:#666}
    .nin-display{background:#fff;padding:12px;border-radius:4px;margin-top:15px;text-align:center;position:relative;z-index:1}
    .nin-label{font-size:10px;color:#059669;font-weight:700;text-transform:uppercase;margin-bottom:4px}
    .nin-number{font-size:20px;font-weight:800;color:#000;letter-spacing:3px;font-family:'Courier New',monospace}
    .disclaimer{background:#fff;padding:15px;font-size:9px;color:#666;line-height:1.5;border-top:2px solid #059669}
    .disclaimer b{color:#059669;display:block;margin-bottom:6px;text-align:center;font-size:10px}
    .disclaimer p{margin-bottom:4px;text-align:center}
    .disclaimer .trust{font-style:italic;margin-top:8px}
    @media print{body{background:#fff}.slip{box-shadow:none}}
  </style></head><body>
  <div class="slip">
    <div class="card">
      <div class="header">
        <div class="header-left">
          <h1>FEDERAL REPUBLIC OF NIGERIA</h1>
          <p>DIGITAL NIN SLIP</p>
        </div>
        <div class="header-right">
          <div class="label">ISSUE DATE</div>
          <div class="value">${esc(issueDate)}</div>
        </div>
      </div>
      <div class="content">
        <div class="photo">
          <div class="photo-placeholder">Passport<br>Photograph</div>
        </div>
        <div class="details">
          <div class="field"><div class="field-label">SURNAME/NOM</div><div class="field-value">${esc(d.last_name || '')}</div></div>
          <div class="field"><div class="field-label">GIVEN NAMES/PRÉNOMS</div><div class="field-value">${esc(d.first_name || '')} ${esc(d.middle_name || '')}</div></div>
          <div class="field"><div class="field-label">DATE OF BIRTH</div><div class="field-value">${esc(d.date_of_birth || '').toUpperCase()}</div></div>
          <div class="field"><div class="field-label">SEX/SEXE</div><div class="field-value">${esc(d.gender || '').toUpperCase()}</div></div>
          <div class="qr">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(qrData)}" alt="QR Code" />
          </div>
        </div>
      </div>
      <div class="nga">
        <div class="code">NGA</div>
      </div>
      <div class="nin-display">
        <div class="nin-label">National Identification Number (NIN)</div>
        <div class="nin-number">${esc(ninFormatted)}</div>
      </div>
    </div>
    <div class="disclaimer">
      <b>DISCLAIMER</b>
      <p>Kindly ensure each time this ID is presented, that you verify the credentials using a Government-APPROVED verification resource.</p>
      <p>The details on the front of this NIN Slip must EXACTLY match the verification result.</p>
      <p>If this NIN was not issued to the person on the front of this document, please DO NOT attempt to scan, photocopy or replicate the personal data contained herein.</p>
      <p>You are only permitted to scan the barcode for the purpose of identity verification.</p>
      <p>The FEDERAL GOVERNMENT OF NIGERIA assumes no responsibility if you accept any variance in the scan result or do not scan the 2D barcode overleaf.</p>
      <p class="trust">Trust, but verify</p>
    </div>
  </div></body></html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
    },
  });
}

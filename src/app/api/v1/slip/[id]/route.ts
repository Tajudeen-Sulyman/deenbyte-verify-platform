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

  const ref = row.request_reference || `DBV-${id.slice(0, 8).toUpperCase()}`;
  const svc = Array.isArray(row.verification_services) ? row.verification_services[0]?.name : row.verification_services?.name;
  const status = row.status?.toUpperCase() || 'VERIFIED';
  const date = new Date(row.created_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });

  // Try multiple possible data sources
  const d = row.safe_request_data || row.provider_response || row.response_data || row.result || row.data || {};
  
  // Debug: show all columns
  const allCols = Object.keys(row).filter(k => !['verification_services'].includes(k));
  const debugHtml = allCols.map(k => `<tr><td style="padding:4px 8px;border-bottom:1px solid #e2e8f0;font-size:11px"><b>${esc(k)}</b></td><td style="padding:4px 8px;border-bottom:1px solid #e2e8f0;font-size:11px">${esc(JSON.stringify(row[k]))}</td></tr>`).join('');

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NIN Verification Slip - ${esc(ref)}</title><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',Arial,sans-serif;background:#f0f2f5;padding:20px}
    .slip{max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)}
    .header{background:linear-gradient(135deg,#059669 0%,#047857 100%);color:#fff;padding:24px;text-align:center}
    .logo{width:60px;height:60px;background:#fff;border-radius:50%;margin:0 auto 12px;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:bold;color:#059669}
    .header h1{font-size:20px;margin-bottom:4px}
    .header p{font-size:12px;opacity:0.9}
    .meta{background:#f8fafc;padding:16px 24px;border-bottom:2px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
    .meta-item{font-size:13px}
    .meta-item b{color:#0f172a}
    .status{background:#10b981;color:#fff;padding:4px 12px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:0.5px}
    .content{padding:24px}
    .debug{background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;padding:16px;margin-bottom:20px;max-height:300px;overflow-y:auto}
    .debug h3{font-size:14px;color:#92400e;margin-bottom:8px}
    table{width:100%;border-collapse:collapse}
    .photo-section{display:flex;gap:20px;margin-bottom:24px;align-items:flex-start}
    .photo-box{width:140px;height:170px;border:2px dashed #cbd5e1;border-radius:8px;display:flex;align-items:center;justify-content:center;background:#f8fafc;flex-shrink:0}
    .photo-box span{color:#94a3b8;font-size:12px;text-align:center;padding:8px}
    .fields{flex:1}
    .field{margin-bottom:16px}
    .field label{display:block;font-size:12px;color:#64748b;margin-bottom:4px;font-weight:600}
    .field-value{font-size:15px;color:#0f172a;font-weight:600;padding:8px 12px;background:#f8fafc;border-radius:6px;border-left:3px solid #059669}
    .barcode{background:#f8fafc;padding:20px;text-align:center;border-radius:6px;margin-top:20px}
    .barcode-text{font-family:'Courier New',monospace;font-size:14px;color:#475569;letter-spacing:2px}
    .footer{background:#f8fafc;padding:16px 24px;text-align:center;border-top:1px solid #e2e8f0}
    .footer p{font-size:11px;color:#64748b;line-height:1.5}
    @media print{body{background:#fff}.slip{box-shadow:none}}
  </style></head><body>
  <div class="slip">
    <div class="header">
      <div class="logo">DB</div>
      <h1>NATIONAL IDENTITY MANAGEMENT COMMISSION</h1>
      <p>VERIFICATION SLIP</p>
    </div>
    <div class="meta">
      <div class="meta-item">Ref: <b>${esc(ref)}</b></div>
      <div class="meta-item">Service: <b>${esc(svc || 'NIN Verification')}</b></div>
      <div class="meta-item">Date: <b>${esc(date)}</b></div>
      <span class="status">${esc(status)}</span>
    </div>
    <div class="content">
      <div class="debug">
        <h3>🔍 All Database Columns (Debug)</h3>
        <table>${debugHtml}</table>
      </div>
      <div class="photo-section">
        <div class="photo-box"><span>Passport<br>Photograph</span></div>
        <div class="fields">
          <div class="field"><label>First Name</label><div class="field-value">${esc(d.first_name || d.firstName || d.surname || d.Surname || '')}</div></div>
          <div class="field"><label>Middle Name</label><div class="field-value">${esc(d.middle_name || d.middleName || '')}</div></div>
          <div class="field"><label>Last Name</label><div class="field-value">${esc(d.last_name || d.lastName || '')}</div></div>
          <div class="field"><label>Date of Birth</label><div class="field-value">${esc(d.date_of_birth || d.dob || d.DOB || '')}</div></div>
          <div class="field"><label>Gender</label><div class="field-value">${esc(d.gender || d.sex || d.Sex || '')}</div></div>
          <div class="field"><label>National Identification Number (NIN)</label><div class="field-value" style="font-size:18px;letter-spacing:1px">${esc(d.nin || d.NIN || '')}</div></div>
        </div>
      </div>
      <div class="barcode">
        <div class="barcode-text">${esc(ref.replace(/-/g, ''))}</div>
      </div>
    </div>
    <div class="footer">
      <p><b>This slip was generated from data returned by the official verification provider at the time of request.</b></p>
    </div>
  </div></body></html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
    },
  });
}

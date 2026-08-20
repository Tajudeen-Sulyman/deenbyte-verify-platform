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

  const rows: [string, string][] = [
    ['First name', d.first_name || ''],
    ['Middle name', d.middle_name || ''],
    ['Last name', d.last_name || ''],
    ['Date of birth', d.date_of_birth || ''],
    ['Gender', d.gender || ''],
    ['NIN', d.nin || ''],
  ];

  const body = rows
    .filter(([, v]) => v)
    .map(([k, v]) =>
      `<tr><td style="padding:8px 0;color:#555;width:40%">${esc(k)}</td><td style="padding:8px 0;font-weight:600;color:#0f172a">${esc(v)}</td></tr>`
    ).join('');

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Verification Slip ${esc(ref)}</title></head><body style="margin:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif"><div style="max-width:640px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb"><div style="padding:20px 24px;border-bottom:1px solid #e5e7eb"><h1 style="margin:0;font-size:18px">Verification Slip</h1><p style="margin:4px 0 0;color:#6b7280;font-size:12px">Official provider data at time of request</p></div><div style="padding:20px 24px"><p style="font-size:13px;color:#374151">Ref: <b>${esc(ref)}</b> &nbsp; Service: <b>${esc(svc || 'Verification')}</b> &nbsp; Date: <b>${esc(date)}</b> &nbsp; <span style="color:#047857;border:1px solid #a7f3d0;background:#ecfdf5;border-radius:999px;padding:2px 10px;font-size:11px;font-weight:700">${esc(status)}</span></p><table style="width:100%;border-collapse:collapse;font-size:14px">${body}</table></div><div style="padding:14px 24px;background:#f9fafb;color:#6b7280;font-size:11px">This slip was generated from data returned by the official verification provider at the time of request.</div></div></body></html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
    },
  });
}

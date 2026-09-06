import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as adminClient } from '@supabase/supabase-js';

const admin = adminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const ADMIN = 'deenbyte.technologies@gmail.com';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN) return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
  const b = await req.json();
  const { data: row } = await admin.from('cac_applications').select('*').eq('reference', b.reference).maybeSingle();
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const now = new Date().toISOString();

  if (b.action === 'processing') {
    await admin.from('cac_applications').update({ status: 'processing', updated_at: now }).eq('reference', b.reference);
    await admin.from('notifications').insert({ user_id: row.user_id, title: 'CAC application in processing', body: b.reference + ' is being processed on the CAC portal.' });
    return NextResponse.json({ ok: true });
  }
  if (b.action === 'queried') {
    await admin.from('cac_applications').update({ status: 'queried', admin_note: String(b.note ?? ''), updated_at: now }).eq('reference', b.reference);
    await admin.from('notifications').insert({ user_id: row.user_id, title: 'Action needed on your CAC application', body: b.reference + ': ' + String(b.note ?? '') });
    return NextResponse.json({ ok: true });
  }
  if (b.action === 'failed') {
    await admin.from('cac_applications').update({ status: 'failed', admin_note: String(b.note ?? ''), updated_at: now }).eq('reference', b.reference);
    await admin.from('notifications').insert({ user_id: row.user_id, title: 'CAC application failed', body: b.reference + ': ' + String(b.note ?? 'Contact support.') });
    return NextResponse.json({ ok: true });
  }
  if (b.action === 'completed') {
    const docs = Array.isArray(b.docs) ? b.docs : [];
    if (docs.length === 0) return NextResponse.json({ error: 'Upload at least one document.' }, { status: 400 });
    const completed: { name: string; path: string }[] = [];
    for (let i = 0; i < docs.length; i++) {
      const ext = String(docs[i].base64).startsWith('JVBERi') ? 'pdf' : 'jpg';
      const path = row.user_id + '/' + row.reference + '/completed/' + i + '_' + String(docs[i].name).replace(/[^\w.-]/g, '_');
      const up = await admin.storage.from('cac-docs').upload(path, Buffer.from(docs[i].base64, 'base64'), { contentType: ext === 'pdf' ? 'application/pdf' : 'image/jpeg', upsert: true });
      if (up.error) return NextResponse.json({ error: 'Upload failed: ' + docs[i].name }, { status: 500 });
      completed.push({ name: docs[i].name, path });
    }
    await admin.from('cac_applications').update({ status: 'completed', completed_docs: completed, admin_note: String(b.note ?? ''), updated_at: now }).eq('reference', b.reference);
    await admin.from('notifications').insert({ user_id: row.user_id, title: 'CAC documents ready 🎉', body: b.reference + ' is complete — download your documents from CAC History.' });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

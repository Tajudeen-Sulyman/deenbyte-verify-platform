const BASE = 'https://seamleshub.com';

export async function shPost(path: string, body: any) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: process.env.SEAMLESHUB_API_KEY ?? '', ...body }),
  });
  return res.json().catch(() => null);
}

export async function submitNinModification(row: any) {
  const json = await shPost('/api_nin_modification_api.php', {
    nin: row.nin,
    modification_type: row.mod_type,
    ...(row.payload ?? {}),
    support_doc_base64: row.doc_base64,
  });
  if (json?.status === 'success' && json?.data?.transaction_ref) {
    return { ok: true as const, provider_ref: String(json.data.transaction_ref), charged: Number(json.data.amount_charged ?? 0) };
  }
  return { ok: false as const, error: String(json?.message ?? 'SeamlesHub submission failed.') };
}

export async function modificationStatus(provider_ref: string) {
  const json = await shPost('/api_modification_status.php', { reference: provider_ref });
  if (json?.status !== 'success') return { state: 'unknown' as const, raw: json };
  const st = String(json?.data?.status ?? json?.data?.request_status ?? '').toLowerCase();
  if (/compl|success|approv|done/.test(st)) return { state: 'completed' as const, raw: json.data };
  if (/fail|reject|cancel|declin/.test(st)) return { state: 'failed' as const, raw: json.data };
  return { state: 'processing' as const, raw: json.data };
}

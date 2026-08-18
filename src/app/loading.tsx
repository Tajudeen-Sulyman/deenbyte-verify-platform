export default function Loading() {
  return (
    <div className="min-h-screen bg-light flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-xs text-muted">Loading…</p>
      </div>
    </div>
  );
}
python3 - << 'EOF'
p = 'src/app/verify/page.tsx'
s = open(p).read()
old = """  const { data: wallet } = await supabase
    .from('wallets').select('balance').eq('user_id', user.id).single();
  const walletBalance = Number(wallet?.balance ?? 0);

  const { data: services } = await supabase
    .from('verification_services').select('*')
    .eq('enabled', true).eq('status', 'active')
    .order('category').order('name');"""
new = """  const [walletRes, servicesRes] = await Promise.all([
    supabase.from('wallets').select('balance').eq('user_id', user.id).single(),
    supabase.from('verification_services').select('*')
      .eq('enabled', true).eq('status', 'active')
      .order('category').order('name'),
  ]);
  const walletBalance = Number(walletRes.data?.balance ?? 0);
  const services = servicesRes.data;"""
assert old in s
open(p, 'w').write(s.replace(old, new))
print('verify parallelized')

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { BrandLogo } from '@/components/brand';

export const dynamic = 'force-dynamic';

const LABELS: Record<string, string> = {
  first_name: 'First name', firstName: 'First name',
  middle_name: 'Middle name', middleName: 'Middle name',
  last_name: 'Last name', lastName: 'Last name',
  nameOnCard: 'Name on card',
  date_of_birth: 'Date of birth', dateOfBirth: 'Date of birth',
  gender: 'Gender',
  phone: 'Phone', phoneNumber1: 'Phone',
  address: 'Address', residentialAddress: 'Address',
  residence_state: 'State', stateOfResidence: 'State',
  residence_lga: 'LGA', lgaOfResidence: 'LGA',
  nin: 'NIN', bvn: 'BVN',
  enrollmentBank: 'Enrollment bank',
};

export default async function HistoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: row } = await supabase
    .from('verification_requests')
    .select('*, verification_services(name)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!row) redirect('/history');

  const data = (row.safe_response_data ?? {}) as Record<string, any>;
  const entries = Object.entries(LABELS).filter(([key]) => data[key] != null && data[key] !== '');

  return (
    <main className="min-h-screen">
      <header className="bg-white border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard"><BrandLogo /></Link>
          <Link href="/history" className="text-sm font-medium text-muted hover:text-dark">Back</Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="bg-white border border-border rounded-2xl p-5">
          <p className="text-sm text-muted">{row.verification_services?.name ?? 'Verification'}</p>
          <p className="text-lg font-bold text-dark mt-1">{row.request_reference}</p>
          <p className="text-xs text-muted mt-1">{new Date(row.created_at).toLocaleString()} · {row.status}</p>
        </div>

        {row.status === 'successful' && entries.length > 0 && (
          <div className="bg-white border border-border rounded-2xl p-5">
            <h2 className="font-semibold text-dark">Result</h2>
            <div className="mt-3 space-y-2">
              {entries.map(([key, label]) => (
                <div key={key} className="flex justify-between gap-4 text-sm">
                  <span className="text-muted">{label}</span>
                  <span className="text-dark font-medium text-right">{String(data[key])}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {row.status === 'failed' && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-5 text-sm text-red-600">
            {row.error_message ?? 'Verification failed.'}
          </div>
        )}

        {row.slip_base64 && (
          <a
            href={'/api/v1/slip/' + row.id}
            target="_blank"
            rel="noopener"
            className="block bg-primary text-white text-center rounded-xl py-3 text-sm font-semibold"
          >
            View / Download Slip
          </a>
        )}
      </div>
    </main>
  );
}

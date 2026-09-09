'use client';
import { useState } from 'react';
import { openSlipPrint } from '@/lib/slip-print';

const SLIP_ROWS: [string, string][] = [
  ['First Name', 'first_name'], ['Middle Name', 'middle_name'], ['Last Name', 'last_name'], ['Date of Birth', 'date_of_birth'], ['Gender', 'gender'], ['NIN', 'nin'], ['Phone Number', 'phone_number'], ['Tracking ID', 'tracking_id'], ['Residence State', 'residence_state'], ['Birth State', 'birth_state'], ['Address', 'address'], ['Residence LGA', 'residence_lga'], ['Birth LGA', 'birth_lga'],
];

export function NinSlipModal({ result, pdfBase64: pdfProp, slipType, onClose }: { result: any; pdfBase64?: string; slipType?: string; onClose: () => void }) {
  const [tab, setTab] = useState<'data' | 'slip'>('data');
  const u = result?.user_data ?? result?.data ?? result ?? {};
  const pdfBase64 = pdfProp ?? result?.pdf_base64 ?? result?.data?.pdf_base64 ?? result?.slip?.pdf_base64 ?? u?.pdf_base64;
  const fields: [string, any][] = [
    ['NIN', u.nin], ['FIRST NAME', u.first_name ?? u.firstname], ['MIDDLE NAME', u.middle_name ?? u.middlename],
    ['SURNAME', u.last_name ?? u.surname], ['GENDER', u.gender], ['DATE OF BIRTH', u.date_of_birth ?? u.birthdate],
    ['PHONE NUMBER', u.phone_number ?? u.phone ?? u.telephoneno ?? u.msisdn], ['ADDRESS', u.address ?? u.residence_address],
  ];
  const photo = u.photo ?? u.passport_photo_base64;
  function download() {
    if (!pdfBase64) return;
    const a = document.createElement('a');
    a.href = 'data:application/pdf;base64,' + pdfBase64;
    a.download = 'NIN-slip-' + (u.nin ?? 'slip') + '.pdf';
    a.click();
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div className="profile-pop max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-white px-4 py-3">
          <p className="flex items-center gap-2 text-base font-extrabold text-dark"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-xs text-white">✓</span>NIN Verification Successful</p>
          <button onClick={onClose} className="text-lg font-bold text-muted">✕</button>
        </div>
        <div className="space-y-3 p-4">
          <div className="flex gap-2">
            <button onClick={() => setTab('data')} className={'flex-1 rounded-xl py-2 text-xs font-extrabold ' + (tab === 'data' ? 'bg-primary text-white' : 'bg-light text-muted')}>Details</button>
            <button onClick={() => setTab('slip')} className={'flex-1 rounded-xl py-2 text-xs font-extrabold ' + (tab === 'slip' ? 'bg-primary text-white' : 'bg-light text-muted')}>Basic Slip</button>
          </div>
          {tab === 'data' && (<>
            {photo && <img src={String(photo).startsWith('data:') ? String(photo) : 'data:image/jpeg;base64,' + String(photo)} alt="portrait" className="mx-auto h-28 w-28 rounded-full border-4 border-sky-700 object-cover" />}
            {fields.filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="rounded-xl bg-light p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{k}</p>
                <p className="mt-1 text-sm font-extrabold text-dark">{String(v)}</p>
              </div>
            ))}
          </>)}
          {tab === 'slip' && (
            <div className="rounded-xl border border-border bg-white p-4 text-[11px] text-dark">
              <p className="text-center font-bold">Please find below your Digital NIN Slip</p>
              <p className="text-center">You may cut it out of the paper, fold and laminate as desired.</p>
              <p className="text-center font-bold">For your security & privacy, please DO NOT permit others to photocopy this slip.</p>
              <div className="mt-3 border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-center">
                    <p className="text-sm font-extrabold">Federal Republic of Nigeria</p>
                    <p className="font-bold">Verified NIN Details</p>
                  </div>
                  <span className="text-xs font-extrabold text-green-700">NIMC</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1">
                  {SLIP_ROWS.map(([k, key]) => (<p key={k}><b>{k}:</b> {String(u[key] ?? u[key.replace(/_/g, '')] ?? '')}</p>))}
                </div>
                <p className="mt-3 text-center text-lg font-extrabold text-green-700">✓ Verified</p>
              </div>
              <button onClick={() => window.print()} className="mt-3 w-full rounded-xl bg-light py-2 text-xs font-extrabold text-dark">🖨 Print Slip</button>
            </div>
          )}
          {pdfBase64 && (<>
            <div className="rounded-xl bg-[#151f38] p-4 text-center">
              <p className="text-xs text-slate-300">PDF Slip Preview</p>
              <a href={'data:application/pdf;base64,' + pdfBase64} target="_blank" rel="noreferrer" className="mt-2 inline-block rounded-full bg-sky-400 px-8 py-3 text-sm font-extrabold text-slate-900">Open</a>
            </div>
            <button onClick={download} className="w-full rounded-xl bg-sky-700 py-4 text-sm font-extrabold text-white underline">⬇ Download PDF</button>
          </>)}
          <button onClick={() => openSlipPrint(u)} className="w-full rounded-xl bg-green-700 py-4 text-sm font-extrabold text-white">🖨 Download Official NIMC Slip (PDF)</button>
          <button onClick={onClose} className="w-full rounded-xl bg-light py-4 text-sm font-extrabold text-dark">✕ Close</button>
        </div>
      </div>
    </div>
  );
}

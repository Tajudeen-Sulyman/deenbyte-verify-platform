'use client';
import { openProviderPdf, openSlipFor } from '@/lib/slip-print';

export function NinSlipModal({ result, pdfBase64: pdfProp, slipType, onClose }: { result: any; pdfBase64?: string; slipType?: string; onClose: () => void }) {
  const u = result?.user_data ?? result?.data ?? result ?? {};
  const pdfBase64 = pdfProp ?? result?.pdf_base64 ?? result?.data?.pdf_base64 ?? result?.slip?.pdf_base64 ?? u?.pdf_base64;
  const photoRaw = u.photo ?? u.base64Image ?? u.passport_photo_base64 ?? u.photo_base64 ?? u.image ?? u.passport_photo ?? u.passportPhoto ?? u.photobase64;
  const photoSrc = photoRaw ? (String(photoRaw).startsWith('data:') ? String(photoRaw) : 'data:image/jpeg;base64,' + String(photoRaw)) : '';
  const fields: [string, any][] = [
    ['NIN', u.nin], ['FIRST NAME', u.first_name ?? u.firstname], ['MIDDLE NAME', u.middle_name ?? u.middlename],
    ['SURNAME', u.last_name ?? u.surname], ['GENDER', u.gender], ['DATE OF BIRTH', u.date_of_birth ?? u.birthdate],
    ['PHONE NUMBER', u.phone_number ?? u.phone ?? u.telephoneno ?? u.msisdn], ['ADDRESS', u.address ?? u.residence_address],
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div className="profile-pop max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-white px-4 py-3">
          <p className="flex items-center gap-2 text-base font-extrabold text-dark"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-xs text-white">✓</span>NIN Verification Successful</p>
          <button onClick={onClose} className="text-lg font-bold text-muted">✕</button>
        </div>
        <div className="space-y-3 p-4">
          {photoSrc && <img src={photoSrc} alt="portrait" className="mx-auto h-28 w-28 rounded-full border-4 border-sky-700 object-cover" />}
          {fields.filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="rounded-xl bg-light p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{k}</p>
              <p className="mt-1 text-sm font-extrabold text-dark">{String(v)}</p>
            </div>
          ))}
          {pdfBase64 && (
            <div className="space-y-2">
              <div className="rounded-xl bg-[#151f38] p-4 text-center">
                <p className="text-xs text-slate-300">PDF Slip Preview</p>
                <a href={'data:application/pdf;base64,' + pdfBase64} target="_blank" rel="noreferrer" className="mt-2 inline-block rounded-full bg-sky-400 px-8 py-3 text-sm font-extrabold text-slate-900">Open</a>
              </div>
              <button onClick={() => openProviderPdf(pdfBase64, 'NIN-slip-' + (u.nin ?? '') + '.pdf')} className="w-full rounded-xl bg-sky-700 py-4 text-sm font-extrabold text-white underline">⬇ Download PDF</button>
            </div>
          )}
          <button onClick={() => openSlipFor(result)} className="w-full rounded-xl bg-green-700 py-4 text-sm font-extrabold text-white">⬇ Download Slip (PDF)</button>
          <button onClick={onClose} className="w-full rounded-xl bg-light py-4 text-sm font-extrabold text-dark">✕ Close</button>
        </div>
      </div>
    </div>
  );
}

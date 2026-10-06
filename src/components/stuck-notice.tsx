export default function StuckNotice({ createdAt, status, reference }: { createdAt: string; status: string; reference: string }) {
  if (status !== 'pending' && status !== 'processing') return null;
  const hours = Math.floor((Date.now() - new Date(createdAt).getTime()) / 3600000);
  if (hours < 24) return null;
  const subject = encodeURIComponent('Request ' + reference);
  return (
    <div className="card3d border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      <p className="font-semibold">This is taking longer than usual</p>
      <p className="mt-1">
        It has been about {hours} hours. Please contact support and quote reference <b>{reference}</b>.
      </p>
      <a href={'mailto:deenbyte.technologies@gmail.com?subject=' + subject} className="mt-2 inline-block font-semibold underline">
        Email support
      </a>
    </div>
  );
}

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

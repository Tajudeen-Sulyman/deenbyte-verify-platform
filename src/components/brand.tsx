export function BrandLogo() {
  return (
    <span className="flex items-center gap-2">
      <img src="/logo.jpg" alt="DeenByte logo" className="h-9 w-9 rounded-xl object-cover shadow-md" />
      <span className="text-lg font-bold text-dark">
        DeenByte <span className="text-primary">Verify</span>
      </span>
    </span>
  );
}

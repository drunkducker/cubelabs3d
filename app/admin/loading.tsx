export default function AdminLoading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading admin data">
      <div className="mb-5 h-8 w-48 rounded-lg bg-white/10" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl border border-[var(--border)] bg-white/5" />
        ))}
      </div>
    </div>
  );
}

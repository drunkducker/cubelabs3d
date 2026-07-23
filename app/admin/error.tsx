"use client";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6 text-rose-100">
      <h2 className="text-lg font-black">Something went wrong in the admin dashboard</h2>
      <p className="mt-2 text-sm">
        The operation could not be completed. This is often a missing migration or an unconfigured service-role key.
        No partial changes were committed.
      </p>
      <button
        onClick={reset}
        className="mt-4 rounded-xl border border-rose-400/50 px-4 py-2 text-sm font-extrabold"
      >
        Try again
      </button>
    </div>
  );
}

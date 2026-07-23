import Link from "next/link";

/*
 * Not-authorized screen. Lives OUTSIDE the protected /admin layout so it can
 * render for signed-in non-admins (and for admins missing a specific
 * permission) without triggering the layout's requireAdmin() redirect loop.
 */
export const dynamic = "force-dynamic";

export default function AdminDeniedPage({ searchParams }: { searchParams: { reason?: string } }) {
  const permissionDenied = searchParams?.reason === "permission";
  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--bg)] px-6 text-center">
      <div className="max-w-md">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl border border-[var(--border)] text-3xl">⛔</div>
        <h1 className="text-2xl font-black">{permissionDenied ? "Insufficient permission" : "Administrator access required"}</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          {permissionDenied
            ? "Your administrator role does not include the permission needed for that page. If you believe this is a mistake, contact the site owner."
            : "This area is restricted to active Cube Labs administrators. Your account does not currently have access."}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-extrabold">Back to site</Link>
          <Link href="/profile" className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-extrabold text-[var(--muted)]">My profile</Link>
        </div>
      </div>
    </main>
  );
}

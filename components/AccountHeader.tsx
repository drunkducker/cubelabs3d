import Link from "next/link";

/**
 * Compact account-page header that visually matches the homepage brand mark.
 * The back link always returns users to the existing homepage without changing
 * the homepage layout or its interactive cube experience.
 */
export default function AccountHeader({ action }: { action?: React.ReactNode }) {
  return (
    <header className="mb-7 flex items-center justify-between gap-3">
      <Link href="/" className="flex min-w-0 items-center gap-[11px]" aria-label="Back to Cube Lab 3D home">
        <svg viewBox="0 0 48 48" aria-hidden="true" className="h-[42px] w-[42px] flex-none">
          <polygon points="24,3 43,13 24,23 5,13" fill="#f4f6f8" />
          <polygon points="5,13 24,23 24,45 5,35" fill="#1667e0" />
          <polygon points="24,23 43,13 43,35 24,45" fill="#e6352b" />
          <polygon points="24,3 33,8 14,18 5,13" fill="#ffd21f" />
        </svg>
        <div className="min-w-0">
          <div className="truncate text-[20px] font-extrabold leading-none">
            CUBE LAB <span className="text-[var(--blue)]">3D</span>
          </div>
          <div className="mt-1 truncate text-[9px] font-bold tracking-[2.1px] text-[var(--muted)]">
            SOLVE • LEARN • MASTER
          </div>
        </div>
      </Link>
      {action}
    </header>
  );
}

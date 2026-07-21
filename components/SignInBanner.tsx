"use client";
/* Optional account prompt that never blocks the solver. */
import { useToast } from "./Toast";
import { UserIcon } from "./icons";

export default function SignInBanner() {
  const toast = useToast();
  return (
    <div className="signin-surf mt-[18px] grid grid-cols-[auto_1fr] items-center gap-[13px] rounded-2xl p-4">
      <span className="grid h-12 w-12 place-items-center rounded-full border border-[rgba(46,166,255,0.4)] bg-[rgba(46,166,255,0.15)] text-[var(--blue)]">
        <UserIcon className="h-[26px] w-[26px]" />
      </span>
      <div>
        <div className="text-sm font-bold leading-[1.3]">Save your solves and sync across all your devices.</div>
        <div className="mt-[3px] text-xs text-[var(--muted)]">Sign in or continue as Guest.</div>
      </div>
      <div className="col-span-2 mt-0.5 flex items-center gap-3">
        <button onClick={() => toast("Continuing as Guest — no account needed.")} className="text-sm font-bold text-[var(--blue)]">Continue as Guest</button>
        <button onClick={() => toast("Sign in — coming soon")} className="cta-blue ml-auto flex-none rounded-[11px] px-[26px] py-[11px] text-sm font-bold">Sign In</button>
      </div>
    </div>
  );
}

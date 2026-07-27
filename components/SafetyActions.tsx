import { blockUser, reportUser, unblockUser } from "@/app/safety/actions";
import { REPORT_REASONS } from "@/lib/safety";

/*
 * Safety controls shown on another member's profile: block/unblock and a
 * report form. Built from plain <form>/<details> elements so it works without
 * client JavaScript; each form posts to a server action that enforces identity
 * and validation.
 */
export default function SafetyActions({
  targetId,
  slug,
  isBlocked,
  name,
}: {
  targetId: string;
  slug?: string;
  isBlocked: boolean;
  name: string;
}) {
  return (
    <section className="mt-4 rounded-[8px] border border-[var(--border)] bg-white/[.035] p-4">
      <h2 className="text-[18px] font-black text-white">Safety</h2>
      <p className="mt-1 text-sm leading-5 text-[var(--muted)]">
        Blocking removes {name} from your friends and hides them from your search and suggestions.
        Reports go to the moderation team.
      </p>

      <div className="mt-3 grid gap-2">
        {isBlocked ? (
          <form action={unblockUser}>
            <input type="hidden" name="target_id" value={targetId} />
            {slug ? <input type="hidden" name="slug" value={slug} /> : null}
            <button className="min-h-11 w-full rounded-[8px] border border-[var(--border-2)] bg-black/20 text-sm font-black text-white">
              Unblock {name}
            </button>
          </form>
        ) : (
          <details className="group rounded-[8px] border border-[var(--border-2)] bg-black/20">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center rounded-[8px] px-4 text-sm font-black text-white">
              Block {name}
            </summary>
            <form action={blockUser} className="grid gap-2 border-t border-[var(--border)] p-3">
              <input type="hidden" name="target_id" value={targetId} />
              {slug ? <input type="hidden" name="slug" value={slug} /> : null}
              <label className="grid gap-1">
                <span className="text-[11px] font-black uppercase tracking-[.12em] text-[var(--muted)]">
                  Reason (optional)
                </span>
                <input
                  name="reason"
                  maxLength={200}
                  placeholder="Only you can see this"
                  className="min-h-10 rounded-[8px] border border-[var(--border)] bg-black/30 px-3 text-sm font-semibold text-white outline-none"
                />
              </label>
              <button className="min-h-10 w-full rounded-[8px] bg-red-500/80 text-sm font-black text-white">
                Confirm block
              </button>
            </form>
          </details>
        )}

        <details className="group rounded-[8px] border border-[var(--border-2)] bg-black/20">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center rounded-[8px] px-4 text-sm font-black text-[var(--gold)]">
            Report {name}
          </summary>
          <form action={reportUser} className="grid gap-2 border-t border-[var(--border)] p-3">
            <input type="hidden" name="target_id" value={targetId} />
            {slug ? <input type="hidden" name="slug" value={slug} /> : null}
            <label className="grid gap-1">
              <span className="text-[11px] font-black uppercase tracking-[.12em] text-[var(--muted)]">Reason</span>
              <select
                name="reason"
                defaultValue="harassment"
                className="min-h-10 rounded-[8px] border border-[var(--border)] bg-black/30 px-3 text-sm font-semibold text-white outline-none"
              >
                {REPORT_REASONS.map((reason) => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-[11px] font-black uppercase tracking-[.12em] text-[var(--muted)]">
                Details (optional)
              </span>
              <textarea
                name="details"
                rows={3}
                maxLength={1000}
                placeholder="Add anything that helps the moderation team."
                className="rounded-[8px] border border-[var(--border)] bg-black/30 px-3 py-2 text-sm font-semibold text-white outline-none"
              />
            </label>
            <button className="min-h-10 w-full rounded-[8px] bg-[var(--gold)] text-sm font-black text-black">
              Submit report
            </button>
          </form>
        </details>
      </div>
    </section>
  );
}

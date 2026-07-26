import Link from "next/link";
import { requirePermission } from "@/lib/admin/auth";
import { ADMIN_TODO, todoCounts, type AdminTodoItem } from "@/lib/admin/todo";
import { Card, PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

/*
 * Admin capability roadmap. Living TODO surfaced inside the dashboard so an
 * operator can see at a glance what is shipped, what only has a data path,
 * and what is still to build — each with a link or a "what's needed" note.
 */
export default async function AdminTodoPage() {
  await requirePermission("admin.overview.read");
  const counts = todoCounts();

  return (
    <div>
      <PageHeader
        title="Admin roadmap"
        subtitle="Living checklist of what the dashboard covers. Status reflects code on this branch — production verification (migrations applied + browser-tested) remains an operator step."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <SummaryChip label="Done" value={counts.done} tone="ok" />
        <SummaryChip label="Partial" value={counts.partial} tone="warn" />
        <SummaryChip label="Pending" value={counts.pending} tone="pending" />
      </div>

      <Card>
        <ul className="grid gap-2">
          {ADMIN_TODO.map((item) => (
            <TodoRow key={item.id} item={item} />
          ))}
        </ul>
      </Card>
    </div>
  );
}

function SummaryChip({ label, value, tone }: { label: string; value: number; tone: "ok" | "warn" | "pending" }) {
  const cls = tone === "ok" ? "bg-emerald-500/15 text-emerald-400" : tone === "warn" ? "bg-amber-500/15 text-amber-400" : "bg-slate-500/15 text-slate-300";
  return (
    <span className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm">
      <span className={`rounded-full px-2 py-0.5 text-xs font-black uppercase ${cls}`}>{label}</span>
      <span className="font-black tabular-nums">{value}</span>
    </span>
  );
}

function TodoRow({ item }: { item: AdminTodoItem }) {
  const mark =
    item.status === "done" ? { char: "✓", cls: "bg-emerald-500/20 text-emerald-400" } :
    item.status === "partial" ? { char: "◐", cls: "bg-amber-500/20 text-amber-400" } :
    { char: "", cls: "border border-[var(--border-2)] text-[var(--faint)]" };

  const inner = (
    <div className="flex items-start gap-3">
      <span aria-hidden="true" className={`mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-full text-xs font-black ${mark.cls}`}>
        {mark.char}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block font-bold ${item.status === "done" ? "text-[var(--muted)] line-through decoration-[var(--faint)]" : ""}`}>
          {item.label}
        </span>
        <span className="mt-0.5 block text-xs text-[var(--muted)]">{item.note}</span>
      </span>
      {item.href && (
        <span className="mt-0.5 text-xs font-extrabold text-[var(--blue)] whitespace-nowrap">Open →</span>
      )}
    </div>
  );

  return (
    <li>
      {item.href ? (
        <Link href={item.href} className="block rounded-xl border border-[var(--border)] p-3 transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)]">
          {inner}
        </Link>
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--border-2)] p-3">{inner}</div>
      )}
    </li>
  );
}

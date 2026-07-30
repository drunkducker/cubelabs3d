import { requirePermission } from "@/lib/admin/auth";
import { hasPermission } from "@/lib/admin/permissions";
import { getPrivacyAdminData } from "@/lib/admin/privacy";
import { Card, Notice, PageHeader } from "@/components/admin/ui";
import {
  reviewAvatarAction,
  runPrivacyWorkerAction,
  updatePrivacyCaseAction,
} from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PrivacyAdminPage() {
  const ctx = await requirePermission("privacy.read");
  const data = await getPrivacyAdminData();
  const canManage = hasPermission(ctx.role, "privacy.manage");
  const canModerateAvatars = hasPermission(ctx.role, "avatars.moderate");
  const canDelete = hasPermission(ctx.role, "users.delete");

  return (
    <div>
      <PageHeader
        title="Privacy & avatars"
        subtitle="Verified privacy cases, statutory deadlines, parent and agent authority, appeals, export delivery, account lifecycle, and private avatar moderation."
      />

      {data.overdueCount ? (
        <div className="mb-4"><Notice tone="warning">{data.overdueCount} privacy case{data.overdueCount === 1 ? " is" : "s are"} past the recorded deadline.</Notice></div>
      ) : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Metric label="Open cases" value={data.cases.filter((row) => !["completed","denied"].includes(row.status)).length} />
        <Metric label="Pending avatars" value={data.avatars.length} />
        <Metric label="Overdue" value={data.overdueCount} />
      </div>

      {canDelete ? (
        <Card className="mb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-black">Owner worker control</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">Processes approved exports, anonymization, and hard deletion. Scheduled runs use the protected internal endpoint.</p>
            </div>
            <form action={runPrivacyWorkerAction}>
              <button className="min-h-11 rounded-xl border border-red-400/35 bg-red-500/10 px-4 text-sm font-black text-red-100">Run privacy worker</button>
            </form>
          </div>
        </Card>
      ) : null}

      <Card className="mb-4">
        <div className="mb-4">
          <h2 className="text-lg font-black">Avatar moderation queue</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Review files from the private bucket. Approval copies a static image into the public avatars bucket; rejection deletes the review object.</p>
        </div>
        {data.avatars.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.avatars.map((avatar) => (
              <article key={avatar.id} className="overflow-hidden rounded-xl border border-[var(--border)] bg-black/20">
                <div className="aspect-square bg-black/40">
                  {avatar.previewUrl ? <img src={avatar.previewUrl} alt="Pending avatar" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-sm font-bold text-[var(--muted)]">Preview unavailable</div>}
                </div>
                <div className="grid gap-3 p-4">
                  <div>
                    <p className="font-black">{avatar.profile?.display_name || "Unknown account"}</p>
                    <p className="text-xs text-[var(--muted)]">{avatar.profile?.cube_tag || avatar.user_id || "Deleted account"}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{avatar.mime_type} · {formatBytes(avatar.byte_size)} · {avatar.width || "?"}×{avatar.height || "?"}</p>
                  </div>
                  {canModerateAvatars ? (
                    <form action={reviewAvatarAction} className="grid gap-2">
                      <input type="hidden" name="submission_id" value={avatar.id} />
                      <textarea name="reason" rows={2} placeholder="Moderation note or rejection reason" className="rounded-lg border border-[var(--border)] bg-black/30 px-3 py-2 text-sm text-white" />
                      <div className="grid grid-cols-2 gap-2">
                        <button name="decision" value="approve" className="min-h-10 rounded-lg border border-green-400/30 bg-green-500/10 text-sm font-black text-green-100">Approve</button>
                        <button name="decision" value="reject" className="min-h-10 rounded-lg border border-red-400/30 bg-red-500/10 text-sm font-black text-red-100">Reject</button>
                      </div>
                    </form>
                  ) : <p className="text-xs font-bold text-[var(--muted)]">Read-only access.</p>}
                </div>
              </article>
            ))}
          </div>
        ) : <p className="text-sm text-[var(--muted)]">No avatars are waiting for review.</p>}
      </Card>

      <Card>
        <div className="mb-4">
          <h2 className="text-lg font-black">Privacy case queue</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Cases are ordered by deadline. Destructive approval and manual worker execution remain Owner-only.</p>
        </div>
        {data.cases.length ? (
          <div className="grid gap-4">
            {data.cases.map((request) => (
              <article key={request.id} className={`rounded-xl border p-4 ${request.overdue ? "border-red-400/45 bg-red-500/[.06]" : "border-[var(--border)] bg-black/20"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black capitalize">{request.request_type.replaceAll("_", " ")}</h3>
                      <Pill>{request.status.replaceAll("_", " ")}</Pill>
                      <Pill>{request.verification_status.replaceAll("_", " ")}</Pill>
                      {request.overdue ? <span className="rounded-full bg-red-500/20 px-2 py-1 text-[10px] font-black uppercase text-red-100">Overdue</span> : null}
                    </div>
                    <p className="mt-1 text-xs text-[var(--muted)]">Case {request.id}</p>
                  </div>
                  <div className="text-right text-xs text-[var(--muted)]">
                    <p>Created {formatDate(request.created_at)}</p>
                    <p>Due {request.effectiveDueAt ? formatDate(request.effectiveDueAt) : "not recorded"}</p>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <Info label="Account" value={request.profile?.display_name || request.subject_email || "Unresolved"} />
                  <Info label="Requester" value={`${request.requester_name || "Unknown"} (${request.requester_type.replaceAll("_", " ")})`} />
                  <Info label="Requester email" value={request.requester_email || request.requested_email || "None"} />
                  <Info label="Jurisdiction" value={request.jurisdiction || "Not supplied"} />
                </div>

                {request.relationship_to_subject ? <p className="mt-3 text-sm"><strong>Authority:</strong> {request.relationship_to_subject}</p> : null}
                {typeof request.payload?.details === "string" ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]"><strong className="text-white">Details:</strong> {request.payload.details}</p> : null}
                {request.evidenceUrl ? <a href={request.evidenceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-10 items-center rounded-lg border border-[var(--border-2)] px-3 text-xs font-black text-[var(--blue)]">Open private evidence</a> : null}
                {request.decision_reason ? <p className="mt-3 rounded-lg border border-[var(--border)] bg-black/20 p-3 text-sm"><strong>Recorded note:</strong> {request.decision_reason}</p> : null}
                {request.error_message ? <p className="mt-3 rounded-lg border border-red-400/25 bg-red-500/10 p-3 text-sm font-bold text-red-100">{request.error_message}</p> : null}

                {request.events.length ? (
                  <details className="mt-3 rounded-lg border border-[var(--border)] bg-black/20 p-3">
                    <summary className="cursor-pointer text-xs font-black uppercase tracking-[.12em] text-[var(--muted)]">Recent case events</summary>
                    <div className="mt-2 grid gap-2">
                      {request.events.map((event) => <p key={event.id} className="text-xs text-[var(--muted)]">{formatDate(event.created_at)} · {event.event_type.replaceAll("_", " ")} · {event.actor_type}</p>)}
                    </div>
                  </details>
                ) : null}

                {canManage ? (
                  <form action={updatePrivacyCaseAction} className="mt-4 grid gap-3 rounded-xl border border-[var(--border)] bg-black/25 p-3">
                    <input type="hidden" name="request_id" value={request.id} />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-2 text-xs font-black uppercase tracking-[.1em] text-[var(--muted)]">
                        Action
                        <select name="case_action" className="min-h-11 rounded-lg border border-[var(--border)] bg-[#080c15] px-3 text-sm font-black normal-case tracking-normal text-white">
                          <option value="verify_authority">Verify parent / agent authority</option>
                          <option value="request_information">Request more information</option>
                          <option value="extend_deadline">Extend deadline 30 days</option>
                          <option value="approve">Approve / apply correction</option>
                          <option value="deny">Deny with appeal rights</option>
                          <option value="complete">Mark completed</option>
                          {canDelete && ["close_account","delete_data","anonymize"].includes(request.request_type) ? <option value="approve_destructive">Owner approve deletion/anonymization</option> : null}
                        </select>
                      </label>
                      <label className="grid gap-2 text-xs font-black uppercase tracking-[.1em] text-[var(--muted)]">
                        Destructive mode
                        <select name="delete_mode" defaultValue={request.delete_mode || "full_delete"} className="min-h-11 rounded-lg border border-[var(--border)] bg-[#080c15] px-3 text-sm font-black normal-case tracking-normal text-white">
                          <option value="full_delete">Full deletion</option>
                          <option value="anonymize">Anonymize retained solve history</option>
                        </select>
                      </label>
                    </div>
                    <textarea name="reason" rows={3} placeholder="Decision, authority finding, deadline reason, or instructions" className="rounded-lg border border-[var(--border)] bg-black/30 px-3 py-2 text-sm text-white" />
                    <button className="min-h-11 rounded-lg border border-[var(--border-2)] bg-white/5 text-sm font-black">Apply case action</button>
                  </form>
                ) : <p className="mt-3 text-xs font-bold text-[var(--muted)]">Read-only privacy access.</p>}
              </article>
            ))}
          </div>
        ) : <p className="text-sm text-[var(--muted)]">No privacy cases have been created.</p>}
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-[var(--border)] bg-white/[.035] p-4"><p className="text-xs font-black uppercase tracking-[.12em] text-[var(--muted)]">{label}</p><p className="mt-1 text-3xl font-black">{value}</p></div>;
}
function Pill({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-[var(--border-2)] bg-white/5 px-2 py-1 text-[10px] font-black uppercase tracking-[.08em] text-[var(--blue)]">{children}</span>;
}
function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[10px] font-black uppercase tracking-[.1em] text-[var(--muted)]">{label}</p><p className="mt-1 break-words font-bold">{value}</p></div>;
}
function formatDate(value: string) {
  return new Date(value).toLocaleString();
}
function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

import { getAccessToken, supabaseRequest } from "@/app/lib/supabase-rest";

/*
 * Server-side application service for the first tracked challenge flow.
 *
 * Visual pages and client components should call local API routes, and those
 * routes should call this service. Keeping Supabase REST details here protects
 * the architecture rule that UI code does not become tied to one provider.
 *
 * Current prototype boundary:
 * - solve rows are written to the existing solve_results table;
 * - challenge rows use the existing Cube ID platform migration;
 * - anti-cheat, public leaderboard ranking, and durable validation columns are
 *   still future work documented in ADR 0002 and SOCIAL-AND-MULTIPLAYER.md.
 */

type AuthUser = { id: string; email?: string };

export type SolvePayload = {
  puzzle_type?: string;
  scramble?: string;
  solve_time_ms?: number | null;
  move_count?: number | null;
  solved?: boolean;
  is_dnf?: boolean;
  replay_data?: unknown;
};

type Profile = {
  id: string;
  username?: string | null;
  display_name?: string | null;
  cube_tag?: string | null;
  public_slug?: string | null;
};

type ChallengeRow = {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  puzzle_type: string;
  scramble: string;
  sender_solve_id: string | null;
  sender_time_ms: number | null;
  recipient_solve_id: string | null;
  status: string;
  message: string | null;
  share_token: string;
  created_at: string;
  completed_at: string | null;
};

export type ChallengeView = ChallengeRow & {
  sender_name: string;
  recipient_name: string;
};

type CreateChallengePayload = {
  recipient?: string;
  puzzle_type?: string;
  scramble?: string;
  sender_solve_id?: string | null;
  sender_time_ms?: number | null;
  message?: string;
};

function requireString(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required.`);
  }
  return value.trim();
}

function displayName(profile: Profile | undefined, fallback = "Cube Solver") {
  return profile?.display_name || profile?.username || profile?.cube_tag || fallback;
}

function challengeSelect() {
  return [
    "id",
    "sender_id",
    "recipient_id",
    "puzzle_type",
    "scramble",
    "sender_solve_id",
    "sender_time_ms",
    "recipient_solve_id",
    "status",
    "message",
    "share_token",
    "created_at",
    "completed_at",
  ].join(",");
}

async function getCurrentUser(token: string) {
  return supabaseRequest<AuthUser>("/auth/v1/user", {}, token);
}

async function getProfilesById(token: string, ids: string[]) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (!uniqueIds.length) return new Map<string, Profile>();

  const rows = await supabaseRequest<Profile[]>(
    `/rest/v1/profiles?id=in.(${uniqueIds.join(",")})&select=id,username,display_name,cube_tag,public_slug`,
    {},
    token,
  );

  return new Map(rows.map((profile) => [profile.id, profile]));
}

async function resolveRecipient(token: string, senderId: string, recipientInput: string) {
  const recipient = recipientInput.trim().replace(/[(),]/g, "");
  if (!recipient) throw new Error("Recipient account is required.");

  /*
   * Prototype lookup is intentionally exact-match only. It keeps accidental
   * sends low while the friend picker, duplicate-name handling, blocking,
   * rate limits, and moderation screens are not built yet.
   */
  const exactFilter = encodeURIComponent(
    `(cube_tag.eq.${recipient},username.eq.${recipient},public_slug.eq.${recipient})`,
  );
  const matches = await supabaseRequest<Profile[]>(
    `/rest/v1/profiles?select=id,username,display_name,cube_tag,public_slug&or=${exactFilter}&limit=2`,
    {},
    token,
  );

  if (!matches.length) throw new Error("No matching Cube Labs account found.");
  const match = matches[0];
  if (match.id === senderId) throw new Error("Pick another account, not your own.");
  return match;
}

export async function saveSolveResult(token: string, userId: string, payload: SolvePayload) {
  const puzzleType = requireString(payload.puzzle_type, "puzzle_type");
  const scramble = requireString(payload.scramble, "scramble");

  /*
   * This function accepts replay_data because the current schema has no
   * top-level assistance/test columns yet. Manual complete-time overrides and
   * touch/button/undo tracking are stored there for the prototype, then must
   * be promoted into explicit columns before public leaderboards trust them.
   */
  const rows = await supabaseRequest<Array<{ id: string }>>(
    "/rest/v1/solve_results?select=id",
    {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        user_id: userId,
        puzzle_type: puzzleType,
        scramble,
        solve_time_ms: payload.solve_time_ms ?? null,
        move_count: payload.move_count ?? null,
        solved: payload.solved ?? false,
        is_dnf: payload.is_dnf ?? false,
        replay_data: payload.replay_data ?? null,
      }),
    },
    token,
  );

  const solveId = rows[0]?.id;
  if (!solveId) throw new Error("Solve was saved without a returned id.");
  return solveId;
}

export async function createChallengeForRecipient(payload: CreateChallengePayload) {
  const token = getAccessToken();
  if (!token) throw new Error("Sign in required.");

  const sender = await getCurrentUser(token);
  const recipient = await resolveRecipient(token, sender.id, requireString(payload.recipient, "recipient"));
  const puzzleType = payload.puzzle_type || "3x3";
  const scramble = requireString(payload.scramble, "scramble");

  /*
   * Player-chosen scrambles are saved directly on the challenge row for this
   * prototype. The future ranked scramble library should normalize this into
   * reusable scrambles plus attempt rows, so one good scramble can collect
   * many players' results without duplicating the text on every challenge.
   */
  const rows = await supabaseRequest<Array<{ id: string }>>(
    "/rest/v1/challenges?select=id",
    {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        sender_id: sender.id,
        recipient_id: recipient.id,
        puzzle_type: puzzleType,
        scramble,
        sender_solve_id: payload.sender_solve_id ?? null,
        sender_time_ms: payload.sender_time_ms ?? null,
        status: "pending",
        message: payload.message?.slice(0, 220) ?? null,
      }),
    },
    token,
  );

  return {
    id: rows[0]?.id,
    recipient_name: displayName(recipient),
  };
}

export async function getChallengeForCurrentUser(challengeId: string) {
  const token = getAccessToken();
  if (!token) throw new Error("Sign in required.");

  const user = await getCurrentUser(token);
  const rows = await supabaseRequest<ChallengeRow[]>(
    `/rest/v1/challenges?id=eq.${challengeId}&select=${challengeSelect()}&limit=1`,
    {},
    token,
  );
  const challenge = rows[0];
  /*
   * The challenge page is private for now: only the sender or exact recipient
   * may load it. Public share tokens and guest attempts need their own access
   * model so private account challenge rows are not exposed by accident.
   */
  if (!challenge || ![challenge.sender_id, challenge.recipient_id].includes(user.id)) {
    throw new Error("Challenge not found for this account.");
  }

  const profiles = await getProfilesById(token, [challenge.sender_id, challenge.recipient_id ?? ""]);
  return {
    ...challenge,
    sender_name: displayName(profiles.get(challenge.sender_id), "Challenger"),
    recipient_name: displayName(profiles.get(challenge.recipient_id ?? ""), "Opponent"),
  };
}

export async function listChallengesForCurrentUser() {
  const token = getAccessToken();
  if (!token) throw new Error("Sign in required.");

  const user = await getCurrentUser(token);
  const rows = await supabaseRequest<ChallengeRow[]>(
    `/rest/v1/challenges?or=${encodeURIComponent(`(sender_id.eq.${user.id},recipient_id.eq.${user.id})`)}&select=${challengeSelect()}&order=created_at.desc&limit=40`,
    {},
    token,
  );
  const profiles = await getProfilesById(token, rows.flatMap((row) => [row.sender_id, row.recipient_id ?? ""]));

  return rows.map((row) => ({
    ...row,
    sender_name: displayName(profiles.get(row.sender_id), "Challenger"),
    recipient_name: displayName(profiles.get(row.recipient_id ?? ""), "Opponent"),
  }));
}

export async function submitChallengeAttempt(challengeId: string, payload: SolvePayload) {
  const token = getAccessToken();
  if (!token) throw new Error("Sign in required.");

  const user = await getCurrentUser(token);
  const rows = await supabaseRequest<ChallengeRow[]>(
    `/rest/v1/challenges?id=eq.${challengeId}&select=${challengeSelect()}&limit=1`,
    {},
    token,
  );
  const challenge = rows[0];
  if (!challenge || ![challenge.sender_id, challenge.recipient_id].includes(user.id)) {
    throw new Error("Challenge not found for this account.");
  }

  const solveId = await saveSolveResult(token, user.id, payload);
  const isSender = user.id === challenge.sender_id;
  /*
   * Existing schema stores sender_time_ms but not recipient_time_ms, so the
   * recipient's detailed result currently lives in the linked solve_results
   * row. Add explicit result-summary columns before building comparison cards
   * or production leaderboard snapshots from challenge rows.
   */
  const update = isSender
    ? { sender_solve_id: solveId, sender_time_ms: payload.solve_time_ms ?? null }
    : { recipient_solve_id: solveId, status: "completed", completed_at: new Date().toISOString() };

  await supabaseRequest<ChallengeRow[]>(
    `/rest/v1/challenges?id=eq.${challengeId}&select=id`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(update),
    },
    token,
  );

  return { solve_id: solveId };
}

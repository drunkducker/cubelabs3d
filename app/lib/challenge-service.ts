import { getAccessToken, supabaseRequest } from "@/app/lib/supabase-rest";

/*
 * Server-side application service for tracked solves, reusable scrambles, and
 * account-to-account challenges.
 *
 * The database now separates three ideas that were previously bundled together:
 * - scrambles: the reusable 3x3 start state a player chose or received;
 * - solve_results: the user's private/account solve row;
 * - scramble_attempts: the rankable public attempt against that scramble.
 *
 * Replay data is still stored for audit/debugging, but leaderboard-critical
 * fields are promoted into columns so test/admin overrides can be excluded by
 * a normal query instead of JSON archaeology.
 */

type AuthUser = { id: string; email?: string };

export type SolvePayload = {
  puzzle_type?: string;
  scramble?: string;
  scramble_id?: string | null;
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

type ScrambleRow = {
  id: string;
};

type ChallengeRow = {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  puzzle_type: string;
  scramble: string;
  scramble_id: string | null;
  sender_solve_id: string | null;
  sender_time_ms: number | null;
  creator_move_count: number | null;
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
  move_count?: number | null;
  message?: string;
};

type SaveContext = {
  challengeId?: string | null;
  source?: "play" | "leaderboard" | "challenge" | "solver" | "admin" | "import";
};

type TrackingColumns = {
  source: "play" | "leaderboard" | "challenge" | "solver" | "admin" | "import";
  leaderboard_eligible: boolean;
  is_test_data: boolean;
  manual_time_override: boolean;
  manual_tracking_override: boolean;
  actual_time_ms: number | null;
  actual_move_count: number | null;
  actual_undo_count: number | null;
  actual_touch_moves: number | null;
  actual_button_moves: number | null;
  reported_undo_count: number | null;
  reported_touch_moves: number | null;
  reported_button_moves: number | null;
  assistance_flags: Record<string, unknown>;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null;
}

function asBoolean(value: unknown) {
  return typeof value === "boolean" ? value : false;
}

function nestedRecord(root: Record<string, unknown>, key: string) {
  const value = root[key];
  return isRecord(value) ? value : {};
}

function normalizeSolveSource(value: unknown, fallback: TrackingColumns["source"] = "play") {
  if (value === "leaderboard-daily") return "leaderboard";
  if (value === "direct-challenge") return "challenge";
  if (value === "play" || value === "leaderboard" || value === "challenge" || value === "solver" || value === "admin" || value === "import") {
    return value;
  }
  return fallback;
}

function scrambleSourceFor(source: TrackingColumns["source"], replay: Record<string, unknown>, scramble: string) {
  if (source === "leaderboard" && replay.official_scramble === scramble) return "daily";
  if (source === "challenge") return "challenge";
  if (source === "solver") return "solver";
  if (source === "admin" || source === "import") return source;
  return "player";
}

function trackingFromPayload(payload: SolvePayload, context: SaveContext = {}): TrackingColumns {
  const replay = isRecord(payload.replay_data) ? payload.replay_data : {};
  const actual = nestedRecord(replay, "actual_metrics");
  const reported = nestedRecord(replay, "reported_metrics");
  const assistance = nestedRecord(replay, "assistance_flags");
  const source = normalizeSolveSource(replay.source, context.source ?? "play");
  const manualTimeOverride = asBoolean(replay.manual_time_override);
  const manualTrackingOverride = asBoolean(replay.manual_tracking_override);
  const isTestData =
    asBoolean(replay.is_test_data) ||
    asBoolean(replay.test_solved_override) ||
    manualTimeOverride ||
    manualTrackingOverride;
  const isDnf = payload.is_dnf ?? false;
  const solved = payload.solved ?? false;

  return {
    source,
    leaderboard_eligible: solved && !isDnf && !isTestData && !manualTimeOverride && !manualTrackingOverride,
    is_test_data: isTestData,
    manual_time_override: manualTimeOverride,
    manual_tracking_override: manualTrackingOverride,
    actual_time_ms: asNumber(replay.client_elapsed_ms),
    actual_move_count: asNumber(actual.move_count),
    actual_undo_count: asNumber(actual.undo_uses),
    actual_touch_moves: asNumber(actual.touch_moves),
    actual_button_moves: asNumber(actual.button_moves),
    reported_undo_count: asNumber(reported.undo_uses),
    reported_touch_moves: asNumber(reported.touch_moves),
    reported_button_moves: asNumber(reported.button_moves),
    assistance_flags: assistance,
  };
}

function challengeSelect() {
  return [
    "id",
    "sender_id:creator_id",
    "recipient_id",
    "puzzle_type",
    "scramble",
    "scramble_id",
    "sender_solve_id:creator_solve_id",
    "sender_time_ms:creator_time_ms",
    "creator_move_count",
    "recipient_solve_id",
    "status",
    "message",
    "share_token:share_code",
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
   * rate limits, and moderation screens are still coming together.
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

async function findScramble(token: string, puzzleType: string, scramble: string) {
  const params = new URLSearchParams();
  params.set("puzzle_type", `eq.${puzzleType}`);
  params.set("scramble", `eq.${scramble}`);
  params.set("select", "id");
  params.set("limit", "1");

  const rows = await supabaseRequest<ScrambleRow[]>(`/rest/v1/scrambles?${params.toString()}`, {}, token);
  return rows[0]?.id ?? null;
}

async function ensureScramble(
  token: string,
  userId: string,
  puzzleType: string,
  scramble: string,
  tracking: TrackingColumns,
  visibility: "public" | "link" | "private" = "public",
) {
  const existing = await findScramble(token, puzzleType, scramble);
  if (existing) return existing;

  try {
    const rows = await supabaseRequest<ScrambleRow[]>(
      "/rest/v1/scrambles?select=id",
      {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          puzzle_type: puzzleType,
          scramble,
          source: scrambleSourceFor(tracking.source, {}, scramble),
          visibility,
          created_by: userId,
          metadata: { first_seen_from: tracking.source },
        }),
      },
      token,
    );
    return rows[0]?.id ?? null;
  } catch (error) {
    const retry = await findScramble(token, puzzleType, scramble);
    if (retry) return retry;
    throw error;
  }
}

async function insertScrambleAttempt(
  token: string,
  userId: string,
  payload: SolvePayload,
  scrambleId: string,
  solveId: string,
  tracking: TrackingColumns,
  context: SaveContext = {},
) {
  await supabaseRequest<Array<{ id: string }>>(
    "/rest/v1/scramble_attempts?select=id",
    {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        scramble_id: scrambleId,
        user_id: userId,
        solve_result_id: solveId,
        challenge_id: context.challengeId ?? null,
        source: tracking.source,
        visibility: "public",
        solve_time_ms: payload.solve_time_ms ?? null,
        move_count: payload.move_count ?? null,
        solved: payload.solved ?? false,
        is_dnf: payload.is_dnf ?? false,
        leaderboard_eligible: tracking.leaderboard_eligible,
        is_test_data: tracking.is_test_data,
        manual_time_override: tracking.manual_time_override,
        manual_tracking_override: tracking.manual_tracking_override,
        actual_time_ms: tracking.actual_time_ms,
        actual_move_count: tracking.actual_move_count,
        actual_undo_count: tracking.actual_undo_count,
        actual_touch_moves: tracking.actual_touch_moves,
        actual_button_moves: tracking.actual_button_moves,
        reported_undo_count: tracking.reported_undo_count,
        reported_touch_moves: tracking.reported_touch_moves,
        reported_button_moves: tracking.reported_button_moves,
        assistance_flags: tracking.assistance_flags,
        replay_data: payload.replay_data ?? null,
      }),
    },
    token,
  );
}

export async function saveSolveResult(
  token: string,
  userId: string,
  payload: SolvePayload,
  context: SaveContext = {},
) {
  const puzzleType = requireString(payload.puzzle_type, "puzzle_type");
  const scramble = requireString(payload.scramble, "scramble");
  const tracking = trackingFromPayload(payload, context);
  const scrambleId =
    payload.scramble_id ||
    (await ensureScramble(token, userId, puzzleType, scramble, tracking, context.challengeId ? "link" : "public"));

  const rows = await supabaseRequest<Array<{ id: string }>>(
    "/rest/v1/solve_results?select=id",
    {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        user_id: userId,
        puzzle_type: puzzleType,
        scramble,
        scramble_id: scrambleId,
        source: tracking.source,
        solve_time_ms: payload.solve_time_ms ?? null,
        move_count: payload.move_count ?? null,
        solved: payload.solved ?? false,
        is_dnf: payload.is_dnf ?? false,
        leaderboard_eligible: tracking.leaderboard_eligible,
        is_test_data: tracking.is_test_data,
        manual_time_override: tracking.manual_time_override,
        manual_tracking_override: tracking.manual_tracking_override,
        actual_time_ms: tracking.actual_time_ms,
        actual_move_count: tracking.actual_move_count,
        actual_undo_count: tracking.actual_undo_count,
        actual_touch_moves: tracking.actual_touch_moves,
        actual_button_moves: tracking.actual_button_moves,
        reported_undo_count: tracking.reported_undo_count,
        reported_touch_moves: tracking.reported_touch_moves,
        reported_button_moves: tracking.reported_button_moves,
        assistance_flags: tracking.assistance_flags,
        replay_data: payload.replay_data ?? null,
      }),
    },
    token,
  );

  const solveId = rows[0]?.id;
  if (!solveId) throw new Error("Solve was saved without a returned id.");

  if (scrambleId) {
    await insertScrambleAttempt(token, userId, payload, scrambleId, solveId, tracking, context);
  }

  return { solveId, scrambleId, tracking };
}

export async function createChallengeForRecipient(payload: CreateChallengePayload) {
  const token = getAccessToken();
  if (!token) throw new Error("Sign in required.");

  const sender = await getCurrentUser(token);
  const recipient = await resolveRecipient(token, sender.id, requireString(payload.recipient, "recipient"));
  const puzzleType = payload.puzzle_type || "3x3";
  const scramble = requireString(payload.scramble, "scramble");
  const tracking = trackingFromPayload({
    puzzle_type: puzzleType,
    scramble,
    solve_time_ms: payload.sender_time_ms,
    move_count: payload.move_count,
    solved: Boolean(payload.sender_solve_id || payload.sender_time_ms != null),
    is_dnf: false,
  }, { source: "challenge" });
  const scrambleId = await ensureScramble(token, sender.id, puzzleType, scramble, tracking, "link");

  const rows = await supabaseRequest<Array<{ id: string }>>(
    "/rest/v1/challenges?select=id",
    {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        creator_id: sender.id,
        sender_id: sender.id,
        recipient_id: recipient.id,
        puzzle_type: puzzleType,
        scramble,
        scramble_id: scrambleId,
        creator_solve_id: payload.sender_solve_id ?? null,
        creator_solved: Boolean(payload.sender_solve_id || payload.sender_time_ms != null),
        creator_time_ms: payload.sender_time_ms ?? null,
        creator_move_count: payload.move_count ?? null,
        sender_time_ms: payload.sender_time_ms ?? null,
        status: "open",
        visibility: "link",
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
  const filter = encodeURIComponent(`(creator_id.eq.${user.id},sender_id.eq.${user.id},recipient_id.eq.${user.id})`);
  const rows = await supabaseRequest<ChallengeRow[]>(
    `/rest/v1/challenges?or=${filter}&select=${challengeSelect()}&order=created_at.desc&limit=40`,
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

  const saved = await saveSolveResult(token, user.id, payload, { challengeId, source: "challenge" });
  const tracking = saved.tracking;

  const attemptRows = await supabaseRequest<Array<{ id: string }>>(
    "/rest/v1/challenge_attempts?select=id",
    {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        challenge_id: challengeId,
        user_id: user.id,
        solve_result_id: saved.solveId,
        scramble_id: saved.scrambleId,
        source: "challenge",
        solve_time_ms: payload.solve_time_ms ?? null,
        move_count: payload.move_count ?? null,
        solved: payload.solved ?? false,
        is_dnf: payload.is_dnf ?? false,
        leaderboard_eligible: tracking.leaderboard_eligible,
        is_test_data: tracking.is_test_data,
        manual_time_override: tracking.manual_time_override,
        manual_tracking_override: tracking.manual_tracking_override,
        actual_time_ms: tracking.actual_time_ms,
        actual_move_count: tracking.actual_move_count,
        actual_undo_count: tracking.actual_undo_count,
        actual_touch_moves: tracking.actual_touch_moves,
        actual_button_moves: tracking.actual_button_moves,
        reported_undo_count: tracking.reported_undo_count,
        reported_touch_moves: tracking.reported_touch_moves,
        reported_button_moves: tracking.reported_button_moves,
        assistance_flags: tracking.assistance_flags,
        replay_data: payload.replay_data ?? null,
      }),
    },
    token,
  );
  const challengeAttemptId = attemptRows[0]?.id ?? null;

  if (challengeAttemptId) {
    await supabaseRequest<Array<{ id: string }>>(
      `/rest/v1/scramble_attempts?solve_result_id=eq.${saved.solveId}&select=id`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ challenge_attempt_id: challengeAttemptId }),
      },
      token,
    );
  }

  const isSender = user.id === challenge.sender_id;
  const update = isSender
    ? {
        creator_solve_id: saved.solveId,
        creator_solved: payload.solved ?? false,
        creator_time_ms: payload.solve_time_ms ?? null,
        creator_move_count: payload.move_count ?? null,
        sender_time_ms: payload.solve_time_ms ?? null,
      }
    : {
        recipient_solve_id: saved.solveId,
        status: "completed",
        completed_at: new Date().toISOString(),
      };

  await supabaseRequest<ChallengeRow[]>(
    `/rest/v1/challenges?id=eq.${challengeId}&select=id`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(update),
    },
    token,
  );

  return { solve_id: saved.solveId, scramble_id: saved.scrambleId, challenge_attempt_id: challengeAttemptId };
}

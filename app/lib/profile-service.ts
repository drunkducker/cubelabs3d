import { getAccessToken, supabaseRequest } from "@/app/lib/supabase-rest";

type AuthUser = { id: string; email?: string };

export type ProfileProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  cube_tag: string | null;
  public_slug: string | null;
  avatar_url: string | null;
  title: string | null;
  bio: string | null;
  favorite_puzzle: string | null;
  country_code: string | null;
  region: string | null;
  profile_visibility: string | null;
  show_location: boolean | null;
  show_collection: boolean | null;
  show_activity: boolean | null;
  account_status?: string | null;
  privacy_export_requested_at?: string | null;
  account_closure_requested_at?: string | null;
  created_at: string;
};

export type ProfileSolve = {
  id: string;
  puzzle_type: string;
  scramble: string | null;
  solve_time_ms: number | null;
  move_count: number | null;
  solved: boolean;
  is_dnf: boolean;
  leaderboard_eligible?: boolean | null;
  is_test_data?: boolean | null;
  manual_time_override?: boolean | null;
  manual_tracking_override?: boolean | null;
  source?: string | null;
  actual_move_count?: number | null;
  actual_undo_count?: number | null;
  actual_touch_moves?: number | null;
  actual_button_moves?: number | null;
  created_at: string;
};

export type ProfileStats = {
  total_solves: number;
  solved_count: number;
  current_streak: number;
  longest_streak: number;
  best_times: Record<string, number | string | null>;
  averages: Record<string, number | string | null>;
};

export type ProfileCollectionItem = {
  id: string;
  brand: string | null;
  model: string;
  nickname: string | null;
  puzzle_type: string;
  image_url: string | null;
  rating?: number | null;
  notes?: string | null;
  is_favorite: boolean;
  acquired_at?: string | null;
  created_at?: string | null;
};

export type ProfileAchievement = {
  achievement_id: string;
  unlocked_at: string;
  progress?: Record<string, unknown> | null;
  achievements?: {
    id?: string;
    name: string;
    description?: string | null;
    icon: string | null;
    category?: string | null;
    points?: number | null;
    sort_order?: number | null;
  } | null;
};

export type AchievementCatalogItem = {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  category: string;
  points: number;
  sort_order: number;
};

export type ProfileChallenge = {
  id: string;
  creator_id?: string | null;
  sender_id?: string | null;
  recipient_id?: string | null;
  puzzle_type: string;
  status: string;
  scramble: string | null;
  message: string | null;
  sender_time_ms: number | null;
  creator_time_ms: number | null;
  creator_move_count?: number | null;
  recipient_solve_id?: string | null;
  completed_at?: string | null;
  created_at: string;
};

type FriendshipRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type ProfileFriend = FriendshipRow & {
  friend_id: string;
  direction: "incoming" | "outgoing";
  friend: Pick<ProfileProfile, "id" | "username" | "display_name" | "cube_tag" | "public_slug" | "avatar_url" | "title"> | null;
};

export type ProfileSuggestion = {
  user_id: string;
  profile: Pick<ProfileProfile, "id" | "username" | "display_name" | "cube_tag" | "public_slug" | "avatar_url" | "title" | "favorite_puzzle" | "country_code" | "region">;
  score: number;
  reason: string;
  puzzle_type: string;
  best_time_ms: number | null;
  time_gap_ms: number | null;
  shared_scramble_count: number;
  total_solves: number;
};

export type AccountPrivacyRequest = {
  id: string;
  request_type: "export" | "close_account" | "delete_data";
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  requested_email: string | null;
  export_before_delete: boolean;
  created_at: string;
  completed_at: string | null;
  error_message: string | null;
};

export type NotificationPreferences = {
  email_account: boolean;
  email_security: boolean;
  email_friend_requests: boolean;
  email_challenges: boolean;
  email_achievements: boolean;
  email_product_updates: boolean;
  email_marketing: boolean;
  push_enabled: boolean;
};

export type ProfileRankSummary = {
  rank: number | null;
  total: number;
  best_time_ms: number | null;
  percentile: number | null;
  source: "scramble_attempts" | "solve_results" | "none";
  capped: boolean;
};

export type ProfileDashboardData = {
  user: AuthUser;
  profile?: ProfileProfile;
  solves: ProfileSolve[];
  stats?: ProfileStats;
  collection: ProfileCollectionItem[];
  achievements: ProfileAchievement[];
  challenges: ProfileChallenge[];
  friends: ProfileFriend[];
  suggestions: ProfileSuggestion[];
  rank: ProfileRankSummary;
};

const PROFILE_SELECT = [
  "id",
  "username",
  "display_name",
  "cube_tag",
  "public_slug",
  "avatar_url",
  "title",
  "bio",
  "favorite_puzzle",
  "country_code",
  "region",
  "profile_visibility",
  "show_location",
  "show_collection",
  "show_activity",
  "account_status",
  "privacy_export_requested_at",
  "account_closure_requested_at",
  "created_at",
].join(",");

const SOLVE_SELECT = [
  "id",
  "puzzle_type",
  "scramble",
  "solve_time_ms",
  "move_count",
  "solved",
  "is_dnf",
  "leaderboard_eligible",
  "is_test_data",
  "manual_time_override",
  "manual_tracking_override",
  "source",
  "actual_move_count",
  "actual_undo_count",
  "actual_touch_moves",
  "actual_button_moves",
  "created_at",
].join(",");

export const previewSolves: ProfileSolve[] = [
  {
    id: "preview-3x3-a",
    puzzle_type: "3x3",
    scramble: "R U R' U R' F R F'",
    solve_time_ms: 24180,
    move_count: 52,
    solved: true,
    is_dnf: false,
    created_at: "2026-07-22T11:42:00-04:00",
  },
  {
    id: "preview-4x4",
    puzzle_type: "4x4",
    scramble: "R U2 R' U2 L F2 U' L' U2",
    solve_time_ms: 95620,
    move_count: 116,
    solved: true,
    is_dnf: false,
    created_at: "2026-07-22T10:37:00-04:00",
  },
  {
    id: "preview-3x3-b",
    puzzle_type: "3x3",
    scramble: "F R U R' U' F'",
    solve_time_ms: 20910,
    move_count: 39,
    solved: true,
    is_dnf: false,
    created_at: "2026-07-22T09:15:00-04:00",
  },
  {
    id: "preview-2x2",
    puzzle_type: "2x2",
    scramble: "R U R' U'",
    solve_time_ms: 9710,
    move_count: 18,
    solved: true,
    is_dnf: false,
    created_at: "2026-07-21T20:58:00-04:00",
  },
];

export const previewCubes: ProfileCollectionItem[] = [
  { id: "preview-gan13", brand: "GAN", model: "GAN 13 Maglev", nickname: "Default", puzzle_type: "3x3", image_url: null, is_favorite: true },
  { id: "preview-yj4", brand: "YJ MGC", model: "YJ MGC 4x4", nickname: "Main", puzzle_type: "4x4", image_url: null, is_favorite: true },
  { id: "preview-gan2", brand: "GAN", model: "GAN 251 M", nickname: "Pocket Cube", puzzle_type: "2x2", image_url: null, is_favorite: true },
];

export const previewAchievements = [
  { id: "first-solve", name: "First Solve", icon: "rocket", date: "Jan 2026", tone: "purple" },
  { id: "speed-demon", name: "Speed Demon", icon: "timer", date: "Feb 2026", tone: "blue" },
  { id: "streak-master", name: "Streak Master", icon: "fire", date: "Apr 2026", tone: "red" },
  { id: "hundred-solves", name: "100 Solves", icon: "trophy", date: "May 2026", tone: "gold" },
  { id: "all-cubes", name: "All Cubes", icon: "cube", date: "Jun 2026", tone: "green" },
];

export async function safeProfileRequest<T>(request: Promise<T>, fallback: T): Promise<T> {
  try {
    return await request;
  } catch {
    return fallback;
  }
}

export async function requireProfileSession() {
  const token = getAccessToken();
  if (!token) throw new Error("Sign in required.");

  try {
    const user = await supabaseRequest<AuthUser>("/auth/v1/user", {}, token);
    return { token, user };
  } catch {
    throw new Error("Session expired.");
  }
}

export async function getProfileById(token: string | null, userId: string) {
  const rows = await supabaseRequest<ProfileProfile[]>(
    `/rest/v1/profiles?id=eq.${userId}&select=${PROFILE_SELECT}&limit=1`,
    {},
    token,
  );
  return rows[0];
}

export async function getProfileSolves(token: string | null, userId: string, limit = 40) {
  return supabaseRequest<ProfileSolve[]>(
    `/rest/v1/solve_results?user_id=eq.${userId}&select=${SOLVE_SELECT}&order=created_at.desc&limit=${limit}`,
    {},
    token,
  );
}

export async function getProfileStats(token: string | null, userId: string) {
  const rows = await supabaseRequest<ProfileStats[]>(
    `/rest/v1/user_stats?user_id=eq.${userId}&select=total_solves,solved_count,current_streak,longest_streak,best_times,averages&limit=1`,
    {},
    token,
  );
  return rows[0];
}

export async function getProfileCollection(token: string | null, userId: string, limit = 30) {
  return supabaseRequest<ProfileCollectionItem[]>(
    `/rest/v1/cube_collection?user_id=eq.${userId}&select=id,brand,model,nickname,puzzle_type,image_url,rating,notes,is_favorite,acquired_at,created_at&order=is_favorite.desc&order=created_at.desc&limit=${limit}`,
    {},
    token,
  );
}

export async function getProfileAchievements(token: string | null, userId: string, limit = 40) {
  return supabaseRequest<ProfileAchievement[]>(
    `/rest/v1/user_achievements?user_id=eq.${userId}&select=achievement_id,unlocked_at,progress,achievements(id,name,description,icon,category,points,sort_order)&order=unlocked_at.desc&limit=${limit}`,
    {},
    token,
  );
}

export async function getAchievementCatalog(token: string) {
  return supabaseRequest<AchievementCatalogItem[]>(
    "/rest/v1/achievements?select=id,name,description,icon,category,points,sort_order&order=sort_order.asc",
    {},
    token,
  );
}

export async function getProfileChallenges(token: string, userId: string, limit = 20) {
  const filter = encodeURIComponent(`(creator_id.eq.${userId},sender_id.eq.${userId},recipient_id.eq.${userId})`);
  return supabaseRequest<ProfileChallenge[]>(
    `/rest/v1/challenges?or=${filter}&select=id,creator_id,sender_id,recipient_id,puzzle_type,status,scramble,message,sender_time_ms,creator_time_ms,creator_move_count,recipient_solve_id,completed_at,created_at&order=created_at.desc&limit=${limit}`,
    {},
    token,
  );
}

export async function getProfileFriends(token: string, userId: string, limit = 40) {
  const filter = encodeURIComponent(`(requester_id.eq.${userId},addressee_id.eq.${userId})`);
  const rows = await supabaseRequest<FriendshipRow[]>(
    `/rest/v1/friendships?or=${filter}&select=id,requester_id,addressee_id,status,created_at,updated_at&order=updated_at.desc&limit=${limit}`,
    {},
    token,
  );
  const friendIds = rows.map((row) => (row.requester_id === userId ? row.addressee_id : row.requester_id));
  const profiles = await getProfilesByIds(token, friendIds);

  return rows.map((row) => {
    const friendId = row.requester_id === userId ? row.addressee_id : row.requester_id;
    return {
      ...row,
      friend_id: friendId,
      direction: row.addressee_id === userId ? "incoming" as const : "outgoing" as const,
      friend: profiles.get(friendId) ?? null,
    };
  });
}

export async function getFriendSuggestions(
  token: string,
  userId: string,
  profile: ProfileProfile | undefined,
  friends: ProfileFriend[],
  solves: ProfileSolve[],
  limit = 8,
) {
  const relationshipIds = new Set(friends.map((friend) => friend.friend_id));
  relationshipIds.add(userId);

  const candidates = await safeProfileRequest(
    supabaseRequest<ProfileProfile[]>(
      `/rest/v1/profiles?profile_visibility=eq.public&id=neq.${userId}&select=${PROFILE_SELECT}&order=created_at.desc&limit=80`,
      {},
      token,
    ),
    [],
  );
  const visibleCandidates = candidates.filter((candidate) => !relationshipIds.has(candidate.id));
  if (!visibleCandidates.length) return [];

  const candidateIds = visibleCandidates.map((candidate) => candidate.id);
  const targetPuzzle = profile?.favorite_puzzle || mostUsedPuzzle(solves) || "3x3";
  const currentBest = bestSolveTime(solves, targetPuzzle);

  const [statsRows, currentAttempts] = await Promise.all([
    safeProfileRequest(
      supabaseRequest<SuggestionStatsRow[]>(
        `/rest/v1/user_stats?user_id=in.(${candidateIds.join(",")})&select=user_id,total_solves,current_streak,longest_streak,best_times,averages`,
        {},
        token,
      ),
      [],
    ),
    safeProfileRequest(
      supabaseRequest<SuggestionAttemptRow[]>(
        `/rest/v1/scramble_attempts?user_id=eq.${userId}&leaderboard_eligible=eq.true&visibility=in.(link,public)&select=user_id,scramble_id,solve_time_ms,move_count,created_at,scrambles(puzzle_type)&order=created_at.desc&limit=40`,
        {},
        token,
      ),
      [],
    ),
  ]);

  const statsByUser = new Map(statsRows.map((row) => [row.user_id, row]));
  const currentScrambleIds = Array.from(new Set(currentAttempts.map((attempt) => attempt.scramble_id).filter(Boolean))).slice(0, 25);
  const candidateAttempts = currentScrambleIds.length
    ? await safeProfileRequest(
        supabaseRequest<SuggestionAttemptRow[]>(
          `/rest/v1/scramble_attempts?scramble_id=in.(${currentScrambleIds.join(",")})&user_id=in.(${candidateIds.join(",")})&leaderboard_eligible=eq.true&visibility=in.(link,public)&select=user_id,scramble_id,solve_time_ms,move_count,created_at&limit=200`,
          {},
          token,
        ),
        [],
      )
    : [];

  const sharedByUser = new Map<string, number>();
  const bestSharedTimeByUser = new Map<string, number>();
  for (const attempt of candidateAttempts) {
    sharedByUser.set(attempt.user_id, (sharedByUser.get(attempt.user_id) ?? 0) + 1);
    if (attempt.solve_time_ms != null) {
      const previous = bestSharedTimeByUser.get(attempt.user_id);
      if (previous == null || attempt.solve_time_ms < previous) bestSharedTimeByUser.set(attempt.user_id, attempt.solve_time_ms);
    }
  }

  return visibleCandidates
    .map((candidate) => {
      const stat = statsByUser.get(candidate.id);
      const candidateBest = metricNumber(stat?.best_times, targetPuzzle) ?? bestSharedTimeByUser.get(candidate.id) ?? null;
      const timeGap = currentBest != null && candidateBest != null ? Math.abs(currentBest - candidateBest) : null;
      const sharedScrambles = sharedByUser.get(candidate.id) ?? 0;
      const scoreParts = scoreSuggestion({
        candidate,
        currentProfile: profile,
        targetPuzzle,
        currentBest,
        candidateBest,
        timeGap,
        sharedScrambles,
        totalSolves: Number(stat?.total_solves ?? 0),
      });

      return {
        user_id: candidate.id,
        profile: {
          id: candidate.id,
          username: candidate.username,
          display_name: candidate.display_name,
          cube_tag: candidate.cube_tag,
          public_slug: candidate.public_slug,
          avatar_url: candidate.avatar_url,
          title: candidate.title,
          favorite_puzzle: candidate.favorite_puzzle,
          country_code: candidate.country_code,
          region: candidate.region,
        },
        score: scoreParts.score,
        reason: scoreParts.reason,
        puzzle_type: targetPuzzle,
        best_time_ms: candidateBest,
        time_gap_ms: timeGap,
        shared_scramble_count: sharedScrambles,
        total_solves: Number(stat?.total_solves ?? 0),
      };
    })
    .sort((a, b) => b.score - a.score || a.profile.display_name?.localeCompare(b.profile.display_name ?? "") || 0)
    .slice(0, limit);
}

export async function searchPublicProfiles(
  token: string,
  userId: string,
  friends: ProfileFriend[],
  query: string,
  limit = 12,
) {
  const cleaned = query.trim().replace(/[(),*]/g, "").slice(0, 48);
  if (!cleaned) return [];

  const relationshipIds = new Set(friends.map((friend) => friend.friend_id));
  relationshipIds.add(userId);
  const like = `*${cleaned}*`;
  const exactFilter = encodeURIComponent(
    `(display_name.ilike.${like},username.ilike.${like},cube_tag.ilike.${like},public_slug.ilike.${like})`,
  );

  const rows = await safeProfileRequest(
    supabaseRequest<ProfileProfile[]>(
      `/rest/v1/profiles?profile_visibility=eq.public&or=${exactFilter}&select=${PROFILE_SELECT}&order=display_name.asc&limit=${limit}`,
      {},
      token,
    ),
    [],
  );

  return rows
    .filter((candidate) => !relationshipIds.has(candidate.id))
    .map((candidate) => ({
      user_id: candidate.id,
      profile: {
        id: candidate.id,
        username: candidate.username,
        display_name: candidate.display_name,
        cube_tag: candidate.cube_tag,
        public_slug: candidate.public_slug,
        avatar_url: candidate.avatar_url,
        title: candidate.title,
        favorite_puzzle: candidate.favorite_puzzle,
        country_code: candidate.country_code,
        region: candidate.region,
      },
      score: 100,
      reason: "Search match",
      puzzle_type: candidate.favorite_puzzle || "3x3",
      best_time_ms: null,
      time_gap_ms: null,
      shared_scramble_count: 0,
      total_solves: 0,
    }));
}

export async function getNotificationPreferences(token: string, userId: string) {
  const rows = await supabaseRequest<NotificationPreferences[]>(
    `/rest/v1/notification_preferences?user_id=eq.${userId}&select=email_account,email_security,email_friend_requests,email_challenges,email_achievements,email_product_updates,email_marketing,push_enabled&limit=1`,
    {},
    token,
  );
  return rows[0];
}

export async function getAccountPrivacyRequests(token: string, userId: string, limit = 8) {
  return supabaseRequest<AccountPrivacyRequest[]>(
    `/rest/v1/account_data_requests?user_id=eq.${userId}&select=id,request_type,status,requested_email,export_before_delete,created_at,completed_at,error_message&order=created_at.desc&limit=${limit}`,
    {},
    token,
  );
}

export async function getProfileDashboard(): Promise<ProfileDashboardData> {
  const { token, user } = await requireProfileSession();
  const [profile, solves, stats, collection, achievements, challenges, friends, rank] = await Promise.all([
    safeProfileRequest(getProfileById(token, user.id), undefined),
    safeProfileRequest(getProfileSolves(token, user.id, 8), []),
    safeProfileRequest(getProfileStats(token, user.id), undefined),
    safeProfileRequest(getProfileCollection(token, user.id, 6), []),
    safeProfileRequest(getProfileAchievements(token, user.id, 6), []),
    safeProfileRequest(getProfileChallenges(token, user.id, 8), []),
    safeProfileRequest(getProfileFriends(token, user.id, 40), []),
    safeProfileRequest(getProfileRankSummary(token, user.id, "3x3"), emptyRank()),
  ]);
  const suggestions = await safeProfileRequest(getFriendSuggestions(token, user.id, profile, friends, solves, 4), []);

  return { user, profile, solves, stats, collection, achievements, challenges, friends, suggestions, rank };
}

export async function getProfileSolvesPageData() {
  const { token, user } = await requireProfileSession();
  const [profile, solves, rank] = await Promise.all([
    safeProfileRequest(getProfileById(token, user.id), undefined),
    safeProfileRequest(getProfileSolves(token, user.id, 80), []),
    safeProfileRequest(getProfileRankSummary(token, user.id, "3x3"), emptyRank()),
  ]);
  return { user, profile, solves, rank };
}

export async function getProfileCollectionPageData() {
  const { token, user } = await requireProfileSession();
  const [profile, collection] = await Promise.all([
    safeProfileRequest(getProfileById(token, user.id), undefined),
    safeProfileRequest(getProfileCollection(token, user.id, 80), []),
  ]);
  return { user, profile, collection };
}

export async function getProfileAchievementsPageData() {
  const { token, user } = await requireProfileSession();
  const [profile, unlocked, catalog] = await Promise.all([
    safeProfileRequest(getProfileById(token, user.id), undefined),
    safeProfileRequest(getProfileAchievements(token, user.id, 80), []),
    safeProfileRequest(getAchievementCatalog(token), []),
  ]);
  return { user, profile, unlocked, catalog };
}

export async function getProfileFriendsPageData(query = "") {
  const { token, user } = await requireProfileSession();
  const [profile, friends, solves] = await Promise.all([
    safeProfileRequest(getProfileById(token, user.id), undefined),
    safeProfileRequest(getProfileFriends(token, user.id, 80), []),
    safeProfileRequest(getProfileSolves(token, user.id, 60), []),
  ]);
  const [suggestions, searchResults] = await Promise.all([
    safeProfileRequest(getFriendSuggestions(token, user.id, profile, friends, solves, 10), []),
    safeProfileRequest(searchPublicProfiles(token, user.id, friends, query, 12), []),
  ]);
  return { user, profile, friends, suggestions, searchResults, searchQuery: query.trim() };
}

export async function getProfileSettingsPageData() {
  const { token, user } = await requireProfileSession();
  const [profile, preferences, privacyRequests] = await Promise.all([
    safeProfileRequest(getProfileById(token, user.id), undefined),
    safeProfileRequest(getNotificationPreferences(token, user.id), undefined),
    safeProfileRequest(getAccountPrivacyRequests(token, user.id), []),
  ]);
  return { user, profile, preferences, privacyRequests };
}

export async function getPublicProfilePageData(slug: string) {
  const cleaned = slug.trim().replace(/[(),]/g, "").slice(0, 80);
  if (!cleaned) return null;

  const token = getAccessToken();
  const currentUser = token
    ? await safeProfileRequest(supabaseRequest<AuthUser>("/auth/v1/user", {}, token), null)
    : null;
  const filter = encodeURIComponent(`(public_slug.eq.${cleaned},cube_tag.eq.${cleaned},username.eq.${cleaned})`);
  const rows = await supabaseRequest<ProfileProfile[]>(
    `/rest/v1/profiles?or=${filter}&select=${PROFILE_SELECT}&limit=1`,
    {},
    token,
  );
  const profile = rows[0];
  if (!profile) return null;

  const canSeeActivity = profile.show_activity !== false || currentUser?.id === profile.id;
  const canSeeCollection = profile.show_collection !== false || currentUser?.id === profile.id;

  const [stats, solves, achievements, collection, friends] = await Promise.all([
    safeProfileRequest(getProfileStats(token, profile.id), undefined),
    canSeeActivity
      ? safeProfileRequest(getProfileSolves(token, profile.id, 10), [])
      : Promise.resolve([]),
    safeProfileRequest(getProfileAchievements(token, profile.id, 8), []),
    canSeeCollection
      ? safeProfileRequest(getProfileCollection(token, profile.id, 6), [])
      : Promise.resolve([]),
    token && currentUser?.id ? safeProfileRequest(getProfileFriends(token, currentUser.id, 80), []) : Promise.resolve([]),
  ]);

  return {
    currentUser,
    profile,
    stats,
    solves,
    achievements,
    collection,
    relationship: friends.find((friend) => friend.friend_id === profile.id),
  };
}

async function getProfilesByIds(token: string, ids: string[]) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (!uniqueIds.length) return new Map<string, ProfileFriend["friend"]>();

  const rows = await supabaseRequest<ProfileProfile[]>(
    `/rest/v1/profiles?id=in.(${uniqueIds.join(",")})&select=id,username,display_name,cube_tag,public_slug,avatar_url,title`,
    {},
    token,
  );

  return new Map(rows.map((profile) => [profile.id, profile]));
}

type RankRow = {
  user_id: string;
  solve_time_ms: number | null;
  move_count: number | null;
  created_at: string;
};

type SuggestionStatsRow = {
  user_id: string;
  total_solves: number | null;
  current_streak: number | null;
  longest_streak: number | null;
  best_times: Record<string, number | string | null> | null;
  averages: Record<string, number | string | null> | null;
};

type SuggestionAttemptRow = {
  user_id: string;
  scramble_id: string;
  solve_time_ms: number | null;
  move_count: number | null;
  created_at: string;
  scrambles?: { puzzle_type?: string | null } | Array<{ puzzle_type?: string | null }> | null;
};

export async function getProfileRankSummary(token: string, userId: string, puzzleType = "3x3") {
  const limit = 500;
  const attemptRows = await safeProfileRequest(
    supabaseRequest<RankRow[]>(
      `/rest/v1/scramble_attempts?select=user_id,solve_time_ms,move_count,created_at,scrambles!inner(puzzle_type)&leaderboard_eligible=eq.true&is_dnf=eq.false&visibility=in.(link,public)&solve_time_ms=not.is.null&scrambles.puzzle_type=eq.${encodeURIComponent(puzzleType)}&order=solve_time_ms.asc&order=move_count.asc&order=created_at.asc&limit=${limit}`,
      {},
      token,
    ),
    null,
  );

  if (attemptRows?.length) {
    return summarizeRankRows(attemptRows, userId, "scramble_attempts", attemptRows.length === limit);
  }

  const solveRows = await safeProfileRequest(
    supabaseRequest<RankRow[]>(
      `/rest/v1/solve_results?select=user_id,solve_time_ms,move_count,created_at&puzzle_type=eq.${encodeURIComponent(puzzleType)}&leaderboard_eligible=eq.true&is_dnf=eq.false&solve_time_ms=not.is.null&order=solve_time_ms.asc&order=move_count.asc&order=created_at.asc&limit=${limit}`,
      {},
      token,
    ),
    [],
  );

  if (solveRows.length) {
    return summarizeRankRows(solveRows, userId, "solve_results", solveRows.length === limit);
  }

  return emptyRank();
}

function summarizeRankRows(
  rows: RankRow[],
  userId: string,
  source: ProfileRankSummary["source"],
  capped: boolean,
): ProfileRankSummary {
  const sortedRows = rows
    .filter((row) => row.solve_time_ms != null)
    .sort((a, b) => {
      const time = (a.solve_time_ms ?? Number.MAX_SAFE_INTEGER) - (b.solve_time_ms ?? Number.MAX_SAFE_INTEGER);
      if (time) return time;
      const moves = (a.move_count ?? Number.MAX_SAFE_INTEGER) - (b.move_count ?? Number.MAX_SAFE_INTEGER);
      if (moves) return moves;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

  const bestByUser = new Map<string, RankRow>();
  for (const row of sortedRows) {
    if (!bestByUser.has(row.user_id)) bestByUser.set(row.user_id, row);
  }

  const rankedUsers = Array.from(bestByUser.entries());
  const index = rankedUsers.findIndex(([rankedUserId]) => rankedUserId === userId);
  const total = rankedUsers.length;

  if (index === -1) {
    return { rank: null, total, best_time_ms: null, percentile: null, source, capped };
  }

  const rank = index + 1;
  return {
    rank,
    total,
    best_time_ms: rankedUsers[index][1].solve_time_ms ?? null,
    percentile: total ? Math.max(1, Math.ceil((rank / total) * 100)) : null,
    source,
    capped,
  };
}

function emptyRank(): ProfileRankSummary {
  return {
    rank: null,
    total: 0,
    best_time_ms: null,
    percentile: null,
    source: "none",
    capped: false,
  };
}

function mostUsedPuzzle(solves: ProfileSolve[]) {
  const counts = new Map<string, number>();
  for (const solve of solves) {
    counts.set(solve.puzzle_type, (counts.get(solve.puzzle_type) ?? 0) + 1);
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function bestSolveTime(solves: ProfileSolve[], puzzleType: string) {
  const times = solves
    .filter((solve) => solve.puzzle_type === puzzleType && solve.solve_time_ms != null && !solve.is_dnf)
    .map((solve) => solve.solve_time_ms as number);
  return times.length ? Math.min(...times) : null;
}

function metricNumber(metrics: Record<string, number | string | null> | null | undefined, key: string) {
  const value = metrics?.[key];
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function scoreSuggestion({
  candidate,
  currentProfile,
  targetPuzzle,
  currentBest,
  candidateBest,
  timeGap,
  sharedScrambles,
  totalSolves,
}: {
  candidate: ProfileProfile;
  currentProfile?: ProfileProfile;
  targetPuzzle: string;
  currentBest: number | null;
  candidateBest: number | null;
  timeGap: number | null;
  sharedScrambles: number;
  totalSolves: number;
}) {
  let score = 10;
  const reasons: string[] = [];

  if (candidate.favorite_puzzle && candidate.favorite_puzzle === targetPuzzle) {
    score += 24;
    reasons.push(`Also trains ${targetPuzzle}`);
  }

  if (timeGap != null && currentBest != null && candidateBest != null) {
    if (timeGap <= 3000) {
      score += 30;
      reasons.push("Very close best time");
    } else if (timeGap <= 10000) {
      score += 20;
      reasons.push("Similar solve speed");
    } else if (timeGap <= 30000) {
      score += 10;
      reasons.push("Good time match");
    }
  }

  if (sharedScrambles) {
    score += Math.min(36, sharedScrambles * 12);
    reasons.push(`${sharedScrambles} shared ranked scramble${sharedScrambles === 1 ? "" : "s"}`);
  }

  if (totalSolves > 0) {
    score += Math.min(12, Math.floor(totalSolves / 25));
    if (!reasons.length) reasons.push(`${totalSolves} tracked solves`);
  }

  if (
    currentProfile?.show_location &&
    candidate.country_code &&
    currentProfile.country_code &&
    candidate.country_code === currentProfile.country_code
  ) {
    score += 8;
    reasons.push("Same country");
  }

  return {
    score,
    reason: reasons.slice(0, 2).join(" - ") || "Public Cube Labs player",
  };
}

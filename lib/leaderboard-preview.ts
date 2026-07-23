export type CubeLeaderboardTab = {
  label: string;
  scope: string;
  grid: number;
  active?: boolean;
  wire?: boolean;
  palette: string[];
};

export type PodiumPlayer = {
  rank: number;
  name: string;
  country: string;
  time: string;
  initials: string;
  badge?: string;
  tone: "silver" | "gold" | "bronze";
  isPreviewData: true;
};

export type LeaderboardRow = {
  rank: number;
  name: string;
  country: string;
  time: string;
  avatar: string;
  note?: string;
  badge?: string;
  current?: boolean;
  isPreviewData: true;
};

export type LeaderboardStat = {
  label: string;
  value: string;
  helper: string;
  tone: string;
};

export const cubePalette = ["#f8fafc", "#2563eb", "#dc2626", "#16a34a", "#facc15", "#f97316"];

export const cubeTabs: CubeLeaderboardTab[] = [
  { label: "3x3", scope: "Global", grid: 3, active: true, palette: cubePalette },
  { label: "2x2", scope: "Global", grid: 2, palette: ["#f8fafc", "#22c55e", "#ef4444", "#2563eb"] },
  { label: "4x4", scope: "Global", grid: 4, palette: cubePalette },
  { label: "5x5", scope: "Global", grid: 5, palette: ["#f8fafc", "#eab308", "#dc2626", "#f97316"] },
  { label: "6x6", scope: "Global", grid: 5, palette: ["#f8fafc", "#38bdf8", "#16a34a", "#eab308"] },
  { label: "7x7", scope: "Global", grid: 5, palette: ["#f8fafc", "#2563eb", "#dc2626", "#f97316"] },
  { label: "NxN", scope: "Global", grid: 4, wire: true, palette: cubePalette },
];

/**
 * Temporary preview data for the mobile leaderboard buildout.
 *
 * Production leaderboards must replace this module with an application service
 * that excludes test data, separates assisted/unassisted solves, and validates
 * public results server-side before ranking.
 */
export function getLeaderboardPreview() {
  const podium: PodiumPlayer[] = [
    { rank: 2, name: "SpeedCubeNinja", country: "US", time: "5.42", initials: "SN", tone: "silver", isPreviewData: true },
    { rank: 1, name: "CubeKing", country: "US", time: "4.91", initials: "CK", badge: "PRO", tone: "gold", isPreviewData: true },
    { rank: 3, name: "FastFingers", country: "DE", time: "5.67", initials: "FF", tone: "bronze", isPreviewData: true },
  ];

  const rows: LeaderboardRow[] = [
    { rank: 4, name: "TheCuber123", country: "US", time: "5.98", avatar: "TC", isPreviewData: true },
    { rank: 5, name: "J Perm", country: "CA", time: "6.12", avatar: "JP", badge: "PRO", isPreviewData: true },
    { rank: 6, name: "CubixPro", country: "UK", time: "6.35", avatar: "CP", isPreviewData: true },
    { rank: 7, name: "LightningCube", country: "AU", time: "6.51", avatar: "LC", isPreviewData: true },
    { rank: 8, name: "You", country: "US", time: "6.78", avatar: "YOU", note: "Cube Master", current: true, isPreviewData: true },
  ];

  const stats: LeaderboardStat[] = [
    { label: "Global Rank", value: "#2,847", helper: "Top 3%", tone: "text-[var(--green)]" },
    { label: "Country Rank", value: "#1,024", helper: "Top 2%", tone: "text-[var(--green)]" },
    { label: "Best Time", value: "4.12", helper: "Personal Best", tone: "text-[var(--purple)]" },
    { label: "Avg Time", value: "6.78", helper: "of 100", tone: "text-[var(--blue)]" },
    { label: "Solves", value: "1,247", helper: "This Month", tone: "text-[var(--gold)]" },
  ];

  return {
    filters: ["Global", "Friends", "US Country", "Monthly", "All Time"],
    podium,
    rows,
    stats,
  };
}

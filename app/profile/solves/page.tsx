import ProfilePlaceholderPage from "@/components/ProfilePlaceholderPage";

export default function ProfileSolvesPage() {
  return (
    <ProfilePlaceholderPage
      eyebrow="Solve History"
      title="All Solves"
      description="The approved version will read verified solve rows, scrambles, move counts, undo use, and leaderboard eligibility from the solve history service."
      primaryHref="/play/3x3"
      primaryLabel="Play 3x3"
    />
  );
}

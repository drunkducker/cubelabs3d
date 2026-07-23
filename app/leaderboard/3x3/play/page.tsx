import type { Metadata } from "next";
import NxNCubeGame from "@/app/NxNCubeGame";
import { DAILY_3X3_SCRAMBLE } from "@/lib/daily-challenge";

export const metadata: Metadata = {
  title: "3x3 Leaderboard Challenge | Cube Lab 3D",
  description: "Play the mobile-first 3x3 daily challenge, track your solve, and send the result to another Cube Labs account.",
};

export default function LeaderboardThreeByThreePlayPage() {
  return (
    <NxNCubeGame
      size={3}
      variant="focus"
      challengeMode={{
        kind: "leaderboard-daily",
        title: "3x3 Daily Challenge",
        subtitle: "Load the official scramble, solve it on the playable cube, save your tracked result, then send the same scramble to another account.",
        officialScramble: DAILY_3X3_SCRAMBLE,
      }}
    />
  );
}

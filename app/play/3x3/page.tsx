import type { Metadata } from "next";
import NxNCubeGame from "@/app/NxNCubeGame";

export const metadata: Metadata = {
  title: "Playable 3x3 Cube | Cube Lab 3D",
  description: "A playable Cube Labs 3x3 cube with mobile sticker swipes, timer, move tracking, undo, scramble, zoom, and challenge controls.",
};

export default function PlayThreeByThreePage() {
  return (
    <NxNCubeGame
      size={3}
      variant="focus"
      challengeMode={{
        kind: "free-play",
        title: "3x3 Tracked Play",
        subtitle: "Generate or choose a scramble, solve it, save the tracked result, or send that exact scramble to another Cube Labs account.",
      }}
    />
  );
}

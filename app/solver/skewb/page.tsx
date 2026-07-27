import type { Metadata } from "next";
import SkewbGame from "@/app/SkewbGame";

export const metadata: Metadata = {
  title: "Skewb Puzzle | Cube Lab 3D",
  description: "Playable 3D Skewb with sticker swipes, scramble, undo, timer, sharing, and a verified state-based solver.",
};

export default function SkewbPage() {
  return <SkewbGame />;
}

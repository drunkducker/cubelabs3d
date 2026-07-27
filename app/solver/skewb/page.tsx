import type { Metadata } from "next";
import SkewbGame from "@/app/SkewbGame";

export const metadata: Metadata = {
  title: "Skewb Puzzle | Cube Lab 3D",
  description: "Playable 3D Skewb with corner turns, scramble, undo, timer, and animated solve playback.",
};

export default function SkewbPage() {
  return <SkewbGame />;
}

import type { Metadata } from "next";
import KilominxGame from "@/app/KilominxGame";

export const metadata: Metadata = {
  title: "Kilominx Solver | Cube Lab 3D",
  description: "Playable Kilominx (corners-only Megaminx) with swipe-to-turn, a timer, undo, and a verified reduction solver with step playback.",
};

export default function KilominxPage() {
  return <KilominxGame />;
}

import type { Metadata } from "next";
import NxNCubeGame from "@/app/NxNCubeGame";

export const metadata: Metadata = {
  title: "Playable 4×4 Cube | Cube Lab 3D",
  description: "A playable Cube Labs 4×4 cube with thumb swipes, layer highlights, undo, scramble, zoom, and move mode.",
};

export default function PlayFourByFourPage() {
  return <NxNCubeGame size={4} variant="focus" />;
}

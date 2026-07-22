import type { Metadata } from "next";
import PyraminxGame from "@/app/PyraminxGame";

export const metadata: Metadata = {
  title: "Pyraminx Solver | Cube Lab 3D",
  description: "Playable Pyraminx with turn buttons, scramble, and a verified full solver with step playback.",
};

export default function PyraminxPage() {
  return <PyraminxGame variant="full" />;
}

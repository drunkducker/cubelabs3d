import type { Metadata } from "next";
import PyraminxGame from "@/app/PyraminxGame";

export const metadata: Metadata = {
  title: "Playable Pyraminx | Cube Lab 3D",
  description: "Playable 3D Pyraminx with sticker swipes, camera control, timer, undo, scramble history, and a verified auto-solver.",
};

export default function PlayPyraminxPage() {
  return <PyraminxGame />;
}

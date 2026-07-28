import type { Metadata } from "next";
import KilominxGame from "@/app/KilominxGame";

export const metadata: Metadata = {
  title: "Play Kilominx | Cube Lab 3D",
  description: "Play the interactive Cube Lab 3D Kilominx.",
};

export default function PlayKilominxPage() {
  return <KilominxGame />;
}

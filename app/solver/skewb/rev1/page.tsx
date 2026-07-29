import type { Metadata } from "next";
import SkewbGame from "@/app/SkewbGame";

export const metadata: Metadata = {
  title: "Skewb Rev 1 | Cube Lab 3D",
  description: "The original Cube Labs playable Skewb page, preserved for comparison with Rev 2.",
};

export default function SkewbRev1Page() {
  return <SkewbGame />;
}

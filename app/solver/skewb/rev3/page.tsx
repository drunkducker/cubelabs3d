import type { Metadata } from "next";
import SkewbRev3 from "@/components/SkewbRev3";

export const metadata: Metadata = {
  title: "Skewb Rev 3 | Cube Lab 3D",
  description: "A fully standalone Skewb — its own engine, 3D renderer, optimal solver, and design.",
};

export default function SkewbRev3Page() {
  return <SkewbRev3 />;
}

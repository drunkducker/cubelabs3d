import type { Metadata } from "next";
import SkewbRev2Shell from "@/components/SkewbRev2Shell";

export const metadata: Metadata = {
  title: "Skewb Rev 2 | Cube Lab 3D",
  description: "A redesigned mobile-first Skewb experience combining the strongest Cube Labs 3x3, 4x4, and Kilominx interaction patterns.",
};

export default function SkewbPage() {
  return <SkewbRev2Shell />;
}

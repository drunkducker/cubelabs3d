import type { Metadata } from "next";
import SkewbCubingProof from "@/app/SkewbCubingProof";

export const metadata: Metadata = {
  title: "Skewb cubing.js proof | Cube Lab 3D",
  description: "Isolated cubing.js Skewb renderer and solver proof for Cube Lab 3D.",
};

export default function SkewbCubingProofPage() {
  return <SkewbCubingProof />;
}

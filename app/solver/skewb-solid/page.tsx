import type { Metadata } from "next";
import SkewbSolidGame from "@/app/SkewbSolidGame";

export const metadata: Metadata = {
  title: "Solid-piece Skewb test | Cube Lab 3D",
  description: "Native Cube Labs Skewb renderer using fourteen complete solid pieces with the verified Skewb engine.",
};

export default function SkewbSolidPage() {
  return <SkewbSolidGame />;
}

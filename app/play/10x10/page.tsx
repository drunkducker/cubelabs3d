import type { Metadata } from "next";
import NxNCubeGame from "@/app/NxNCubeGame";

export const metadata: Metadata = {
  title: "10×10 Cube Engine Test | Cube Lab 3D",
  description: "Experimental Cube Labs 10×10 renderer and turn-animation test.",
  robots: { index: false, follow: false },
};

export default function TenByTenPage() {
  return <NxNCubeGame size={10} />;
}

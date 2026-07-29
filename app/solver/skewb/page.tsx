import type { Metadata } from "next";
import SkewbGamePremium from "@/app/SkewbGamePremium";
import "./skewb.css";

export const metadata: Metadata = {
  title: "Skewb Puzzle | Cube Lab 3D",
  description: "Playable premium 3D Skewb with sticker swipes, scramble, undo, timer, sharing, and a verified state-based solver.",
};

export default function SkewbPage() {
  return <div className="skewb-page-v2"><SkewbGamePremium /></div>;
}

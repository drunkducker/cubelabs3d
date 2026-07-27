import type { Metadata } from "next";
import PyraminxGame from "@/app/PyraminxGame";

export const metadata: Metadata = {
  title: "Pyraminx Solver | Cube Lab 3D",
  description: "Playable Pyraminx with turn buttons, scramble, and a verified full solver with step playback.",
};

export default function PyraminxPage() {
  return <>
    <style>{`
      /* Reference-video treatment: a bright neutral stage, punchier flat
         colors, and a crisp illustrated silhouette instead of a glossy
         floating-on-black render. The puzzle's existing black backing remains
         visible through the sticker gaps and becomes the heavy line work. */
      main canvas {
        background: #dedede !important;
        filter: saturate(1.32) contrast(1.16) brightness(1.04)
          drop-shadow(0 16px 12px rgba(0, 0, 0, .24));
      }

      main canvas + * {
        position: relative;
      }

      @media (prefers-color-scheme: dark) {
        main canvas {
          background: #d8d8d8 !important;
        }
      }
    `}</style>
    <PyraminxGame variant="full" />
  </>;
}

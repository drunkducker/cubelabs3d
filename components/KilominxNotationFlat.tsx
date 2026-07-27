import {
  KILOMINX_LEARN_FACES,
  kilominxLearnMove,
} from "@/lib/kilominx-learn-adapter";

type Props = {
  activeMove?: string;
};

const FACE_CENTERS: readonly [number, number][] = [
  [210, 54],
  [84, 126], [147, 126], [210, 126], [273, 126], [336, 126],
  [84, 208], [147, 208], [210, 208], [273, 208], [336, 208],
  [210, 280],
];

function pentagonPoints(cx: number, cy: number, radius = 34) {
  return Array.from({ length: 5 }, (_, index) => {
    const angle = -Math.PI / 2 + index * (Math.PI * 2 / 5);
    return `${cx + Math.cos(angle) * radius},${cy + Math.sin(angle) * radius}`;
  }).join(" ");
}

export default function KilominxNotationFlat({ activeMove }: Props) {
  let activeFace: number | null = null;
  if (activeMove) {
    try {
      activeFace = kilominxLearnMove(activeMove).face;
    } catch {
      activeFace = null;
    }
  }

  return (
    <svg
      viewBox="35 10 350 315"
      role="img"
      aria-label="Kilominx flat notation reference with twelve engine-numbered faces"
      className="mx-auto block w-full max-w-[520px]"
    >
      <defs>
        <filter id="kilominx-face-glow" x="-45%" y="-45%" width="190%" height="190%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {KILOMINX_LEARN_FACES.map((face) => {
        const [cx, cy] = FACE_CENTERS[face.face];
        const active = activeFace === face.face;
        const lightFace = face.color === "#f5f5f5" || face.color === "#ffd500";
        return (
          <g key={face.face} filter={active ? "url(#kilominx-face-glow)" : undefined}>
            <polygon
              points={pentagonPoints(cx, cy)}
              fill={face.color}
              fillOpacity={active ? 1 : 0.88}
              stroke={active ? "#c4b5fd" : "rgba(5,7,13,.92)"}
              strokeWidth={active ? 5 : 3}
              strokeLinejoin="round"
            />
            <text
              x={cx}
              y={cy + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={lightFace ? "#080b12" : "#fff"}
              fontSize="16"
              fontWeight="900"
              style={{ paintOrder: "stroke", stroke: "rgba(5,7,13,.28)", strokeWidth: 2 }}
            >
              {face.notation}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

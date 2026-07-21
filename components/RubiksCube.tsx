"use client";

/**
 * Bright, mobile-friendly Rubik's Cube renderer for the homepage hero.
 *
 * The previous implementation assigned six materials directly to a Drei
 * `RoundedBox`. That geometry does not reliably expose the same six material
 * groups as a normal `BoxGeometry`, so several outward faces were rendered with
 * the dark plastic material. The result was the nearly black cube seen on the
 * Vercel preview.
 *
 * This implementation uses a more dependable construction:
 * - Every cubie has one rounded, satin-black plastic body.
 * - Every exterior face receives a separate, thin rounded sticker mesh.
 * - Sticker colors therefore never depend on geometry material-group ordering.
 * - Multiple soft lights keep all visible stickers readable on mobile screens.
 *
 * Future solver animation can rotate rows of these cubies without changing the
 * sticker construction or the visual appearance of the cube.
 */

import { Canvas } from "@react-three/fiber";
import { OrbitControls, RoundedBox } from "@react-three/drei";

/** Standard solved-state Rubik's Cube sticker colors. */
const COLORS = {
  red: "#e53935",
  orange: "#ff7a18",
  white: "#f7f7f2",
  yellow: "#ffd21f",
  blue: "#1464e8",
  green: "#24c45a",
  plastic: "#111318",
} as const;

type Cell = [number, number, number];
type Vec3 = [number, number, number];

/**
 * Properties for one visible sticker attached to an exterior cubie face.
 */
type StickerProps = {
  color: string;
  position: Vec3;
  rotation?: Vec3;
};

/**
 * Renders one slightly raised sticker with a soft satin highlight.
 *
 * Separate sticker geometry avoids the multi-material bug that caused most
 * faces to become black. The tiny depth also creates the crisp black gaps seen
 * on a real speed cube.
 */
function Sticker({ color, position, rotation = [0, 0, 0] }: StickerProps) {
  return (
    <RoundedBox
      args={[0.76, 0.76, 0.045]}
      radius={0.055}
      smoothness={3}
      position={position}
      rotation={rotation}
    >
      <meshStandardMaterial
        color={color}
        roughness={0.3}
        metalness={0.02}
        emissive={color}
        emissiveIntensity={0.035}
      />
    </RoundedBox>
  );
}

/**
 * Renders one of the 27 cubies and only the stickers exposed on the outside.
 */
function Cubie({ position }: { position: Cell }) {
  const [x, y, z] = position;

  return (
    <group position={position}>
      {/* Satin-black body remains visible as the border around each sticker. */}
      <RoundedBox args={[0.9, 0.9, 0.9]} radius={0.075} smoothness={3}>
        <meshStandardMaterial
          color={COLORS.plastic}
          roughness={0.38}
          metalness={0.08}
        />
      </RoundedBox>

      {/* Right and left faces. */}
      {x === 1 && (
        <Sticker
          color={COLORS.red}
          position={[0.468, 0, 0]}
          rotation={[0, Math.PI / 2, 0]}
        />
      )}
      {x === -1 && (
        <Sticker
          color={COLORS.orange}
          position={[-0.468, 0, 0]}
          rotation={[0, Math.PI / 2, 0]}
        />
      )}

      {/* Top and bottom faces. */}
      {y === 1 && (
        <Sticker
          color={COLORS.white}
          position={[0, 0.468, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        />
      )}
      {y === -1 && (
        <Sticker
          color={COLORS.yellow}
          position={[0, -0.468, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        />
      )}

      {/* Front and rear faces. */}
      {z === 1 && <Sticker color={COLORS.blue} position={[0, 0, 0.468]} />}
      {z === -1 && <Sticker color={COLORS.green} position={[0, 0, -0.468]} />}
    </group>
  );
}

/** Builds the fixed coordinates for a solved 3×3×3 cube. */
function buildCells(): Cell[] {
  const cells: Cell[] = [];

  for (let x = -1; x <= 1; x += 1) {
    for (let y = -1; y <= 1; y += 1) {
      for (let z = -1; z <= 1; z += 1) {
        cells.push([x, y, z]);
      }
    }
  }

  return cells;
}

const CELLS = buildCells();

/**
 * Displays the complete hero cube with drag controls and gentle idle rotation.
 */
export default function RubiksCube() {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <Canvas
      camera={{ position: [4.4, 3.5, 5.1], fov: 36 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      {/* Broad fill light prevents any visible face from collapsing into black. */}
      <hemisphereLight args={["#ffffff", "#18345f", 1.65]} />

      {/* Soft studio key and fill lights create readable, premium highlights. */}
      <directionalLight position={[5, 8, 7]} intensity={2.15} color="#ffffff" />
      <directionalLight position={[-5, 3, 4]} intensity={1.15} color="#9fd8ff" />
      <directionalLight position={[2, -3, -5]} intensity={0.8} color="#6d8cff" />

      <group rotation={[-0.08, -0.08, 0]} scale={0.9}>
        {CELLS.map((cell) => (
          <Cubie key={cell.join(":")} position={cell} />
        ))}
      </group>

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        autoRotate={!reduceMotion}
        autoRotateSpeed={0.75}
        minPolarAngle={Math.PI / 4.5}
        maxPolarAngle={(3.4 * Math.PI) / 4.5}
      />
    </Canvas>
  );
}

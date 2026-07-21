/* ==========================================================================
   HERO
   The first screen: headline promise, the interactive 3D cube stage, the
   four solve options, and the primary CTA. Composed from client components.
   ========================================================================== */
import CubeStage from "./CubeStage";
import SolveOptions from "./SolveOptions";
import SolveButton from "./SolveButton";

export default function Hero() {
  return (
    <section>
      <h2 className="text-[42px] font-extrabold leading-[1.02] tracking-[-1px]">
        Solve Your
        <br />
        Cube in <span className="accent-text">Seconds</span>
      </h2>
      <p className="mt-3 max-w-[320px] text-[15.5px] text-[var(--muted)]">
        Enter your cube, get a step-by-step solution, and master every move.
      </p>
      <p className="mt-2 text-[15px] font-bold text-[var(--green)]">No account required.</p>
      <CubeStage />
      <SolveOptions />
      <SolveButton />
    </section>
  );
}

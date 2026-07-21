/* ========================================================================== 
   HERO
   The first screen now uses one shared interactive demo: users touch the cube,
   see their moves recorded below, and play the exact reverse solution.
   ========================================================================== */
import HeroCubeExperience from "./HeroCubeExperience";

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
      <HeroCubeExperience />
    </section>
  );
}

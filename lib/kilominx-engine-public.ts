/**
 * Public Kilominx engine entrypoint.
 *
 * Geometry and state ownership stay in kilominx-engine; public application
 * imports receive the move-count-optimized planner for solve().
 */
export * from "./kilominx-engine";
export { solve } from "./kilominx-solver-optimized";

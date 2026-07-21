/**
 * Public home route for Cube Lab 3D.
 *
 * The homepage is now solver-first: the first viewport helps visitors begin a
 * 3×3 solve without an account, while lower swipeable rails introduce the
 * broader Cube Lab ecosystem. Keeping this route lightweight protects mobile
 * loading performance until the full solver editor is embedded here.
 */

import HomeLanding from "./HomeLanding";

/** Renders the premium mobile-first Cube Lab 3D landing page. */
export default function Home() {
  return <HomeLanding />;
}

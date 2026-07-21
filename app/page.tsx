/**
 * Public catalog route for Cube Lab 3D.
 *
 * The home page no longer mounts the heavy Three.js game immediately. Instead,
 * it presents a fast catalog and sends an interested visitor to `/play/3x3`.
 * This separation improves first-load performance and creates room for more
 * puzzle pages without turning the home page into one oversized game screen.
 */

import HomeCatalog from "./HomeCatalog";

/**
 * Renders the mobile-first puzzle catalog at the site root.
 *
 * @returns The catalog experience and its direct link to the playable 3×3.
 */
export default function Home() {
  return <HomeCatalog />;
}

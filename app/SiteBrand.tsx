/**
 * Cube Lab 3D wordmark used throughout the public site.
 *
 * This component deliberately uses ordinary HTML and CSS instead of an image
 * asset. That keeps the logo sharp at every size, avoids an additional network
 * request, and lets the four colored tiles inherit the same palette as the
 * playable cube. The link always returns to the catalog home page.
 */

import Link from "next/link";

/**
 * Renders the shared Cube Lab brand link.
 *
 * @returns A keyboard-accessible link containing the colored mark and wordmark.
 */
export default function SiteBrand() {
  return (
    <Link className="brand" href="/" aria-label="Cube Lab 3D home">
      {/* The four empty spans become colored tiles through CSS. They are hidden
          from screen readers because the adjacent wordmark already names the site. */}
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      <span>
        <b>CUBE</b> LAB
      </span>
    </Link>
  );
}

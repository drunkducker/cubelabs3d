"use client";

import { useEffect, useRef } from "react";

/*
 * Client-side ad metric beacons. Fire-and-forget; never block or break the page.
 */

function beacon(kind: string, id: string) {
  try {
    const body = JSON.stringify({ kind, id });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/ads/track", new Blob([body], { type: "application/json" }));
    } else {
      void fetch("/api/ads/track", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } });
    }
  } catch {
    /* ignore */
  }
}

/** Renders nothing; records one impression when the slot mounts. */
export function AdImpression({ id, kind = "ad_impression" }: { id: string; kind?: "ad_impression" }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    beacon(kind, id);
  }, [id, kind]);
  return null;
}

/** Anchor that records a click before following the link. */
export function TrackedLink({
  id,
  kind,
  href,
  className,
  children,
  sponsored = true,
}: {
  id: string;
  kind: "ad_click" | "affiliate_click";
  href: string;
  className?: string;
  children: React.ReactNode;
  sponsored?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel={sponsored ? "sponsored nofollow noopener noreferrer" : "noopener noreferrer"}
      className={className}
      onClick={() => beacon(kind, id)}
    >
      {children}
    </a>
  );
}

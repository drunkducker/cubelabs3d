"use client";

import { useEffect } from "react";

const GUIDE_ROOT = "[data-kilominx-learn-guide]";
const VIEW_ANCHOR = "[data-kilominx-direction-anchor]";

/** Keeps the Slide Thumb panel inside the 3D view's bottom-left corner. */
export default function KilominxGuideViewDock() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(GUIDE_ROOT);
    const anchor = root?.querySelector<HTMLElement>(VIEW_ANCHOR) ?? null;
    if (!root || !anchor) return;

    let frame = 0;

    const positionPanel = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const panel = Array.from(root.children).find(
          (child): child is HTMLElement =>
            child instanceof HTMLElement && child.getAttribute("aria-hidden") === "true",
        );
        if (!panel) return;

        const rootRect = root.getBoundingClientRect();
        const viewRect = anchor.getBoundingClientRect();
        const panelRect = panel.getBoundingClientRect();
        const left = viewRect.left - rootRect.left + 12;
        const top = viewRect.bottom - rootRect.top - panelRect.height - 12;

        panel.style.setProperty("position", "absolute", "important");
        panel.style.setProperty("left", `${Math.max(8, left)}px`, "important");
        panel.style.setProperty("right", "auto", "important");
        panel.style.setProperty("top", `${Math.max(viewRect.top - rootRect.top + 8, top)}px`, "important");
        panel.style.setProperty("bottom", "auto", "important");
        panel.style.setProperty("transform", "none", "important");
        panel.style.setProperty("z-index", "60", "important");
      });
    };

    const mutations = new MutationObserver(positionPanel);
    mutations.observe(root, { childList: true, subtree: true });

    const resize = new ResizeObserver(positionPanel);
    resize.observe(root);
    resize.observe(anchor);

    window.addEventListener("resize", positionPanel);
    positionPanel();

    return () => {
      cancelAnimationFrame(frame);
      mutations.disconnect();
      resize.disconnect();
      window.removeEventListener("resize", positionPanel);
    };
  }, []);

  return null;
}

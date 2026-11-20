"use client";

import { useEffect } from "react";

/**
 * Pointer spotlight for glass cards: tells the hovered .panel/.glass where the pointer is (--mx/--my) and CSS
 * draws a soft light there. Only on devices with a fine pointer, and never with reduced motion.
 */
export function MotionLayer() {
  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || reduced.matches) return;
    let frame = 0;
    let last: HTMLElement | null = null;
    const onMove = (event: PointerEvent) => {
      const target = (event.target as Element | null)?.closest?.(".panel, .glass") as HTMLElement | null;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (last && last !== target) {
          last.style.removeProperty("--mx");
          last.style.removeProperty("--my");
        }
        last = target;
        if (!target) return;
        const rect = target.getBoundingClientRect();
        target.style.setProperty("--mx", `${event.clientX - rect.left}px`);
        target.style.setProperty("--my", `${event.clientY - rect.top}px`);
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}

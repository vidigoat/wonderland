"use client";

import { useEffect, useRef } from "react";

/**
 * The landing hero: a meadow of fireflies that drift from a restless twinkle into one shared rhythm
 * (Kuramoto coupling). It is the product's promise in motion — order you can watch emerge.
 * Pauses when hidden; a single still frame under prefers-reduced-motion.
 */
export function Meadow({ count = 110, className }: { count?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const flies = Array.from({ length: count }, () => ({
      x: Math.random(),
      y: 0.18 + Math.random() * 0.74,
      phase: Math.random() * Math.PI * 2,
      rate: 1 + (Math.random() - 0.5) * 0.35,
      drift: Math.random() * Math.PI * 2,
    }));
    let coupling = 0;
    let raf = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const draw = () => {
      const { width, height } = canvas;
      const dpr = width / Math.max(1, canvas.clientWidth);
      ctx.clearRect(0, 0, width, height);
      let sx = 0;
      let cy = 0;
      for (const f of flies) {
        sx += Math.sin(f.phase);
        cy += Math.cos(f.phase);
      }
      const mean = Math.atan2(sx, cy);
      // Coupling rises slowly, then rests: the meadow finds its rhythm about ten seconds in.
      coupling = Math.min(0.03, coupling + 0.00006);
      for (const f of flies) {
        f.phase += 0.045 * f.rate + coupling * Math.sin(mean - f.phase);
        f.drift += 0.004;
        const x = (f.x + Math.sin(f.drift) * 0.006) * width;
        const y = (f.y + Math.cos(f.drift * 0.8) * 0.006) * height;
        const lit = Math.max(0, Math.cos(f.phase)) ** 8;
        const r = (3 + lit * 10) * dpr;
        const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 4.5);
        glow.addColorStop(0, `rgba(255, 242, 186, ${0.32 + lit * 0.68})`);
        glow.addColorStop(0.3, `rgba(255, 208, 100, ${0.14 + lit * 0.42})`);
        glow.addColorStop(1, "rgba(255, 190, 70, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, r * 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const loop = () => {
      draw();
      raf = requestAnimationFrame(loop);
    };
    if (still) draw();
    else raf = requestAnimationFrame(loop);

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !still) raf = requestAnimationFrame(loop);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [count]);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}

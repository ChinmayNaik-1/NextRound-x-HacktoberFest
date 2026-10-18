import React, { useEffect, useRef } from 'react';

const COLORS = ['#3186FF', '#FC413D', '#00B95C', '#FBBC04', '#749BFF', '#FFE432'];
const COUNT = 110;

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  isRect: boolean;
  w: number;
  h: number;
  rot: number;
  opacity: number;
}

function makeParticle(w: number, h: number): Particle {
  return {
    x: rand(0, w),
    y: rand(0, h),
    vx: rand(-0.15, 0.15),
    vy: rand(-0.35, -0.08), // Upward drift
    color: pick(COLORS),
    isRect: Math.random() > 0.25, // 75% rectangles, 25% dots
    w: rand(2.5, 5),
    h: rand(5, 12),
    rot: rand(-50, 50),
    opacity: rand(0.35, 0.85),
  };
}

export const ParticleCanvas: React.FC<{ count?: number }> = ({ count = COUNT }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const particles: Particle[] = Array.from({ length: count }, () =>
      makeParticle(canvas.width, canvas.height)
    );

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        if (p.isRect) {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.w, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        p.x += p.vx;
        p.y += p.vy;

        // Respawn at bottom when exits top
        if (p.y < -15) {
          p.y = canvas.height + 15;
          p.x = rand(0, canvas.width);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [count]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 w-full h-full z-0"
    />
  );
};

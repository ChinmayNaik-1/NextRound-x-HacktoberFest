import React, {
  useEffect,
  useRef,
} from 'react';

const COLORS = [
  '#3186FF',
  '#FC413D',
  '#00B95C',
  '#FBBC04',
  '#749BFF',
  '#FFE432',
];

const rand = (a: number, b: number) =>
  a + Math.random() * (b - a);

const pick = <T,>(arr: T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

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

const make = (
  w: number,
  h: number
): Particle => ({
  x: rand(0, w),
  y: rand(0, h),
  vx: rand(-0.15, 0.15),
  vy: rand(-0.35, -0.08),
  color: pick(COLORS),
  isRect: Math.random() > 0.25,
  w: rand(2.5, 5),
  h: rand(5, 12),
  rot: rand(-50, 50),
  opacity: rand(0.35, 0.85),
});

export const ParticleCanvas: React.FC<{
  count?: number;
}> = ({ count = 80 }) => {
  const ref =
    useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx =
      canvas?.getContext('2d');

    if (!canvas || !ctx) return;

    const reduce =
      window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;

    const dpr =
      window.devicePixelRatio || 1;

    let raf = 0;
    let w = 0;
    let h = 0;

    let particles: Particle[] = [];

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;

      canvas.width = w * dpr;
      canvas.height = h * dpr;

      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      ctx.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
      );

      particles = Array.from(
        { length: count },
        () => make(w, h)
      );
    };

    resize();

    window.addEventListener(
      'resize',
      resize
    );

    const draw = () => {
      ctx.clearRect(
        0,
        0,
        w,
        h
      );

      for (const p of particles) {
        ctx.save();

        ctx.globalAlpha =
          p.opacity;

        ctx.fillStyle =
          p.color;

        ctx.translate(
          p.x,
          p.y
        );

        ctx.rotate(
          (p.rot * Math.PI) /
            180
        );

        if (p.isRect) {
          ctx.fillRect(
            -p.w / 2,
            -p.h / 2,
            p.w,
            p.h
          );
        } else {
          ctx.beginPath();

          ctx.arc(
            0,
            0,
            p.w,
            0,
            Math.PI * 2
          );

          ctx.fill();
        }

        ctx.restore();

        if (!reduce) {
          p.x += p.vx;
          p.y += p.vy;

          if (p.y < -15) {
            p.y = h + 15;
            p.x = rand(0, w);
          }
        }
      }
    };

    const tick = () => {
      draw();

      if (
        !reduce &&
        !document.hidden
      ) {
        raf =
          requestAnimationFrame(tick);
      } else if (!reduce) {
        raf =
          requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      cancelAnimationFrame(raf);

      window.removeEventListener(
        'resize',
        resize
      );
    };
  }, [count]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 print:hidden"
    />
  );
};
import { useEffect, useRef } from 'react';

const STAR_COUNT = 130;

export default function StarfieldCanvas({ className = 'login-starfield' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const ctx = canvas.getContext('2d');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let height = 0;
    let stars = [];

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      stars = Array.from({ length: STAR_COUNT }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.4 + 0.3,
        alpha: Math.random(),
        speed: Math.random() * 0.018 + 0.004,
      }));
    }

    let frame = 0;

    function draw() {
      ctx.clearRect(0, 0, width, height);
      const dark = document.documentElement.getAttribute('data-theme') === 'dark';

      for (const star of stars) {
        if (!reduceMotion) {
          star.alpha += star.speed;
          if (star.alpha > 1 || star.alpha < 0.1) {
            star.speed = -star.speed;
          }
        }
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = dark
          ? `rgba(255, 255, 255, ${star.alpha})`
          : `rgba(14, 116, 144, ${star.alpha * 0.35})`;
        ctx.fill();
      }

      frame = requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}

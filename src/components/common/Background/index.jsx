import { useEffect, useRef } from "react";

export default function BackgroundGradient() {
    const canvasRef = useRef(null);
    
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext("2d");
        
        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            
            if (window.fluidAnimationId) {
                cancelAnimationFrame(window.fluidAnimationId);
                initFluidAnimation(canvas, ctx);
            }
        };
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        window.fluidAnimationId = initFluidAnimation(canvas, ctx);
        
        return () => {
            window.removeEventListener('resize', resizeCanvas);
            if (window.fluidAnimationId) {
                cancelAnimationFrame(window.fluidAnimationId);
            }
        };
    }, []);

    return (
        <div className="background">
            <div className="background__gradient">
                <canvas ref={canvasRef} className="background__canvas"></canvas>
            </div>
            <div className="overlay"/>
        </div>
    );
}

function initFluidAnimation(canvas, ctx) {
  const width = canvas.width;
  const height = canvas.height;

  const colors = [
    // "rgba(156, 222, 248, 0.1)",
    // "rgba(222, 132, 211, 0.1)",
    "rgba(255, 255, 255, 0.15)",
  ];

  const blobCount = 5;
  const minSpeed = 5;   // px/sec
  const maxSpeed = 25;  // px/sec
  const blobRadius = 950;
  const margin = 50;
  const minX = -margin;
  const maxX = width + margin;
  const minY = -margin;
  const maxY = height + margin;

  const blobs = [];
  const centerBox = { x0: width * 0.005, x1: width * 1.2, y0: height * 0.05, y1: height * 1.2 };

  const randIn = (a, b) => a + Math.random() * (b - a);
  const pickTarget = () => ({
    x: randIn(centerBox.x0, centerBox.x1),
    y: randIn(centerBox.y0, centerBox.y1),
  });

  for (let i = 0; i < blobCount; i++) {
    blobs.push({
      x: randIn(centerBox.x0, centerBox.x1),
      y: randIn(centerBox.y0, centerBox.y1),
      target: pickTarget(),
      speed: randIn(minSpeed, maxSpeed),
      color: colors[i % colors.length],
    });
  }

  ctx.globalCompositeOperation = "source-over";  // color-dodge

    //   globalCompositeOperation options you might want:

    // source-over (default) – draw over existing
    // destination-over – draw behind existing
    // source-atop / destination-atop – draw only where the other already exists
    // source-in / destination-in – keep only overlap
    // source-out / destination-out – keep only non-overlap parts
    // lighter – additive (what you had)
    // multiply – multiply blend
    // screen – screen blend
    // overlay, darken, lighten, color-dodge, color-burn, hard-light, soft-light, difference, exclusion, hue, saturation, color, luminosity
    // Set via ctx.globalCompositeOperation = "multiply" (etc.).

  let lastTime = performance.now();
  function step(now) {
    const dt = (now - lastTime) / 1000;
    lastTime = now;
    ctx.clearRect(0, 0, width, height);

    blobs.forEach((b) => {
      const dx = b.target.x - b.x;
      const dy = b.target.y - b.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 5) {
        b.target = pickTarget();
        b.speed = randIn(minSpeed, maxSpeed);
      } else {
        const vx = (dx / dist) * b.speed * dt;
        const vy = (dy / dist) * b.speed * dt;
        b.x += vx;
        b.y += vy;
      }

      // bounce check
      if (b.x < minX || b.x > maxX) {
        b.vx = -(b.vx || 0);
        b.target = pickTarget();
      }
      if (b.y < minY || b.y > maxY) {
        b.vy = -(b.vy || 0);
        b.target = pickTarget();
      }

      const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, blobRadius);
      grad.addColorStop(0, b.color);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, blobRadius, 0, Math.PI * 2);
      ctx.fill();
    });

    window.fluidAnimationId = requestAnimationFrame(step);
  }

  window.fluidAnimationId = requestAnimationFrame(step);
}

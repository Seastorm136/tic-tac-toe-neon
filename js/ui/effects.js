// Hiệu ứng hình ảnh: confetti và vị trí đường thắng.

const prefersReducedMotion = () =>
  globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Confetti neon vẽ trên <canvas> phủ toàn màn hình. */
export class Confetti {
  #canvas;
  #ctx;
  #particles = [];
  #frame = null;

  static GRAVITY = 0.3;
  static DRAG = 0.985;
  static LIFETIME = 200; // số khung hình

  constructor(canvas) {
    this.#canvas = canvas;
    this.#ctx = canvas.getContext('2d');
  }

  /** Bắn confetti từ 2 góc dưới màn hình. */
  burst(colors, count = 160) {
    if (prefersReducedMotion()) return;
    this.#resize();

    const w = innerWidth;
    const h = innerHeight;
    for (let i = 0; i < count; i++) {
      const fromLeft = i % 2 === 0;
      const angle = ((fromLeft ? -62 : -118) + (Math.random() * 30 - 15)) * (Math.PI / 180);
      const speed = 12 + Math.random() * 10;
      this.#particles.push({
        x: fromLeft ? 0 : w,
        y: h * 0.8,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 6 + Math.random() * 6,
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.35,
        color: colors[i % colors.length],
        age: 0,
      });
    }
    this.#frame ??= requestAnimationFrame(this.#tick);
  }

  #resize() {
    const dpr = globalThis.devicePixelRatio || 1;
    this.#canvas.width = innerWidth * dpr;
    this.#canvas.height = innerHeight * dpr;
    this.#ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  #tick = () => {
    const ctx = this.#ctx;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    ctx.globalCompositeOperation = 'lighter'; // các mảnh chồng lên nhau sẽ sáng hơn → cảm giác neon

    for (const p of this.#particles) {
      p.vy += Confetti.GRAVITY;
      p.vx *= Confetti.DRAG;
      p.vy *= Confetti.DRAG;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.spin;
      p.age++;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = Math.max(0, 1 - p.age / Confetti.LIFETIME);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }

    this.#particles = this.#particles.filter((p) => p.age < Confetti.LIFETIME && p.y < innerHeight + 40);

    if (this.#particles.length > 0) {
      this.#frame = requestAnimationFrame(this.#tick);
    } else {
      this.#frame = null;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
    }
  };
}

/**
 * Đặt đường thắng (thẻ <line> trong `svg`) chạy qua tâm 2 ô đầu–cuối,
 * kéo dài thêm một chút ra ngoài cho đẹp.
 */
export function positionWinLine(svg, fromCell, toCell, overshoot = 0.3) {
  const box = svg.getBoundingClientRect();
  const a = fromCell.getBoundingClientRect();
  const b = toCell.getBoundingClientRect();

  const ax = a.left + a.width / 2 - box.left;
  const ay = a.top + a.height / 2 - box.top;
  const bx = b.left + b.width / 2 - box.left;
  const by = b.top + b.height / 2 - box.top;

  const length = Math.hypot(bx - ax, by - ay) || 1;
  const ux = ((bx - ax) / length) * a.width * overshoot;
  const uy = ((by - ay) / length) * a.height * overshoot;

  svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
  const line = svg.querySelector('line');
  line.setAttribute('x1', ax - ux);
  line.setAttribute('y1', ay - uy);
  line.setAttribute('x2', bx + ux);
  line.setAttribute('y2', by + uy);
}

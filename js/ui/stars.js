/* stars.js - a quiet night sky. A few stars twinkle; one, rarely, falls. */
export class Stars {
  constructor(canvas, { reduced = false } = {}) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.reduced = reduced;
    this.acc = 0; this.shoot = null;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth; this.h = window.innerHeight;
    this.canvas.width = Math.round(this.w * dpr); this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round((this.w * this.h) / 9000);
    this.stars = Array.from({ length: n }, () => ({
      x: Math.random() * this.w, y: Math.pow(Math.random(), 1.4) * this.h * 0.9,
      r: Math.random() < 0.08 ? 1.2 + Math.random() * 0.6 : 0.4 + Math.random() * 0.6,
      a: 0.15 + Math.random() * 0.5, tw: Math.random() < 0.3 ? 0.6 + Math.random() * 2 : 0, ph: Math.random() * 6.28,
    }));
  }
  update(dt, t) {
    this.acc += dt;
    if (this.acc < 1 / 24) return;
    this.acc = 0;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    for (const s of this.stars) {
      const a = s.tw && !this.reduced ? s.a * (0.55 + 0.45 * Math.sin(t * s.tw + s.ph)) : s.a;
      ctx.fillStyle = `rgba(232,226,255,${a})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
    }
    if (!this.reduced && !this.shoot && Math.random() < 0.004) {
      this.shoot = { x: Math.random() * this.w * 0.7, y: Math.random() * this.h * 0.3, life: 0 };
    }
    if (this.shoot) {
      const s = this.shoot; s.life += 1 / 24;
      const k = s.life / 0.9, x = s.x + k * 260, y = s.y + k * 90;
      const g = ctx.createLinearGradient(x - 120, y - 42, x, y);
      g.addColorStop(0, 'rgba(255,230,240,0)'); g.addColorStop(1, `rgba(255,230,240,${0.7 * (1 - k)})`);
      ctx.strokeStyle = g; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(x - 120, y - 42); ctx.lineTo(x, y); ctx.stroke();
      if (s.life > 0.9) this.shoot = null;
    }
  }
}

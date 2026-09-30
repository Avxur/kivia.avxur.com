/*
 * petals.js - sakura petals drifting across the whole page.
 * Two layers: small ones behind her, a few big soft ones in front.
 * The cursor makes wind.
 */

const TAU = Math.PI * 2;

function petalPath(ctx, s) {
  // a sakura petal: rounded body with a small notch at the tip
  ctx.beginPath();
  ctx.moveTo(0, s * 0.5);
  ctx.bezierCurveTo(-s * 0.42, s * 0.28, -s * 0.46, -s * 0.28, -s * 0.16, -s * 0.5);
  ctx.quadraticCurveTo(-s * 0.05, -s * 0.42, 0, -s * 0.36);
  ctx.quadraticCurveTo(s * 0.05, -s * 0.42, s * 0.16, -s * 0.5);
  ctx.bezierCurveTo(s * 0.46, -s * 0.28, s * 0.42, s * 0.28, 0, s * 0.5);
  ctx.closePath();
}

export function makePetalSprite(size, { blur = 0, hue = 0, light = 0 } = {}) {
  const pad = Math.ceil(blur * 2.5) + 2;
  const c = document.createElement('canvas');
  c.width = c.height = size + pad * 2;
  const ctx = c.getContext('2d');
  ctx.translate(c.width / 2, c.height / 2);
  if (blur) ctx.filter = `blur(${blur}px)`;
  const g = ctx.createLinearGradient(0, size * 0.5, 0, -size * 0.5);
  const tone = (l, a = 1) => `hsla(${345 + hue}, ${78 - light * 10}%, ${l + light * 6}%, ${a})`;
  g.addColorStop(0, tone(72));
  g.addColorStop(0.55, tone(86));
  g.addColorStop(1, tone(93));
  petalPath(ctx, size);
  ctx.fillStyle = g;
  ctx.fill();
  // a faint vein
  ctx.strokeStyle = tone(70, 0.35);
  ctx.lineWidth = Math.max(0.5, size * 0.03);
  ctx.beginPath(); ctx.moveTo(0, size * 0.45); ctx.lineTo(0, -size * 0.2); ctx.stroke();
  return c;
}

export class Petals {
  constructor(back, front, { reduced = false } = {}) {
    this.layers = [
      { canvas: back, ctx: back.getContext('2d'), list: [], kind: 'back' },
      { canvas: front, ctx: front.getContext('2d'), list: [], kind: 'front' },
    ];
    this.reduced = reduced;
    this.wind = { x: 0.35, y: 0, gust: 0 };
    this.cursor = { x: -9999, y: -9999, vx: 0, vy: 0, t: 0 };
    this.scrollV = 0;
    this.dream = 0;
    this.sprites = {
      back: [0, 1, 2, 3].map((i) => makePetalSprite(28, { hue: i * 3 - 4, light: i % 2 })),
      front: [0, 1, 2].map((i) => makePetalSprite(64, { blur: 3 + i * 2.5, hue: i * 4 - 3 })),
    };
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth; this.h = window.innerHeight; this.dpr = dpr;
    for (const L of this.layers) {
      L.canvas.width = Math.round(this.w * dpr);
      L.canvas.height = Math.round(this.h * dpr);
      L.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const area = (this.w * this.h) / (1440 * 900);
    const k = this.reduced ? 0.35 : 1;
    this.target = {
      back: Math.round(Math.min(90, Math.max(22, 58 * area)) * k),
      front: Math.round((this.w < 700 ? 3 : 7) * k),
    };
    for (const L of this.layers) {
      while (L.list.length < this.target[L.kind]) L.list.push(this.spawn(L.kind, true));
      L.list.length = Math.min(L.list.length, this.target[L.kind]);
    }
  }

  spawn(kind, anywhere = false) {
    const front = kind === 'front';
    const z = front ? 0.7 + Math.random() * 0.3 : 0.25 + Math.random() * 0.75;
    return {
      x: anywhere ? Math.random() * this.w : -40 - Math.random() * this.w * 0.3,
      y: anywhere ? Math.random() * this.h : Math.random() * this.h * 0.8 - 60,
      z,
      size: front ? 30 + Math.random() * 46 : (7 + z * 11) * (0.8 + Math.random() * 0.4),
      rot: Math.random() * TAU,
      vr: (Math.random() - 0.5) * 1.6,
      flip: Math.random() * TAU,
      vf: 1 + Math.random() * 2.2,
      sway: Math.random() * TAU,
      vs: 0.6 + Math.random() * 0.9,
      vx: 0, vy: 0,
      sprite: Math.floor(Math.random() * (front ? 3 : 4)),
      alpha: front ? 0.4 + Math.random() * 0.3 : 0.5 + z * 0.45,
    };
  }

  pointer(x, y) {
    const now = performance.now();
    const c = this.cursor;
    const dt = Math.max(8, now - c.t);
    if (c.t) { c.vx = (x - c.x) / dt; c.vy = (y - c.y) / dt; }
    c.x = x; c.y = y; c.t = now;
  }

  burst(n = 40) {
    const L = this.layers[0];
    for (let i = 0; i < n; i++) {
      const p = this.spawn('back', true);
      p.x = this.w * (0.3 + Math.random() * 0.4); p.y = -20 - Math.random() * 200;
      p.vx = (Math.random() - 0.5) * 120; p.vy = 40 + Math.random() * 60;
      L.list.push(p);
    }
    setTimeout(() => { L.list.length = Math.min(L.list.length, this.target.back + 10); }, 12000);
  }

  update(dt, t) {
    dt = Math.min(dt, 0.05);
    const W = this.wind;
    W.gust = Math.max(0, W.gust - dt * 0.5);
    const breeze = 0.35 + Math.sin(t * 0.13) * 0.25 + Math.sin(t * 0.37) * 0.12 + W.gust;
    const c = this.cursor;
    const cursorSpeed = Math.hypot(c.vx, c.vy);
    c.vx *= Math.exp(-dt * 4); c.vy *= Math.exp(-dt * 4);
    this.scrollV *= Math.exp(-dt * 5);
    const slow = 1 - this.dream * 0.55;

    for (const L of this.layers) {
      const ctx = L.ctx;
      ctx.clearRect(0, 0, this.w, this.h);
      const sprites = this.sprites[L.kind];
      for (let i = 0; i < L.list.length; i++) {
        const p = L.list[i];
        const depth = 0.35 + p.z * 0.9;
        p.sway += dt * p.vs;
        // wind + gravity + gentle sway
        let ax = (breeze * 60 * depth - p.vx) * 0.8;
        let ay = (28 * depth + Math.sin(p.sway) * 18 - p.vy) * 0.8;
        // the cursor pushes petals around
        if (cursorSpeed > 0.05) {
          const dx = p.x - c.x, dy = p.y - c.y;
          const d2 = dx * dx + dy * dy;
          const R = 150;
          if (d2 < R * R) {
            const f = (1 - Math.sqrt(d2) / R) * Math.min(cursorSpeed, 3);
            ax += c.vx * 900 * f; ay += c.vy * 900 * f;
            p.vr += (Math.random() - 0.5) * f * 4;
          }
        }
        p.vx += ax * dt; p.vy += ay * dt;
        p.x += p.vx * dt * slow;
        p.y += (p.vy * slow - this.scrollV * depth * 0.4) * dt;
        p.rot += p.vr * dt * slow;
        p.vr *= Math.exp(-dt * 0.4);
        p.flip += p.vf * dt * slow;

        if (p.x > this.w + 80 || p.y > this.h + 80 || p.y < -300) {
          Object.assign(p, this.spawn(L.kind));
          if (Math.random() < 0.5) { p.x = Math.random() * this.w; p.y = -40; }
          continue;
        }
        const img = sprites[p.sprite];
        const sx = Math.cos(p.flip);
        const s = p.size / (L.kind === 'front' ? 64 : 28);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(s * (0.25 + Math.abs(sx) * 0.75) * Math.sign(sx || 1), s);
        ctx.globalAlpha = p.alpha * (0.65 + Math.abs(sx) * 0.35);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        ctx.restore();
      }
    }
  }
}

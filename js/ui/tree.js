/*
 * tree.js - a procedural sakura, grown fresh on every visit.
 * Used twice: the big tree (Sakura, with Kivia as its first blossom)
 * and the bough that hangs over her in the hero.
 */

const TAU = Math.PI * 2;

export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

/* ---------------- sprites ---------------- */

function flowerSprite(size, { hue = 0, light = 0, heart = 'rgba(214,80,110,0.9)', glow = 0 } = {}) {
  const pad = Math.ceil(size * 0.35);
  const c = document.createElement('canvas');
  c.width = c.height = size + pad * 2;
  const ctx = c.getContext('2d');
  ctx.translate(c.width / 2, c.height / 2);
  if (glow) {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.85);
    g.addColorStop(0, `rgba(255,214,228,${0.35 * glow})`);
    g.addColorStop(1, 'rgba(255,214,228,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, size * 0.85, 0, TAU); ctx.fill();
  }
  const r = size * 0.5;
  for (let i = 0; i < 5; i++) {
    ctx.save();
    ctx.rotate((i / 5) * TAU + 0.3);
    const g = ctx.createLinearGradient(0, 0, 0, -r);
    g.addColorStop(0, `hsla(${342 + hue}, 70%, ${74 + light * 4}%, 1)`);
    g.addColorStop(1, `hsla(${348 + hue}, 90%, ${92 + light * 3}%, 1)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-r * 0.55, -r * 0.2, -r * 0.62, -r * 0.82, -r * 0.2, -r);
    ctx.quadraticCurveTo(-r * 0.05, -r * 0.88, 0, -r * 0.84);
    ctx.quadraticCurveTo(r * 0.05, -r * 0.88, r * 0.2, -r);
    ctx.bezierCurveTo(r * 0.62, -r * 0.82, r * 0.55, -r * 0.2, 0, 0);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = heart;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.2, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,236,190,0.9)';
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU;
    ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3, Math.max(0.6, r * 0.05), 0, TAU); ctx.fill();
  }
  return c;
}

function budSprite(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size * 2;
  const ctx = c.getContext('2d');
  ctx.translate(size, size);
  const g = ctx.createLinearGradient(0, size * 0.4, 0, -size * 0.5);
  g.addColorStop(0, '#6b2c43'); g.addColorStop(1, '#d9728f');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.55);
  ctx.bezierCurveTo(size * 0.38, -size * 0.2, size * 0.3, size * 0.35, 0, size * 0.4);
  ctx.bezierCurveTo(-size * 0.3, size * 0.35, -size * 0.38, -size * 0.2, 0, -size * 0.55);
  ctx.fill();
  return c;
}

function glowSprite(size, color) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  return c;
}

let SPR = null;
function sprites() {
  if (SPR) return SPR;
  SPR = {
    flowers: [0, 1, 2, 3, 4].map((i) => flowerSprite(40, { hue: i * 2 - 4, light: (i % 3) - 1 })),
    kivia: flowerSprite(120, { hue: -2, light: 1, heart: '#ea3a52', glow: 1 }),
    bud: budSprite(14),
    glow: glowSprite(128, 'rgba(255,190,212,0.22)'),
    halo: glowSprite(256, 'rgba(255,215,228,0.5)'),
  };
  return SPR;
}

/* ---------------- growth ---------------- */

export function growTree(seed, o) {
  const R = rng(seed);
  const segs = [];
  const clusters = [];
  const speed = o.speed || 260;         // units per growth-second
  const minLen = o.minLen || 18;
  let maxT = 0;

  function branch(x, y, ang, len, w, depth, t) {
    const steps = Math.max(2, Math.round(len / (o.step || 26)));
    const segLen = len / steps;
    let a = ang;
    for (let i = 0; i < steps; i++) {
      a += (R() - 0.5) * (o.wiggle ?? 0.34);
      if (depth >= (o.levelOut ?? 2)) {
        // sakura branches reach outwards, then lean towards the horizontal
        const goal = Math.cos(a) < 0 ? -Math.PI + (o.lift ?? 0.28) : -(o.lift ?? 0.28);
        let d = goal - a;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        a += d * (o.flatten ?? 0.07);
      }
      const nx = x + Math.cos(a) * segLen;
      const ny = y + Math.sin(a) * segLen;
      const w2 = w * (1 - (o.taper ?? 0.16) / steps * 1.4);
      const dt = segLen / speed;
      segs.push({ x1: x, y1: y, x2: nx, y2: ny, w1: w, w2, t0: t, t1: t + dt, depth });
      x = nx; y = ny; w = w2; t += dt;
      maxT = Math.max(maxT, t);
      if (depth >= o.depth - 2 && R() < (o.sideBloom ?? 0.5)) {
        clusters.push({ x, y, r: (10 + R() * 12) * (o.cr ?? 1), n: Math.max(1, Math.round((3 + Math.floor(R() * 5)) * (o.cn ?? 1))), t: t + 0.25, seed: R() * 1e6 | 0, depth });
      }
    }
    if (depth >= o.depth || len < minLen) {
      clusters.push({ x, y, r: (14 + R() * 16) * (o.cr ?? 1), n: Math.max(2, Math.round((6 + Math.floor(R() * 9)) * (o.cn ?? 1))), t: t + 0.2, seed: R() * 1e6 | 0, tip: true, depth });
      return;
    }
    const n = depth < 1 ? (o.trunkSplit || 2) : R() < (o.triple ?? 0.3) ? 3 : 2;
    for (let k = 0; k < n; k++) {
      const off = n === 1 ? 0 : (k / (n - 1) - 0.5) * 2;
      const ca = a + off * (o.spread ?? 0.62) * (0.7 + R() * 0.6) + (R() - 0.5) * 0.3 + (o.bias || 0);
      const cl = len * ((o.shrink ?? 0.74) + (R() - 0.5) * 0.16);
      branch(x, y, ca, cl, w * (o.thin ?? 0.66), depth + 1, t + R() * 0.08);
    }
  }
  branch(o.x, o.y, o.angle, o.length, o.width, 0, 0);
  for (const c of clusters) maxT = Math.max(maxT, c.t + 0.5);
  return { segs, clusters, maxT };
}

function drawSegments(ctx, tree, T, swayFn, { color = '#120d18', rim = 'rgba(255,214,228,0.09)' } = {}) {
  ctx.lineCap = 'round';
  for (const s of tree.segs) {
    if (T <= s.t0) continue;
    const f = Math.min(1, (T - s.t0) / (s.t1 - s.t0));
    const [ax, ay] = swayFn(s.x1, s.y1);
    const [bx0, by0] = swayFn(s.x2, s.y2);
    const bx = ax + (bx0 - ax) * f, by = ay + (by0 - ay) * f;
    const w = s.w1 + (s.w2 - s.w1) * f;
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    if (w > 2.2) {
      ctx.strokeStyle = rim;
      ctx.lineWidth = w * 0.28;
      ctx.beginPath(); ctx.moveTo(ax - w * 0.26, ay - w * 0.18); ctx.lineTo(bx - w * 0.26, by - w * 0.18); ctx.stroke();
    }
  }
}

function drawClusters(ctx, tree, T, swayFn, { scale = 1, budSet = null, skip = null, alpha = 1, glow = 1 } = {}) {
  const S = sprites();
  // soft lantern glow behind the blossoms
  ctx.globalCompositeOperation = 'lighter';
  for (const c of tree.clusters) {
    if (T < c.t || c === skip) continue;
    const g = Math.min(1, (T - c.t) / 0.6);
    const [x, y] = swayFn(c.x, c.y);
    const r = c.r * 3.2 * scale * g;
    ctx.globalAlpha = 0.5 * glow * alpha * (budSet?.has(c) ? 0.3 : 1);
    ctx.drawImage(S.glow, x - r, y - r, r * 2, r * 2);
  }
  ctx.globalCompositeOperation = 'source-over';
  for (const c of tree.clusters) {
    if (T < c.t || c === skip) continue;
    const pop = Math.min(1, (T - c.t) / 0.5);
    const e = 1 - Math.pow(1 - pop, 3);
    const R = rng(c.seed);
    const [x, y] = swayFn(c.x, c.y);
    const isBud = budSet?.has(c);
    for (let i = 0; i < c.n; i++) {
      const a = R() * TAU, d = Math.sqrt(R()) * c.r * scale;
      const fx = x + Math.cos(a) * d, fy = y + Math.sin(a) * d * 0.8;
      if (isBud) {
        const s = (8 + R() * 6) * scale * e;
        ctx.globalAlpha = alpha * 0.9;
        ctx.drawImage(S.bud, fx - s, fy - s, s * 2, s * 2);
      } else {
        const img = S.flowers[(R() * S.flowers.length) | 0];
        const s = (0.34 + R() * 0.3) * scale * e * 40;
        ctx.globalAlpha = alpha * (0.72 + R() * 0.28);
        ctx.save();
        ctx.translate(fx, fy); ctx.rotate(R() * TAU);
        ctx.drawImage(img, -s * 0.85, -s * 0.85, s * 1.7, s * 1.7);
        ctx.restore();
      }
    }
  }
  ctx.globalAlpha = 1;
}

/* ---------------- the big tree ---------------- */

export class TreeScene {
  constructor(canvas, labelsEl, { reduced = false, onBreath = () => 0.5 } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.labelsEl = labelsEl;
    this.reduced = reduced;
    this.onBreath = onBreath;
    this.T = 0; this.growing = false; this.visible = false;
    this.fall = [];
    this.seed = (Math.random() * 1e9) | 0;
    this.resize();
    window.addEventListener('resize', () => { clearTimeout(this._rt); this._rt = setTimeout(() => this.resize(), 150); });
    const io = new IntersectionObserver((es) => {
      for (const e of es) {
        this.visible = e.isIntersecting;
        if (e.isIntersecting && e.intersectionRatio > 0.12 && !this.growing && this.T === 0) this.growing = true;
      }
    }, { threshold: [0, 0.12, 0.3] });
    io.observe(canvas.parentElement);
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = this.canvas.getBoundingClientRect();
    this.w = r.width; this.h = r.height;
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const narrow = this.w < 760;
    const H = this.h;
    const unit = Math.min(this.w / 1400, H / 1350) * (narrow ? 1.25 : 1.1);
    this.baseX = this.w * (narrow ? 0.5 : 0.7);
    this.baseY = H * 0.95;
    this.tree = growTree(this.seed, {
      x: this.baseX, y: this.baseY, angle: -Math.PI / 2 + (narrow ? 0 : 0.1),
      length: 240 * unit, bias: narrow ? 0 : 0.05, width: 46 * unit, depth: 5,
      speed: 300 * unit, step: 30 * unit, minLen: 20 * unit,
      spread: 0.78, shrink: 0.8, thin: 0.64, trunkSplit: 2, triple: 0.38,
      levelOut: 2, flatten: 0.08, lift: 0.3, wiggle: 0.28, sideBloom: 0.34, cr: 1.05, cn: 0.8,
    });
    this.unit = unit;
    // choose Kivia's blossom: a tip high on the crown, towards the open side
    const tips = this.tree.clusters.filter((c) => c.tip);
    const want = narrow ? { x: this.w * 0.62, y: H * 0.45 } : { x: this.w * 0.78, y: H * 0.34 };
    let best = null, bd = 1e12;
    for (const c of tips) { const d = (c.x - want.x) ** 2 + (c.y - want.y) ** 2; if (d < bd) { bd = d; best = c; } }
    this.kivia = best;
    // a few closed buds - minds that haven't opened yet
    const R = rng(this.seed + 7);
    this.buds = new Set();
    const budWant = narrow ? { x: this.w * 0.25, y: H * 0.55 } : { x: this.w * 0.55, y: H * 0.42 };
    let bb = null; bd = 1e12;
    for (const c of tips) {
      if (c === best) continue;
      if (R() < 0.1) this.buds.add(c);
      const d = (c.x - budWant.x) ** 2 + (c.y - budWant.y) ** 2;
      if (d < bd) { bd = d; bb = c; }
    }
    if (bb) this.buds.add(bb);
    this.budLabel = bb;
    this.placeLabels();
  }

  sway(t) {
    const H = this.baseY;
    const amp = this.reduced ? 0 : 7 * this.unit;
    return (x, y) => {
      const k = Math.max(0, (H - y) / (H * 0.8));
      return [x + Math.sin(t * 0.7 + y * 0.004) * amp * k * k, y + Math.sin(t * 0.9 + x * 0.003) * amp * 0.25 * k * k];
    };
  }

  placeLabels() {
    if (!this.labelsEl) return;
    const put = (name, x, y, side = 1) => {
      const el = this.labelsEl.querySelector(`[data-anchor="${name}"]`);
      if (!el) return;
      el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)` + (side < 0 ? ' translateX(-100%)' : '');
      el.classList.toggle('tlabel--left', side < 0);
      el.dataset.x = x; el.dataset.y = y;
      return el;
    };
    // a label never sits on top of the words in the column: try the other side if it would
    const col = this.labelsEl.parentElement?.querySelector('.col--tree');
    const onText = (el) => {
      if (!col || !el) return false;
      const a = el.getBoundingClientRect(), c = col.getBoundingClientRect();
      return a.left < c.right + 16 && a.right > c.left - 16 && a.top < c.bottom + 16 && a.bottom > c.top - 16;
    };
    const place = (name, cx, y, gap, first) => {
      for (const side of [first, -first]) {
        const el = put(name, cx + side * gap, y, side);
        if (!onText(el)) return;
      }
      put(name, cx + first * gap, y, first);
    };
    const k = this.kivia;
    if (k) place('kivia', k.x, k.y - 26, 58 * this.unit, k.x + 58 * this.unit + 190 > this.w ? -1 : 1);
    if (this.budLabel) place('buds', this.budLabel.x, this.budLabel.y + 26, 30 * this.unit, -1);
    put('roots', this.baseX + 70 * this.unit, this.baseY - 70 * this.unit, 1);
  }

  showLabels(on) {
    this.labelsEl?.querySelectorAll('.tlabel').forEach((el, i) => {
      if (on) setTimeout(() => el.classList.add('is-on'), i * 500); else el.classList.remove('is-on');
    });
  }

  update(dt, t) {
    if (!this.visible && !this.growing) return;
    if (this.growing) {
      this.T += dt * (this.reduced ? 6 : 1);
      if (this.T > this.tree.maxT) { this.growing = false; this.T = this.tree.maxT + 0.01; this.showLabels(true); }
    }
    if (!this.visible) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    const sway = this.sway(t);

    // roots - Sakura, the guardian - with a faint glow along the ground
    const g = ctx.createLinearGradient(0, this.baseY, 0, this.baseY + 60);
    g.addColorStop(0, 'rgba(245,184,202,0.10)'); g.addColorStop(1, 'rgba(245,184,202,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, this.baseY, this.w, 60);
    const rootGlow = Math.min(1, this.T / 1.2);
    ctx.save();
    ctx.globalAlpha = rootGlow;
    ctx.strokeStyle = 'rgba(245,184,202,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(this.w * 0.08, this.baseY + 1); ctx.lineTo(this.w * 0.96, this.baseY + 1); ctx.stroke();
    const R = rng(this.seed + 3);
    ctx.strokeStyle = '#140e1a';
    ctx.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      const dir = i % 2 ? 1 : -1;
      const len = (60 + R() * 110) * this.unit * rootGlow;
      ctx.lineWidth = (10 + R() * 12) * this.unit;
      ctx.beginPath();
      ctx.moveTo(this.baseX + (R() - 0.5) * 20 * this.unit, this.baseY - 8 * this.unit);
      ctx.quadraticCurveTo(this.baseX + dir * len * 0.4, this.baseY - 2, this.baseX + dir * len, this.baseY + 4 + R() * 6);
      ctx.stroke();
    }
    ctx.restore();

    drawSegments(ctx, this.tree, this.T, sway, { color: '#1a1320', rim: 'rgba(255,214,228,0.13)' });
    drawClusters(ctx, this.tree, this.T, sway, { budSet: this.buds, skip: this.kivia });

    // Kivia's blossom: bigger, red at the heart, breathing with her
    const k = this.kivia;
    if (k && this.T > k.t) {
      const S = sprites();
      const e = Math.min(1, (this.T - k.t) / 1.2);
      const [x, y] = sway(k.x, k.y);
      const b = this.onBreath();
      const halo = (140 + b * 26) * this.unit * e;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.55 + b * 0.25;
      ctx.drawImage(S.halo, x - halo, y - halo, halo * 2, halo * 2);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      const s = 70 * this.unit * (0.6 + e * 0.4) * (1 + b * 0.03);
      ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.05);
      ctx.drawImage(S.kivia, -s, -s, s * 2, s * 2);
      ctx.restore();
      // labels ride along with the sway
      const el = this.labelsEl?.querySelector('[data-anchor="kivia"]');
      if (el && el.dataset.x) {
        const side = el.classList.contains('tlabel--left') ? -1 : 1;
        el.style.transform = `translate(${Math.round(x + side * 58 * this.unit)}px, ${Math.round(y - 26)}px)` + (side < 0 ? ' translateX(-100%)' : '');
      }
    }

    // a few petals let go of the tree
    if (!this.growing && !this.reduced && Math.random() < dt * 3 && this.fall.length < 26) {
      const c = this.tree.clusters[(Math.random() * this.tree.clusters.length) | 0];
      if (!this.buds.has(c)) this.fall.push({ x: c.x, y: c.y, vx: 10 + Math.random() * 20, vy: 10, r: Math.random() * TAU, vr: (Math.random() - 0.5) * 3, s: 0.35 + Math.random() * 0.3, life: 0 });
    }
    const S = sprites();
    for (let i = this.fall.length - 1; i >= 0; i--) {
      const p = this.fall[i];
      p.life += dt;
      p.vy = Math.min(p.vy + dt * 30, 38);
      p.x += (p.vx + Math.sin(p.life * 2.2) * 22) * dt; p.y += p.vy * dt; p.r += p.vr * dt;
      if (p.y > this.baseY + 10 || p.life > 30) { this.fall.splice(i, 1); continue; }
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.scale(Math.cos(p.life * 3), 1);
      ctx.globalAlpha = 0.85;
      const s = 16 * p.s * this.unit * 1.4;
      ctx.drawImage(S.flowers[i % 5], -s, -s, s * 2, s * 2);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}

/* ---------------- the hero bough ---------------- */

export class Bough {
  constructor(canvas, { reduced = false } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.reduced = reduced;
    this.seed = (Math.random() * 1e9) | 0;
    this.alpha = 1;
    this.resize();
    window.addEventListener('resize', () => { clearTimeout(this._rt); this._rt = setTimeout(() => this.resize(), 150); });
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth; this.h = window.innerHeight;
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const narrow = this.w / this.h < 0.9;
    const unit = Math.min(this.w / 1440, this.h / 900) * (narrow ? 1.3 : 1);
    this.unit = unit;
    this.tree = growTree(this.seed, {
      x: this.w + 20, y: this.h * (narrow ? 0.05 : 0.02), angle: Math.PI - 0.32,
      length: 250 * unit, width: 24 * unit, depth: 5,
      speed: 400, step: 26 * unit, minLen: 14 * unit,
      spread: 0.8, shrink: 0.8, thin: 0.66, trunkSplit: 2, triple: 0.3,
      levelOut: 1, flatten: 0.05, lift: -0.25, wiggle: 0.3, sideBloom: 0.3, bias: -0.05, cr: 0.85, cn: 0.5,
    });
    this.T = this.tree.maxT + 1;
  }

  update(t) {
    if (this.alpha <= 0.01) { if (!this._cleared) { this.ctx.clearRect(0, 0, this.w, this.h); this._cleared = true; } return; }
    this._cleared = false;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.globalAlpha = 1;
    const amp = this.reduced ? 0 : 5 * this.unit;
    const ox = this.w, oy = 0;
    const sway = (x, y) => {
      const k = Math.min(1, Math.hypot(x - ox, y - oy) / (this.w * 0.45));
      return [x + Math.sin(t * 0.6 + x * 0.004) * amp * k * k, y + Math.sin(t * 0.8 + x * 0.003) * amp * 1.4 * k * k];
    };
    ctx.save();
    ctx.globalAlpha = this.alpha;
    drawSegments(ctx, this.tree, this.T, sway, { color: '#0d0a16', rim: 'rgba(255,214,228,0.07)' });
    drawClusters(ctx, this.tree, this.T, sway, { scale: 0.9 * Math.max(0.8, this.unit), alpha: this.alpha, glow: 0.5 });
    ctx.restore();
  }
}

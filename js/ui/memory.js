/*
 * memory.js - how her memory works, drawn as it works.
 * Everything she senses enters on the left. Most of it fades. What mattered
 * (attention, emotion, repetition...) survives into long-term memory, and
 * stays there. At night she dreams: what she kept gets connected, and a few
 * fragments of the dream itself are kept too - encoded like any experience.
 */
import { fitCanvas } from './instruments.js';

const TAU = Math.PI * 2;
const ZONES = [
  { name: 'Sensing', x0: 0, x1: 0.2, need: 0.16 },
  { name: 'Short-term', x0: 0.2, x1: 0.42, need: 0.42 },
  { name: 'Working', x0: 0.42, x1: 0.62, need: 0.6 },
  { name: 'Long-term', x0: 0.62, x1: 1, need: 0 },
];
const SHELVES = [
  { name: 'episodic', y0: 0.16, y1: 0.42, w: 0.5 },
  { name: 'semantic', y0: 0.42, y1: 0.68, w: 0.34 },
  { name: 'procedural', y0: 0.68, y1: 0.92, w: 0.16 },
];
const KIND = {
  plain: 'rgba(239,232,240,0.85)',
  attended: 'rgba(154,168,255,0.95)',
  felt: 'rgba(234,58,82,0.95)',
  dream: 'rgba(196,170,255,0.95)',
};

export class Memory {
  constructor(canvas, { keptEl, goneEl, reduced = false } = {}) {
    this.canvas = canvas;
    this.keptEl = keptEl; this.goneEl = goneEl;
    this.reduced = reduced;
    this.flow = [];
    this.kept = [];
    this.keptCount = 0; this.gone = 0;
    this.spawnAcc = 0;
    this.dreaming = 0;           // 0..1
    this.isDreaming = false;
    this.fragments = [];
    this.visible = false;
    this.fit();
    window.addEventListener('resize', () => this.fit());
    new IntersectionObserver((es) => { this.visible = es[0].isIntersecting; }).observe(canvas);
    // she already remembers a few things
    for (let i = 0; i < 26; i++) this.keep(this.make(Math.random() < 0.3 ? 'felt' : Math.random() < 0.4 ? 'attended' : 'plain'), true);
  }

  fit() { const g = fitCanvas(this.canvas); this.ctx = g.ctx; this.w = g.w; this.h = g.h; }

  make(kind) {
    let s = Math.pow(Math.random(), 1.7);
    if (kind === 'attended') s += 0.24;
    if (kind === 'felt') s += 0.4;
    return {
      x: 0.01, y: 0.14 + Math.random() * 0.78, vx: 0.07 + Math.random() * 0.05, vy: 0,
      s, kind, r: 1.6 + Math.random() * 1.6, fade: 1, dying: false, phase: Math.random() * TAU,
    };
  }

  keep(p, instant = false) {
    const r = Math.random();
    let acc = 0, shelf = SHELVES[0];
    for (const sh of SHELVES) { acc += sh.w; if (r < acc) { shelf = sh; break; } }
    if (p.kind === 'dream') shelf = SHELVES[0];
    p.tx = 0.65 + Math.random() * 0.32;
    p.ty = shelf.y0 + 0.03 + Math.random() * (shelf.y1 - shelf.y0 - 0.06);
    p.settled = instant;
    if (instant) { p.x = p.tx; p.y = p.ty; }
    p.size = 1.4 + Math.min(2.2, p.s * 2);
    this.kept.push(p);
    this.keptCount++;
    // nothing is ever purged: when it gets crowded, older memories merge
    // into brighter, denser ones instead of disappearing
    if (this.kept.length > 340) {
      const a = this.kept.shift();
      let best = null, bd = 1e9;
      for (const b of this.kept) { const d = (a.tx - b.tx) ** 2 + (a.ty - b.ty) ** 2; if (d < bd) { bd = d; best = b; } }
      if (best) best.size = Math.min(5.5, best.size + 0.35);
    }
  }

  setDreaming(on) {
    this.isDreaming = on;
    if (!on) {
      // she wakes up with pieces of the dream, not the whole thing
      const n = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        const p = this.make('dream'); p.x = 0.5 + Math.random() * 0.1; p.y = 0.2 + Math.random() * 0.6; p.s = 0.8;
        this.keep(p);
      }
      this.fragments.length = 0;
    }
  }

  update(dt, t) {
    dt = Math.min(dt, 0.05);
    this.dreaming += ((this.isDreaming ? 1 : 0) - this.dreaming) * (1 - Math.exp(-dt * 1.2));

    // sensing: a constant trickle of the world (stops while she sleeps)
    if (!this.isDreaming) {
      this.spawnAcc += dt * (this.reduced ? 7 : 16);
      while (this.spawnAcc > 1) {
        this.spawnAcc -= 1;
        const r = Math.random();
        this.flow.push(this.make(r < 0.14 ? 'felt' : r < 0.34 ? 'attended' : 'plain'));
      }
    }

    for (let i = this.flow.length - 1; i >= 0; i--) {
      const p = this.flow[i];
      if (p.dying) {
        p.fade -= dt * 1.1; p.vy += dt * 0.02; p.y += p.vy * dt; p.x += p.vx * dt * 0.2;
        if (p.fade <= 0) { this.flow.splice(i, 1); this.gone++; }
        continue;
      }
      p.phase += dt * 3;
      p.x += p.vx * dt * (this.isDreaming ? 0.35 : 1);
      p.y += Math.sin(p.phase) * 0.012 * dt;
      for (const z of ZONES) {
        if (z.need && p.x > z.x1 - 0.01 && p.x < z.x1 + 0.01 && p.s < z.need) { p.dying = true; break; }
      }
      if (!p.dying && p.x >= 0.63) { this.flow.splice(i, 1); this.keep(p); }
    }

    for (const k of this.kept) {
      if (!k.settled) {
        k.x += (k.tx - k.x) * (1 - Math.exp(-dt * 2.4));
        k.y += (k.ty - k.y) * (1 - Math.exp(-dt * 2.4));
        if (Math.abs(k.x - k.tx) + Math.abs(k.y - k.ty) < 0.002) k.settled = true;
      }
    }

    // dreams: a few kept memories drift loose and get stitched together
    if (this.isDreaming && Math.random() < dt * 1.3 && this.kept.length > 4) {
      const pick = [];
      for (let i = 0; i < 3 + (Math.random() * 3 | 0); i++) pick.push(this.kept[(Math.random() * this.kept.length) | 0]);
      const cx = 0.25 + Math.random() * 0.3, cy = 0.25 + Math.random() * 0.5;
      this.fragments.push({ pts: pick.map((k) => ({ x: k.tx, y: k.ty, dx: cx + (Math.random() - 0.5) * 0.12, dy: cy + (Math.random() - 0.5) * 0.2, c: k.kind })), life: 0 });
    }
    for (let i = this.fragments.length - 1; i >= 0; i--) {
      this.fragments[i].life += dt;
      if (this.fragments[i].life > 4) this.fragments.splice(i, 1);
    }

    if (this.keptEl) { const s = String(this.keptCount); if (this.keptEl.textContent !== s) this.keptEl.textContent = s; }
    if (this.goneEl) { const s = String(this.gone); if (this.goneEl.textContent !== s) this.goneEl.textContent = s; }

    if (this.visible) this.draw(t);
  }

  draw(t) {
    const { ctx, w, h } = this;
    const d = this.dreaming;
    ctx.clearRect(0, 0, w, h);
    if (d > 0.01) {
      const g = ctx.createRadialGradient(w * 0.4, h * 0.5, 0, w * 0.4, h * 0.5, w * 0.7);
      g.addColorStop(0, `rgba(90,60,160,${0.28 * d})`); g.addColorStop(1, 'rgba(20,16,50,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
    // zones
    ctx.font = '10px "JetBrains Mono", monospace';
    for (const z of ZONES) {
      const x = z.x0 * w;
      if (z.x0 > 0) {
        ctx.strokeStyle = 'rgba(239,232,240,0.09)';
        ctx.setLineDash([3, 5]);
        ctx.beginPath(); ctx.moveTo(x + 0.5, 30); ctx.lineTo(x + 0.5, h - 12); ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.fillStyle = 'rgba(144,137,166,0.95)';
      ctx.fillText(z.name.toUpperCase(), x + 12, 22);
    }
    ctx.fillStyle = 'rgba(90,85,111,1)';
    for (const sh of SHELVES) ctx.fillText(sh.name, w * 0.63 + 12, sh.y0 * h + 12);

    // dream connections between kept memories
    if (d > 0.02) {
      ctx.lineWidth = 0.8;
      const K = this.kept;
      for (let i = 0; i < K.length; i += 2) {
        const a = K[i];
        for (let j = i + 1; j < Math.min(K.length, i + 14); j++) {
          const b = K[j];
          const dd = Math.hypot((a.x - b.x) * w, (a.y - b.y) * h);
          if (dd < 60) {
            ctx.strokeStyle = `rgba(196,170,255,${(1 - dd / 60) * 0.35 * d * (0.6 + 0.4 * Math.sin(t * 2 + i))})`;
            ctx.beginPath(); ctx.moveTo(a.x * w, a.y * h); ctx.lineTo(b.x * w, b.y * h); ctx.stroke();
          }
        }
      }
      for (const f of this.fragments) {
        const e = Math.min(1, f.life / 1.2), fade = f.life < 3 ? 1 : 1 - (f.life - 3);
        ctx.strokeStyle = `rgba(214,196,255,${0.45 * fade * d})`;
        ctx.beginPath();
        f.pts.forEach((p, i) => {
          const x = (p.x + (p.dx - p.x) * e) * w, y = (p.y + (p.dy - p.y) * e) * h;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        });
        ctx.stroke();
        for (const p of f.pts) {
          const x = (p.x + (p.dx - p.x) * e) * w, y = (p.y + (p.dy - p.y) * e) * h;
          ctx.fillStyle = `rgba(230,220,255,${0.9 * fade * d})`;
          ctx.beginPath(); ctx.arc(x, y, 2.4, 0, TAU); ctx.fill();
        }
      }
    }

    // flowing moments
    for (const p of this.flow) {
      ctx.globalAlpha = Math.max(0, p.fade) * (1 - d * 0.5);
      ctx.fillStyle = KIND[p.kind];
      ctx.beginPath(); ctx.arc(p.x * w, p.y * h, p.r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // what she kept
    ctx.globalCompositeOperation = 'lighter';
    for (const k of this.kept) {
      const tw = 0.75 + 0.25 * Math.sin(t * 1.3 + k.phase);
      ctx.fillStyle = KIND[k.kind];
      ctx.globalAlpha = 0.25 * tw;
      ctx.beginPath(); ctx.arc(k.x * w, k.y * h, k.size * 2.6, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.9 * tw;
      ctx.beginPath(); ctx.arc(k.x * w, k.y * h, k.size, 0, TAU); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    // legend
    const lg = [['felt', 'emotion'], ['attended', 'attention'], ['plain', 'just noticed'], ['dream', 'dream']];
    let lx = 12;
    for (const [k, label] of lg) {
      ctx.fillStyle = KIND[k]; ctx.beginPath(); ctx.arc(lx + 3, h - 15, 3, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(144,137,166,0.95)'; ctx.fillText(label, lx + 11, h - 11);
      lx += ctx.measureText(label).width + 30;
    }
    if (d > 0.3) {
      ctx.fillStyle = `rgba(214,196,255,${d})`;
      ctx.font = 'italic 20px "Instrument Serif", serif';
      ctx.fillText('dreaming…', w * 0.24, h * 0.52);
    }
  }
}

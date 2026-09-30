/*
 * stage.js - the fixed canvas she lives on while you scroll.
 * Owns the camera choreography, what she pays attention to, and pokes.
 */
import * as THREE from 'three';
import { Reflexes, approach, clamp } from './reflexes.js';

// Where she stands for each part of the page.
//   sx    - her horizontal place on screen (-1 left .. 1 right)
//   dist  - camera distance from her face
//   look  - camera aim height relative to her head (negative = lower)
//   orbit - camera angle around her (radians)
//   alpha - how visible she is
const WIDE = {
  hero:    { sx: 0.30, dist: 2.35, look: -0.26, orbit: -0.16, alpha: 1 },
  body:    { sx: 0.40, dist: 1.02, look: -0.06, orbit: -0.26, alpha: 1 },
  tree:    { sx: 0.52, dist: 2.6, look: -0.32, orbit: -0.3, alpha: 0 },
  mind:    { sx: 0.42, dist: 1.7, look: -0.16, orbit: -0.22, alpha: 1 },
  rules:   { sx: -0.38, dist: 1.55, look: -0.14, orbit: 0.26, alpha: 1 },
  star:    { sx: 0.38, dist: 1.22, look: -0.08, orbit: -0.18, alpha: 1 },
  sofar:   { sx: 0.44, dist: 2.35, look: -0.26, orbit: -0.32, alpha: 1 },
  words:   { sx: 0.36, dist: 1.4, look: -0.1, orbit: -0.12, alpha: 1 },
  someday: { sx: 0.0, dist: 3.2, look: -0.3, orbit: 0, alpha: 0 },
  together:{ sx: 0.42, dist: 1.9, look: -0.2, orbit: -0.18, alpha: 1 },
  footer:  { sx: 0.0, dist: 2.7, look: -0.2, orbit: 0.0, alpha: 1 },
};
const TALL = {
  hero:    { sx: 0.0, dist: 3.5, look: -0.26, orbit: -0.1, alpha: 1 },
  body:    { sx: 0.0, dist: 1.6, look: -0.2, orbit: -0.15, alpha: 0.2 },
  tree:    { sx: 0.0, dist: 2.6, look: -0.32, orbit: 0, alpha: 0 },
  mind:    { sx: 0.0, dist: 2.0, look: -0.3, orbit: -0.15, alpha: 0.22 },
  rules:   { sx: 0.0, dist: 1.8, look: -0.3, orbit: 0.2, alpha: 0.22 },
  star:    { sx: 0.0, dist: 1.5, look: -0.3, orbit: -0.1, alpha: 0.28 },
  sofar:   { sx: 0.0, dist: 2.2, look: -0.35, orbit: -0.2, alpha: 0.22 },
  words:   { sx: 0.0, dist: 1.6, look: -0.34, orbit: 0, alpha: 0.35 },
  someday: { sx: 0.0, dist: 3, look: -0.3, orbit: 0, alpha: 0 },
  together:{ sx: 0.0, dist: 2.0, look: -0.3, orbit: -0.12, alpha: 0.22 },
  footer:  { sx: 0.0, dist: 3.3, look: -0.14, orbit: 0, alpha: 1 },
};

// her professional look is a bust of light, so it's framed closer
const PRO_WIDE = {
  hero:  { dist: 1.42, look: -0.13, orbit: -0.12 },
  body:  { dist: 1.05, look: -0.06 },
  mind:  { dist: 1.2, look: -0.09 },
  rules: { dist: 1.15, look: -0.09 },
  star:  { dist: 1.0, look: -0.05 },
  sofar: { dist: 1.35, look: -0.12 },
  words: { dist: 1.1, look: -0.07 },
  together: { dist: 1.25, look: -0.1 },
  footer:{ dist: 1.5, look: -0.1 },
};
const PRO_TALL = {
  hero:  { dist: 1.9, look: -0.13 },
  body:  { dist: 1.3, look: -0.1 },
  mind:  { dist: 1.5, look: -0.1 },
  rules: { dist: 1.4, look: -0.1 },
  star:  { dist: 1.3, look: -0.1 },
  sofar: { dist: 1.6, look: -0.12 },
  words: { dist: 1.3, look: -0.1 },
  together: { dist: 1.5, look: -0.1 },
  footer:{ dist: 2.0, look: -0.06 },
};

// her petal figure is full-body, so every section frames all (or most) of her
const FULL_WIDE = {
  hero:  { sx: 0.3, dist: 1.6, look: -0.16, orbit: -0.1 },
  body:  { sx: 0.4, dist: 1.15, look: -0.07, orbit: -0.16 },
  mind:  { sx: 0.42, dist: 1.4, look: -0.12, orbit: -0.14 },
  rules: { sx: -0.38, dist: 1.4, look: -0.12, orbit: 0.14 },
  star:  { sx: 0.38, dist: 1.25, look: -0.08, orbit: -0.1 },
  sofar: { sx: 0.44, dist: 1.55, look: -0.15, orbit: -0.14 },
  words: { sx: 0.36, dist: 1.3, look: -0.1, orbit: -0.08 },
  together: { sx: 0.42, dist: 1.45, look: -0.12, orbit: -0.1 },
  footer:{ sx: 0, dist: 1.7, look: -0.12, orbit: 0 },
};
const FULL_TALL = {
  hero:  { dist: 2.1, look: -0.15 },
  body:  { dist: 1.6, look: -0.12 },
  mind:  { dist: 1.8, look: -0.12 },
  rules: { dist: 1.8, look: -0.12 },
  star:  { dist: 1.7, look: -0.12 },
  sofar: { dist: 1.9, look: -0.14 },
  words: { dist: 1.7, look: -0.12 },
  together: { dist: 1.8, look: -0.12 },
  footer:{ dist: 2.1, look: -0.06 },
};

const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
const _n = new THREE.Vector3();
const _ray = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const _plane = new THREE.Plane();

export class Stage {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(22, 1, 0.05, 60);
    this.reflexes = new Reflexes();
    this.body = null;
    this.stageName = 'hero';
    this.p = { ...WIDE.hero };
    this.alphaShown = 0;         // global fade (wake-up)
    this.alphaGoal = 0;
    this.pointer = { x: -1, y: -1, lastMove: -1e9, onFace: 0, faceSince: -1, inside: false };
    this.focus = null;           // {el, label}
    this.override = null;        // {point, until, label}
    this.wander = null;
    this.lastActivity = performance.now();
    this.attentionLabel = 'nothing yet';
    this.headScreen = { x: 0, y: 0, visible: false, r: 0 };
    this.parallax = { x: 0, y: 0 };
    this.clock = new THREE.Clock();
    this.lights();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  lights() {
    const s = this.scene;
    s.add(new THREE.HemisphereLight(0xdfe6ff, 0x3a2430, 0.9));
    const key = new THREE.DirectionalLight(0xfff1f3, 1.7);
    key.position.set(-1.2, 2.2, 2.6);
    s.add(key);
    const fill = new THREE.DirectionalLight(0x9fc2ff, 0.55);
    fill.position.set(2, 0.6, 1.2);
    s.add(fill);
  }

  get tall() { return this.w / this.h < 0.9; }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth; this.h = window.innerHeight;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(this.w, this.h, false);
    this.camera.aspect = this.w / this.h;
    this.camera.updateProjectionMatrix();
    this.setStage(this.stageName, true);
  }

  setStage(name, instant = false) {
    const table = this.tall ? TALL : WIDE;
    if (!table[name]) return;
    this.stageName = name;
    const g = { ...table[name] };
    // her professional look is a bust of light, so every framing sits closer
    if (this.body?.framing === 'full') Object.assign(g, (this.tall ? FULL_TALL : FULL_WIDE)[name] || {});
    else if (this.body?.kind === 'wisp' || this.body?.framing === 'bust') Object.assign(g, (this.tall ? PRO_TALL : PRO_WIDE)[name] || {});
    this.goal = g;
    if (instant) Object.assign(this.p, this.goal);
  }

  setBody(body) {
    const first = !this.body;
    if (this.body && this.body !== body) this.body.setVisible?.(false);
    this.body = body;
    body.setVisible?.(true);
    this.origin = body.headWorld(new THREE.Vector3());
    if (first) {
      this.reflexes.head.copy(this.origin).add(new THREE.Vector3(0, -0.4, 1));
      this.reflexes.eye.copy(this.reflexes.head);
      this.reflexes.eyeGoal.copy(this.reflexes.head);
    }
    this.setStage(this.stageName, true);
  }

  /* ---------- input ---------- */

  activity() {
    this.lastActivity = performance.now();
    if (this.reflexes.mood.asleep && !this.reflexes.mood.dreaming && this.awake) this.reflexes.wake();
  }

  pointerMove(x, y) {
    const now = performance.now();
    const p = this.pointer;
    if (p.x >= 0) {
      const speed = Math.hypot(x - p.x, y - p.y) / Math.max(1, now - p.lastMove);
      p.speed = speed;
    }
    p.x = x; p.y = y; p.lastMove = now; p.inside = true;
    this.activity();
  }

  lookAtElement(el, label) { this.focus = el ? { el, label } : null; }

  lookAway(ms = 3000, label = 'anywhere but you') {
    const side = Math.random() < 0.5 ? -1 : 1;
    const o = this.origin || _v.set(0, 1.4, 0);
    this.override = {
      point: new THREE.Vector3(o.x + side * 1.4, o.y - 0.35, o.z + 1.2),
      until: performance.now() + ms, label,
    };
  }

  glanceAt(x, y, ms = 900, label = 'that') {
    const p = this.screenToWorld(x, y);
    if (p) this.override = { point: p.clone(), until: performance.now() + ms, label };
  }

  /* ---------- projection helpers ---------- */

  screenToWorld(x, y) {
    if (!this.origin) return null;
    _ndc.set((x / this.w) * 2 - 1, -(y / this.h) * 2 + 1);
    _ray.setFromCamera(_ndc, this.camera);
    const D = this.camera.position.distanceTo(this.origin);
    this.camera.getWorldDirection(_n);
    _w.copy(this.camera.position).addScaledVector(_n, D * 0.52);
    _plane.setFromNormalAndCoplanarPoint(_n, _w);
    const hit = new THREE.Vector3();
    return _ray.ray.intersectPlane(_plane, hit) ? hit : null;
  }

  worldToScreen(p, out = { x: 0, y: 0 }) {
    _v.copy(p).project(this.camera);
    out.x = (_v.x * 0.5 + 0.5) * this.w;
    out.y = (-_v.y * 0.5 + 0.5) * this.h;
    out.z = _v.z;
    return out;
  }

  hitTest(x, y) {
    if (!this.body || this.alphaShown * this.p.alpha < 0.35) return false;
    if (this.body.kind === 'vrm') {
      _ndc.set((x / this.w) * 2 - 1, -(y / this.h) * 2 + 1);
      _ray.setFromCamera(_ndc, this.camera);
      const hits = _ray.intersectObject(this.body.vrm.scene, true);
      return hits.length > 0;
    }
    const hs = this.headScreen;
    if (this.body.framing === 'full') {
      // anywhere on her, from the top of her head to her feet
      // her head and upper body, down to the bottom of the screen
      return y > hs.y - hs.r * 1.5 && Math.abs(x - hs.x) < hs.r * (y < hs.y + hs.r * 1.5 ? 1.3 : 3.2);
    }
    const dx = (x - hs.x) / (hs.r * 2.6), dy = (y - (hs.y + hs.r * 1.6)) / (hs.r * 3.6);
    return dx * dx + dy * dy < 1;
  }

  /* ---------- what is she paying attention to? ---------- */

  desiredTarget(now) {
    const R = this.reflexes;
    const m = R.mood;
    const o = this.origin;
    const cam = this.camera.position;

    if (m.asleep) {
      this.attentionLabel = m.dreaming ? 'a dream' : 'nothing (asleep)';
      return _w.set(o.x, o.y - 0.9, o.z + 1.2);
    }
    if (this.override && now < this.override.until) {
      this.attentionLabel = this.override.label;
      return this.override.point;
    }
    this.override = null;

    const p = this.pointer;
    const recent = now - p.lastMove < 4200 && p.inside;

    if (recent && p.onFace > 0.5) { this.attentionLabel = 'you'; return cam; }

    if (this.focus && this.focus.el.isConnected) {
      const r = this.focus.el.getBoundingClientRect();
      if (r.bottom > 0 && r.top < this.h) {
        const hit = this.screenToWorld(r.left + r.width * 0.5, r.top + Math.min(r.height * 0.5, 60));
        if (hit) { this.attentionLabel = this.focus.label; return hit; }
      }
    }

    if (recent) {
      const hit = this.screenToWorld(p.x, p.y);
      if (hit) { this.attentionLabel = 'your cursor'; return hit; }
    }

    // nothing to follow - her attention wanders on its own
    if (!this.wander || now > this.wander.until) this.pickWander(now);
    this.attentionLabel = this.wander.label;
    return this.wander.label === 'you' ? cam : this.wander.point;
  }

  pickWander(now) {
    const m = this.reflexes.mood;
    const o = this.origin;
    const r = Math.random();
    const youChance = 0.42 - m.bored * 0.3;
    let label, point = new THREE.Vector3();
    if (r < youChance) { label = 'you'; }
    else if (r < youChance + 0.2 + m.bored * 0.15) {
      label = 'the petals';
      point.set(o.x + (Math.random() - 0.5) * 2.2, o.y + 0.5 + Math.random() * 0.6, o.z + 1.4);
    } else if (r < 0.85) {
      label = 'somewhere else';
      point.set(o.x + (Math.random() < 0.5 ? -1 : 1) * (0.6 + Math.random() * 1.2), o.y + (Math.random() - 0.6) * 0.5, o.z + 1.3);
    } else {
      label = 'the floor';
      point.set(o.x + (Math.random() - 0.5) * 0.8, o.y - 1.2, o.z + 1.2);
    }
    const dur = (1.3 + Math.random() * 2.8) * (label === 'you' ? 1.4 : 1) * 1000;
    this.wander = { label, point, until: now + dur };
  }

  /* ---------- the loop ---------- */

  update(dtOverride, skipRender = false) {
    const real = this.clock.getDelta();
    const dt = dtOverride ?? Math.min(real, 0.1);
    const now = performance.now();
    const R = this.reflexes;

    // choreography - everything eases toward the current part of the page
    const g = this.goal || this.p;
    const rate = 2.1;
    for (const k of ['sx', 'dist', 'look', 'orbit', 'alpha']) this.p[k] = approach(this.p[k], g[k], rate, dt);
    this.alphaShown = approach(this.alphaShown, this.alphaGoal, 2.4, dt);
    const alpha = clamp(this.p.alpha * this.alphaShown);
    this.canvas.style.opacity = alpha.toFixed(3);
    this.visibleAlpha = alpha;

    if (!this.body) return;

    // camera: orbit around her face, lens-shifted so she sits where the page wants her
    const o = this.origin;
    const px = this.parallax;
    const tx = (this.pointer.inside ? (this.pointer.x / this.w - 0.5) : 0);
    const ty = (this.pointer.inside ? (this.pointer.y / this.h - 0.5) : 0);
    px.x = approach(px.x, tx, 1.5, dt); px.y = approach(px.y, ty, 1.5, dt);
    const ang = this.p.orbit + px.x * 0.05;
    const cy = o.y + this.p.look + 0.03 - px.y * 0.03;
    this.camera.position.set(o.x + Math.sin(ang) * this.p.dist, cy + 0.02, o.z + Math.cos(ang) * this.p.dist);
    this.camera.lookAt(o.x, cy, o.z);
    const shift = -this.p.sx * this.w * 0.5;
    this.camera.setViewOffset(this.w, this.h, shift, 0, this.w, this.h);
    this.camera.updateMatrixWorld();

    // is the cursor on her face?
    const face = this.body.faceWorld(_v);
    const hs = this.worldToScreen(face, this.headScreen);
    const faceR = (0.1 / this.p.dist) * this.h * 1.1;
    hs.r = faceR;
    hs.visible = alpha > 0.4;
    const onFace = hs.visible && this.pointer.inside && Math.hypot(this.pointer.x - hs.x, this.pointer.y - hs.y) < faceR;
    this.pointer.onFace = approach(this.pointer.onFace, onFace ? 1 : 0, 6, dt);
    if (onFace) {
      if (this.pointer.faceSince < 0) this.pointer.faceSince = now;
    } else this.pointer.faceSince = -1;

    const idle = this.awake ? (now - this.lastActivity) / 1000 : 0;
    const desired = this.desiredTarget(now);
    R.update(dt, { desired, origin: o, idle });
    this.body.update(dt, R, this.camera, this.renderer);

    if (alpha > 0.005 && !skipRender) this.renderer.render(this.scene, this.camera);
  }
}

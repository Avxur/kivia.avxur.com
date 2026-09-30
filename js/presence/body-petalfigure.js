/*
 * body-petalfigure.js - Kivia as a loose gathering of cherry blossom petals
 * in the shape of a person (DRAFT).
 *
 * Full body, standing. Nothing solid: petals of different sizes, spaced so
 * you see through her, a little denser where her clothes are, her face just
 * outlined, and her deep rose eyes. Petals drift around her and some let go on the
 * wind. When you look away she scatters, and when you come back she gathers
 * herself again.
 *
 * Built from simple shapes (no model, no borrowed assets), so it can live on
 * a public page.
 */
import * as THREE from 'three';
import { clamp } from './reflexes.js';

const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// local space: head centre at 0,0,0 - feet near y = -1.47
const HEAD = { c: V(0, 0, 0), r: V(0.075, 0.1, 0.085) };
const NECK_PIVOT = V(0, -0.12, -0.005);
const SHOULDER = [V(-0.15, -0.215, -0.005), V(0.15, -0.215, -0.005)];
const torsoW = (y) => 0.055 + 0.098 * smooth(-0.15, -0.23, y) - 0.038 * smooth(-0.3, -0.5, y) + 0.02 * smooth(-0.52, -0.66, y);
const torsoD = (y) => 0.042 + 0.042 * smooth(-0.15, -0.26, y) - 0.018 * smooth(-0.34, -0.5, y);
const skirtW = (y) => 0.118 + (0.24 - 0.118) * smooth(-0.5, -0.95, y);
const skirtD = (y) => 0.088 + (0.19 - 0.088) * smooth(-0.5, -0.95, y);
const SKIRT = { y0: -0.49, y1: -0.93 };

/* ---------------- textures ---------------- */

function petalShape(x, r) {
  x.beginPath(); x.moveTo(0, 0);
  x.bezierCurveTo(-r * 0.6, -r * 0.16, -r * 0.7, -r * 0.84, -r * 0.22, -r);
  x.quadraticCurveTo(-r * 0.06, -r * 0.87, 0, -r * 0.8);
  x.quadraticCurveTo(r * 0.06, -r * 0.87, r * 0.22, -r);
  x.bezierCurveTo(r * 0.7, -r * 0.84, r * 0.6, -r * 0.16, 0, 0);
  x.closePath();
}
function atlas() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const x = c.getContext('2d');
  // 0: petal
  x.save(); x.translate(64, 16); x.rotate(Math.PI);
  let g = x.createLinearGradient(0, 0, 0, -100); g.addColorStop(0, '#e9e1e4'); g.addColorStop(0.6, '#faf7f8'); g.addColorStop(1, '#ffffff');
  petalShape(x, 100); x.fillStyle = g; x.fill();
  x.strokeStyle = 'rgba(190,150,165,0.28)'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, -8); x.lineTo(0, -64); x.stroke();
  x.restore();
  // 1: blossom
  x.save(); x.translate(192, 64);
  for (let i = 0; i < 5; i++) { x.save(); x.rotate((i / 5) * TAU);
    g = x.createLinearGradient(0, 0, 0, -56); g.addColorStop(0, '#eedde3'); g.addColorStop(1, '#ffffff');
    petalShape(x, 56); x.fillStyle = g; x.fill(); x.restore(); }
  x.fillStyle = '#d9607f'; x.beginPath(); x.arc(0, 0, 10, 0, TAU); x.fill();
  x.restore();
  // 2: a long petal, for hair
  x.save(); x.translate(320, 8);
  g = x.createLinearGradient(0, 0, 0, 112); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#ece4e7');
  x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(30, 20, 26, 90, 0, 112); x.bezierCurveTo(-26, 90, -30, 20, 0, 0); x.closePath();
  x.fillStyle = g; x.fill();
  x.restore();
  // 3: a small round petal
  x.save(); x.translate(448, 64);
  g = x.createRadialGradient(-8, -8, 0, 0, 0, 44); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#ebe3e6');
  x.beginPath(); x.ellipse(0, 0, 40, 34, 0.4, 0, TAU); x.fillStyle = g; x.fill();
  x.restore();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function eyeTexture(mirror = false) {
  // a small, soft almond in deep rose - drawn on, not glowing
  const c = document.createElement('canvas'); c.width = 128; c.height = 64;
  const x = c.getContext('2d');
  if (mirror) { x.translate(128, 0); x.scale(-1, 1); }
  x.save(); x.translate(64, 32);
  x.beginPath(); x.moveTo(-28, 4); x.quadraticCurveTo(-2, -20, 28, 0); x.quadraticCurveTo(2, 18, -28, 4); x.closePath();
  const a = x.createLinearGradient(0, -16, 0, 16);
  a.addColorStop(0, '#a8324f'); a.addColorStop(1, '#d25a76');
  x.fillStyle = a; x.fill();
  x.fillStyle = 'rgba(255,240,244,0.9)'; x.beginPath(); x.arc(-8, -3, 4, 0, TAU); x.fill();
  x.restore();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function eyePetalTexture(mirror = false) {
  // (parked for now) eyes as petals: one redder-pink sakura petal each,
  // the narrow end toward her nose, the notch outward
  const c = document.createElement('canvas'); c.width = 128; c.height = 80;
  const x = c.getContext('2d');
  if (mirror) { x.translate(128, 0); x.scale(-1, 1); }
  x.save(); x.translate(118, 40); x.scale(1, 0.64); x.rotate(-Math.PI / 2);
  const r = 108;
  const g = x.createLinearGradient(0, 0, 0, -r);
  g.addColorStop(0, '#c43a66'); g.addColorStop(0.5, '#dc5783'); g.addColorStop(1, '#f18dab');
  petalShape(x, r); x.fillStyle = g; x.fill();
  // a soft sheen along one side, and the faint line down its middle
  const s = x.createLinearGradient(-r * 0.5, 0, r * 0.5, 0);
  s.addColorStop(0, 'rgba(255,225,233,0)'); s.addColorStop(0.62, 'rgba(255,225,233,0)'); s.addColorStop(0.85, 'rgba(255,225,233,0.28)'); s.addColorStop(1, 'rgba(255,225,233,0)');
  petalShape(x, r); x.fillStyle = s; x.fill();
  x.strokeStyle = 'rgba(255,214,226,0.3)'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, -10); x.quadraticCurveTo(-3, -45, 0, -74); x.stroke();
  x.restore();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

/* ---------------- shaders ---------------- */

const VERT = /* glsl */`
uniform float uTime; uniform float uBreath; uniform float uEnergy; uniform float uSleep; uniform float uScatter;
uniform float uScale; uniform float uDisperse; uniform mat3 uHeadRot; uniform vec3 uNeck; uniform vec3 uTint;
uniform float uArmL; uniform float uArmR; uniform vec3 uShL; uniform vec3 uShR; uniform float uWind; uniform float uLoose;
attribute vec3 aHome; attribute vec3 aNormal; attribute vec3 aColor;
attribute float aRegion; attribute float aSeed; attribute float aHeadW; attribute float aArm;
attribute float aSize; attribute float aLoose; attribute float aCell; attribute float aRot; attribute float aU;
varying vec3 vColor; varying float vRot; varying float vCell; varying float vAlpha; varying float vFlip;
float hash(float n){ return fract(sin(n) * 43758.5453); }
mat3 rotZ(float a){ float c = cos(a), s = sin(a); return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0); }
void main(){
  vec3 p = aHome, n = aNormal;
  float t = uTime;
  float spiralFade = 1.0;
  if (aRegion == 4.0) {
    float ang = aHome.x + t * (0.45 + 0.25 * hash(aSeed * 3.0));
    float r = aHome.z * (1.0 + uBreath * 0.05);
    p = vec3(cos(ang) * r, aHome.y + sin(t * 0.8 + aSeed * 6.0) * 0.012, sin(ang) * r * 0.75);
    n = normalize(vec3(cos(ang), 0.0, sin(ang)));
    spiralFade = 1.0 - smoothstep(-0.95, -1.25, aHome.y);
  }
  // breathing fills her chest
  float bw = smoothstep(-0.12, -0.3, aHome.y) * (1.0 - smoothstep(-0.42, -0.55, aHome.y)) * (aArm == 0.0 && aRegion < 2.5 ? 1.0 : 0.0);
  p.x *= 1.0 + uBreath * 0.03 * bw; p.z *= 1.0 + uBreath * 0.045 * bw; p.y += uBreath * 0.008 * bw;
  // arms hang and sway from the shoulder
  if (aArm < 0.0) { p = rotZ(uArmL) * (p - uShL) + uShL; n = rotZ(uArmL) * n; }
  if (aArm > 0.0) { p = rotZ(uArmR) * (p - uShR) + uShR; n = rotZ(uArmR) * n; }
  // head turns at the neck; the top of her hair turns with it
  p = mix(p, uHeadRot * (p - uNeck) + uNeck, aHeadW);
  n = normalize(mix(n, uHeadRot * n, aHeadW));
  // hair drifts on the breeze, ends most
  if (aRegion == 2.0) { float w = aU * aU; p.x += (sin(t * 0.8 + aSeed * 5.0) * 0.02 - 0.035) * w; p.z += cos(t * 0.6 + aSeed * 3.0) * 0.012 * w; }
  // the breeze: her downwind side ripples and leans away, like cloth or hair
  if (aRegion < 2.5 || aRegion == 4.0) {
    float lee = smoothstep(0.15, -0.75, n.x);
    float ripple = 0.5 + 0.5 * sin(t * 1.5 + aHome.y * 9.0 + aSeed * 6.0);
    p.x -= lee * uWind * (0.006 + 0.016 * ripple);
    p.y += lee * uWind * 0.006 * sin(t * 1.1 + aSeed * 9.0);
  }
  // every petal hovers around its place
  float fl = 0.0025 + uScatter * 0.008 + aLoose * 0.004;
  p += fl * vec3(sin(t * 1.3 + aSeed * 40.0), sin(t * 1.1 + aSeed * 23.0), cos(t * 1.2 + aSeed * 31.0));
  p += n * uScatter * (0.01 + 0.03 * hash(aSeed * 3.0));

  float alpha = 1.0, spin = 0.0;
  // petals that float around her, not part of her
  if (aRegion == 3.0) {
    float sp = 0.03 + 0.05 * hash(aSeed * 9.0);
    p.y = mod(aHome.y + 1.0 + t * sp, 1.4) - 1.0;
    float a = t * (0.08 + 0.1 * hash(aSeed * 4.0)) + aSeed * 30.0;
    p.x = aHome.x * cos(a * 0.3) + sin(a) * 0.05; p.z = aHome.z * cos(a * 0.2) + cos(a) * 0.05;
    alpha = smoothstep(-1.0, -0.8, p.y) * (1.0 - smoothstep(0.2, 0.4, p.y));
    spin = t * 0.6;
  }
  // loose petals let go on the wind, then grow back
  if (aLoose > 0.0) {
    // uLoose is a clock that already runs faster in a gust or a fright and slower
    // in sleep (see update), so a petal's phase only ever moves forward, gently.
    // (It used to be uTime * speed: with a speed that changes, that product
    // swings further the longer the page has been open, and petals whizzed.)
    float speed = 0.04 + 0.06 * hash(aSeed * 7.0);
    float ph = fract(uLoose * speed + aSeed * 13.0);
    float go = smoothstep(0.5, 1.0, ph) * aLoose;
    vec3 wind = vec3(-0.35 * uWind, -0.1, 0.05) + 0.12 * vec3(hash(aSeed * 5.0) - 0.5, hash(aSeed * 9.0) - 0.3, hash(aSeed * 11.0) - 0.5);
    p += wind * go * 0.6 + vec3(sin(t * 3.0 + aSeed * 10.0), cos(t * 2.3 + aSeed * 6.0), 0.0) * 0.02 * go;
    alpha *= 1.0 - smoothstep(0.75, 1.0, ph) * aLoose;
    spin += go * 6.0;
  }
  // scattered: when you look away she comes apart, and gathers again when you're back
  float delay = hash(aSeed * 29.0) * 0.5 + (aRegion == 4.0 ? 0.25 : (1.0 - clamp((aHome.y + 1.0) / 1.2, 0.0, 1.0)) * 0.2);
  float d = smoothstep(delay, delay + 0.45, uDisperse);
  if (d > 0.0) {
    // where she flies off to is fixed per petal (taken from its resting place, not
    // its moving one), so a scattered petal drifts instead of jumping around
    vec3 home = aRegion == 4.0 ? vec3(cos(aHome.x) * aHome.z, aHome.y, sin(aHome.x) * aHome.z * 0.75) : aHome;
    vec3 away = vec3(hash(aSeed * 3.1) - 0.5, hash(aSeed * 5.3) - 0.35, hash(aSeed * 7.7) - 0.5) + (home - vec3(0.0, -0.3, 0.0)) * 0.7;
    vec3 dir = away / max(length(away), 0.2);
    float dist = 0.3 + 0.9 * hash(aSeed * 11.3);
    vec3 swirl = vec3(sin(t * 0.5 + aSeed * 20.0), sin(t * 0.4 + aSeed * 13.0) * 0.8, cos(t * 0.45 + aSeed * 17.0)) * 0.14;
    p += (dir * dist + vec3(-0.3, 0.15, 0.0) + swirl) * d;
    alpha *= mix(1.0, 0.55, d);
    // a slow tumble; bounded, so it never spins faster the longer the page is open
    spin += d * (7.0 + 1.6 * sin(t * 0.45 + aSeed * 11.0));
  }

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  vec3 nv = normalize(normalMatrix * n);
  float facing = dot(nv, normalize(-mv.xyz));
  float a = aRegion == 3.0 ? 0.8 : aRegion == 4.0 ? (facing > 0.0 ? 0.95 : 0.4) : (facing > 0.0 ? mix(1.0, 0.85, facing) : mix(0.45, 0.22, -facing));
  a = mix(a, 0.75, d);
  // hair behind her head or body stays quiet
  if (aRegion == 2.0 && d < 0.5) {
    vec3 hc = (modelViewMatrix * vec4(uHeadRot * (vec3(0.0) - uNeck) + uNeck, 1.0)).xyz;
    vec2 dh = (mv.xy - hc.xy) / vec2(0.075, 0.1);
    vec3 tc = (modelViewMatrix * vec4(0.0, -0.36, 0.0, 1.0)).xyz;
    vec2 dt_ = (mv.xy - tc.xy) / vec2(0.15, 0.2);
    if ((mv.z < hc.z - 0.01 && dot(dh, dh) < 1.0) || (mv.z < tc.z - 0.03 && dot(dt_, dt_) < 1.0)) a *= 0.5;
  }
  vAlpha = alpha * a * spiralFade;
  gl_PointSize = aSize * uScale / -mv.z * (facing > 0.0 || aRegion == 3.0 ? 1.0 : 0.85);
  vColor = aColor * uTint;
  vRot = aRot + spin + t * (hash(aSeed * 17.0) - 0.5) * 0.4;
  vCell = aCell;
  vFlip = cos(t * (0.35 + 0.55 * hash(aSeed * 21.0)) + aSeed * 50.0);
}`;
const FRAG = /* glsl */`
uniform sampler2D uAtlas;
varying vec3 vColor; varying float vRot; varying float vCell; varying float vAlpha; varying float vFlip;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float s = sin(vRot), co = cos(vRot);
  c = mat2(co, -s, s, co) * c;
  if (vCell != 1.0) c.x /= max(0.3, abs(vFlip));
  c += 0.5;
  if (c.x < 0.0 || c.y < 0.0 || c.x > 1.0 || c.y > 1.0) discard;
  vec4 t = texture2D(uAtlas, vec2((vCell + c.x) * 0.25, 1.0 - c.y));
  float a = t.a * vAlpha;
  if (a < 0.02) discard;
  gl_FragColor = vec4(t.rgb * vColor, a);
  #include <colorspace_fragment>
}`;

/* ---------------- her shape ---------------- */

// surfaces she's made of: each can sample a point on itself and say whether a point is inside it
function ellipsoid(c, r) {
  const area = 4 * Math.PI * (((r.x * r.y) ** 1.6 + (r.x * r.z) ** 1.6 + (r.y * r.z) ** 1.6) / 3) ** (1 / 1.6);
  return {
    area,
    sample() {
      const u = Math.random() * 2 - 1, th = Math.random() * TAU, s = Math.sqrt(1 - u * u);
      const p = V(s * Math.cos(th) * r.x, u * r.y, s * Math.sin(th) * r.z);
      // a narrower chin
      if (p.y < 0) { const k = Math.min(1, -p.y / r.y); p.x *= 1 - k * 0.32; p.z *= 1 - k * 0.1; if (p.y < -0.045) p.z += 0.01 * k; }
      return { p: p.clone().add(c), n: V(p.x / r.x ** 2, p.y / r.y ** 2, p.z / r.z ** 2).normalize() };
    },
    inside(q, m = 0.004) { const d = q.clone().sub(c); return (d.x / r.x) ** 2 + (d.y / r.y) ** 2 + (d.z / r.z) ** 2 < (1 - m / Math.min(r.x, r.y, r.z)) ** 2; },
  };
}
function capsule(a, b, ra, rb) {
  const axis = b.clone().sub(a); const L = axis.length(); axis.normalize();
  const u = Math.abs(axis.y) < 0.9 ? V(0, 1, 0).cross(axis).normalize() : V(1, 0, 0).cross(axis).normalize();
  const w = axis.clone().cross(u);
  const area = Math.PI * (ra + rb) * L + 2 * Math.PI * (ra * ra + rb * rb);
  return {
    area,
    sample() {
      const ext0 = ra / L, ext1 = rb / L;
      const t = rnd(-ext0, 1 + ext1);
      let r = ra + (rb - ra) * clamp(t);
      let along = 0;
      if (t < 0) { const k = -t * L / ra; r = ra * Math.sqrt(Math.max(0, 1 - k * k)); along = -k; }
      if (t > 1) { const k = (t - 1) * L / rb; r = rb * Math.sqrt(Math.max(0, 1 - k * k)); along = k; }
      const th = Math.random() * TAU;
      const radial = u.clone().multiplyScalar(Math.cos(th)).add(w.clone().multiplyScalar(Math.sin(th)));
      const p = a.clone().addScaledVector(axis, t * L).addScaledVector(radial, r);
      return { p, n: radial.clone().addScaledVector(axis, along).normalize(), t: clamp(t) };
    },
    inside(q, m = 0.004) {
      const d = q.clone().sub(a); const t = clamp(d.dot(axis) / L);
      const closest = a.clone().addScaledVector(axis, t * L);
      return q.distanceTo(closest) < ra + (rb - ra) * t - m;
    },
  };
}
function loft(y0, y1, wF, dF, { open = false } = {}) {
  let area = 0; const steps = 40;
  for (let i = 0; i < steps; i++) { const y = y0 + (y1 - y0) * (i + 0.5) / steps; const a = wF(y), b = dF(y); area += Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b))) * Math.abs(y1 - y0) / steps; }
  return {
    area,
    sample() {
      let y;
      for (;;) { y = rnd(y1, y0); if (Math.random() < (wF(y) + dF(y)) / 0.5) break; }
      const th = Math.random() * TAU, hw = wF(y), hd = dF(y);
      const slope = (wF(y + 0.005) - hw) / 0.005;
      return { p: V(Math.cos(th) * hw, y, Math.sin(th) * hd), n: V(Math.cos(th) / hw, Math.max(-1, -slope) * 0.8, Math.sin(th) / hd).normalize(), th };
    },
    inside(q, m = 0.004) {
      if (q.y > y0 || q.y < y1) return false;
      const hw = wF(q.y) - m, hd = dF(q.y) - m;
      return (q.x / hw) ** 2 + (q.z / hd) ** 2 < 1;
    },
  };
}

const C = (hex) => new THREE.Color(hex);
const PAL = {
  body: [C('#f4aabd'), C('#f6b6c6'), C('#f09db3'), C('#f8c2cf')],
  face: [C('#fbd8e1'), C('#fde3ea'), C('#f9cdd8')],
  skin: [C('#ee93aa'), C('#f19fb4'), C('#ea889f')],
  top: [C('#f7b4c5'), C('#f5a8bb'), C('#f9c2d0')],
  skirt: [C('#f29db3'), C('#f4aabd'), C('#ee90a8')],
  hair: [C('#ee9ab0'), C('#f2a9bc'), C('#e98ea6'), C('#f5b6c6')],
  float: [C('#f5afc0'), C('#f8c1ce'), C('#f19cb2')],
};
const pick = (a) => a[(Math.random() * a.length) | 0];

function build(scale) {
  const parts = [];
  const add = (name, surf, opts) => { parts.push({ name, surf, ...opts }); return surf; };
  const S = (x) => x * 1.12 / Math.sqrt(scale);  // spacing grows when we need fewer petals

  const head = add('head', ellipsoid(HEAD.c, HEAD.r), { gap: S(0.018) });
  add('neck', capsule(V(0, -0.075, 0.004), V(0, -0.165, 0), 0.036, 0.04), { gap: S(0.03) });
  const torso = add('torso', loft(-0.15, -0.6, torsoW, torsoD), { gap: S(0.022) });
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = SHOULDER[s < 0 ? 0 : 1];
    const el = V(s * 0.195, -0.47, 0.012), wr = V(s * 0.235, -0.7, 0.04), hd = V(s * 0.25, -0.8, 0.05);
    arms.push(add('upper', capsule(sh, el, 0.043, 0.033), { gap: S(0.028), side: s }));
    add('fore', capsule(el, wr, 0.032, 0.024), { gap: S(0.032), side: s });
    add('hand', capsule(wr, hd, 0.026, 0.02), { gap: S(0.03), side: s });
  }

  // candidates, oversampled, shuffled
  const cands = [];
  for (const part of parts) {
    const n = Math.round(part.surf.area / (part.gap * part.gap) * 3.2);
    for (let i = 0; i < n; i++) cands.push({ part, ...part.surf.sample() });
  }
  for (let i = cands.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [cands[i], cands[j]] = [cands[j], cands[i]]; }

  // keep a petal only if nothing else is too close to it (a loose, even spread), and
  // only if it isn't buried inside another part of her
  const cell = 0.04, grid = new Map();
  const key = (x, y, z) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`;
  const near = (p, r) => {
    const cx = Math.floor(p.x / cell), cy = Math.floor(p.y / cell), cz = Math.floor(p.z / cell);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const list = grid.get(`${cx + dx},${cy + dy},${cz + dz}`);
      if (list) for (const q of list) if (q.distanceToSquared(p) < r * r) return true;
    }
    return false;
  };
  const A = { home: [], nrm: [], col: [], region: [], seed: [], headW: [], arm: [], size: [], loose: [], cell: [], rot: [], u: [] };
  const push = (p, n, col, region, o) => {
    A.home.push(p.x, p.y, p.z); A.nrm.push(n.x, n.y, n.z);
    const k = rnd(0.95, 1.05); A.col.push(col.r * k, col.g * k, col.b * k);
    A.region.push(region); A.seed.push(Math.random()); A.headW.push(o.headW || 0); A.arm.push(o.arm || 0);
    A.size.push(o.size * 1.05); A.loose.push(o.loose || 0); A.cell.push(o.cell ?? 0); A.rot.push(o.rot ?? (Math.PI + rnd(-0.7, 0.7))); A.u.push(o.u || 0);
  };
  for (const c of cands) {
    const { part, p, n } = c;
    const others = parts.filter((q) => q !== part && !(part.name === 'torso' && q.name === 'neck'));
    if (others.some((q) => q.surf.inside(p))) continue;
    // her face: only an outline, so it reads as a face and not a mask
    let gap = part.gap, region = 0, col = pick(PAL.skin), size = rnd(0.02, 0.028), headW = 0, arm = 0, cellI = 0, loose = 0;
    if (part.name === 'head') {
      headW = 1;
      if (p.z < -0.01) continue;                                        // the back of her head is her hair's job
      if (p.y > 0.055 || (p.y > 0.03 && p.z < 0.05)) { region = 2; col = pick(PAL.hair); cellI = 2; size = rnd(0.02, 0.026); }   // the crown
      else {
        // her face: small pale petals, a little space kept around her eyes
        if (Math.abs(p.y + 0.008) < 0.02 && Math.abs(Math.abs(p.x) - 0.028) < 0.022) continue;
        if (Math.random() < 0.1) continue;
        col = pick(PAL.face); size = rnd(0.017, 0.021); cellI = 0; gap = part.gap * 0.9;
      }
    } else if (part.name === 'neck') {
      headW = clamp((p.y + 0.17) / 0.1) * 0.6; size = rnd(0.016, 0.02); cellI = 3;
      if (Math.random() < 0.35) continue;
    } else if (part.name === 'torso') {
      // no clothes: she's petals all the way, thinning out below her waist into the spiral
      region = 1; col = pick(PAL.body); size = rnd(0.022, 0.03);
      const fade = smooth(-0.34, -0.58, p.y);
      if (Math.random() < 0.15 + fade * 0.8) continue;
      loose = Math.max(Math.abs(Math.cos(c.th)) > 0.95 ? 0.3 : 0, fade);
    } else if (part.name === 'upper' || part.name === 'fore' || part.name === 'hand') {
      arm = part.side;
      const sleeve = part.name === 'upper' && c.t < 0.5;
      if (sleeve) { size = rnd(0.018, 0.026); }
      else { size = rnd(0.016, 0.024); if (Math.random() < 0.25) continue; }
      if (part.name === 'hand') { size = rnd(0.013, 0.018); loose = 0.4; }
    }
    if (near(p, gap)) continue;
    const k = key(p.x, p.y, p.z); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(p);
    if (part.name !== 'head' && n.x < -0.45 && Math.random() < 0.32) loose = Math.max(loose, rnd(0.4, 0.8));
    push(p, n, col, region, { headW, arm, size, cell: cellI, loose });
  }

  // hair: strands that start at her crown and the back of her head, hug it
  // down past her ears, then fall behind her shoulders - with a few wisps
  // caught by the wind and a light fringe over her forehead
  const hairPetal = (p, dir, u, headW, loose, size) => {
    if (near(p, S(0.02))) return;
    const k = key(p.x, p.y, p.z); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(p);
    push(p, V(dir.x, 0.2, -0.6), pick(PAL.hair), 2, { headW, size, cell: 2, loose, rot: Math.atan2(dir.x, -dir.y) + rnd(-0.2, 0.2), u });
  };
  const strands = Math.round(52 * scale);
  for (let sIdx = 0; sIdx < strands; sIdx++) {
    const sg = sIdx % 2 ? 1 : -1;
    const th = sg * (0.25 + Math.pow(Math.random(), 0.55) * 1.9);   // 0 = straight back; most strands where you can see them
    const side = Math.sin(th);
    const L = rnd(0.42, 0.62), wave = rnd(0, TAU), drift = rnd(0.02, 0.06);
    let prev = null;
    for (let u = rnd(0, 0.04); u < 1; u += 0.075) {
      // around the head (u < 0.2), then down her back, flaring out as it falls
      const around = smooth(0, 0.2, u);
      const ang = th, lift = 1 - around;
      const rr = Math.hypot(Math.sin(ang) * HEAD.r.x, Math.cos(ang) * HEAD.r.z) * 1.12 + 0.05 * smooth(0.15, 1, u) * Math.abs(side) + 0.015;
      let y = HEAD.r.y * 0.75 * lift - 0.05 * around - (L - 0.05) * Math.max(0, u - 0.2) / 0.8;
      let x = Math.sin(ang) * rr * (1 + 0.35 * smooth(0.25, 1, u)) - drift * u * u + Math.sin(u * 7 + wave) * 0.01 * u;
      let z = -Math.cos(ang) * rr;
      if (y < -0.12) z = Math.min(z, -(torsoD(y) + 0.025));
      if (Math.cos(ang) < -0.2 && y < 0.02) z = Math.min(z, -0.02);        // side strands pass behind her ears
      const p = V(x, y, z);
      const dir = prev ? p.clone().sub(prev).normalize() : V(0, -1, 0);
      if (u > 0.04) hairPetal(p, dir, u, 0.95 * Math.pow(1 - u, 1.5) + 0.05, smooth(0.7, 1, u), rnd(0.024, 0.032) * (1 - u * 0.25));
      prev = p;
    }
  }
  // a light fringe
  for (let b = 0; b < 7; b++) {
    const cx = (b / 6 - 0.5) * 0.1;
    for (let k = 0; k < 2; k++) {
      const y = 0.075 - k * 0.03, ring = Math.sqrt(Math.max(0, 1 - (y / HEAD.r.y) ** 2 - (cx / HEAD.r.x) ** 2));
      hairPetal(V(cx + k * cx * 0.2, y, HEAD.r.z * ring + 0.01), V(cx * 3, -1, 0).normalize(), 0.1, 1, 0, rnd(0.02, 0.026));
    }
  }
  // wisps caught by the wind, off to one side
  for (let sIdx = 0; sIdx < 10; sIdx++) {
    const y0 = rnd(0.02, -0.32), len = rnd(0.14, 0.34);
    let prev = V(-0.09, y0, rnd(-0.06, 0.0));
    for (let k = 1; k <= 6; k++) {
      const u = k / 6;
      const p = V(-(0.09 + u * len), y0 - u * 0.06 + Math.sin(u * 3 + sIdx) * 0.025, prev.z + rnd(-0.01, 0.01));
      const dir = p.clone().sub(prev).normalize();
      push(p, V(-1, 0, 0), pick(PAL.hair), 2, { headW: 0.2, size: rnd(0.02, 0.026) * (1 - u * 0.4), cell: 2, loose: 0.4 + u * 0.6, rot: Math.atan2(dir.x, -dir.y), u: 0.5 + u * 0.5 });
      prev = p;
    }
  }
  // little ribbons of petals trailing off her in the breeze
  const trails = [
    { at: V(-0.17, -0.2, -0.02), arm: 0, n: 4, len: 0.14 },           // shoulder
    { at: V(-0.2, -0.42, 0.0), arm: -1, n: 5, len: 0.18 },            // elbow
    { at: V(-0.24, -0.72, 0.04), arm: -1, n: 5, len: 0.18 },          // hand
    { at: V(-0.1, -0.5, 0.02), arm: 0, n: 5, len: 0.2 },              // waist
    { at: V(-0.06, -0.6, -0.03), arm: 0, n: 6, len: 0.24 },           // where she dissolves
  ];
  for (const tr of trails) {
    let prev = tr.at.clone();
    const up = rnd(-0.06, 0.06), wv = rnd(0, TAU);
    for (let k = 1; k <= tr.n; k++) {
      const u = k / tr.n;
      const p = V(tr.at.x - u * tr.len, tr.at.y + up * u + Math.sin(u * 3 + wv) * 0.02, tr.at.z + rnd(-0.015, 0.015));
      const dir = p.clone().sub(prev).normalize();
      push(p, V(-1, 0, 0.2), pick(PAL.float), 0, { arm: tr.arm, size: rnd(0.018, 0.026) * (1 - u * 0.45), cell: 0, loose: 0.35 + u * 0.6, rot: Math.atan2(dir.x, -dir.y) + rnd(-0.4, 0.4) });
      prev = p;
    }
  }

  // the spiral she floats on: two strands winding down and narrowing
  const NS = Math.round(120 * scale);
  for (let i = 0; i < NS; i++) {
    const u = i / NS, strand = i % 2;
    const y = -0.5 - u * 0.75;
    const r = 0.13 * Math.pow(1 - u, 0.8) + 0.02;
    const ang0 = u * TAU * 2.6 + strand * Math.PI + rnd(-0.15, 0.15);
    push(V(ang0, y, r), V(0, 0, 1), pick(PAL.float), 4, { size: rnd(0.02, 0.028) * (1 - u * 0.4), cell: Math.random() < 0.12 ? 1 : 0, rot: Math.random() * TAU });
  }

  // petals floating around her
  for (let i = 0; i < 70 * scale; i++) {
    const a = Math.random() * TAU, r = rnd(0.18, 0.4);
    push(V(Math.cos(a) * r, rnd(-1.0, 0.4), Math.sin(a) * r * 0.5 - 0.08), V(0, 0, 1), pick(PAL.float), 3, { size: rnd(0.016, 0.026), cell: Math.random() < 0.15 ? 1 : 0, rot: Math.random() * TAU });
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(A.home, 3));
  g.setAttribute('aHome', new THREE.Float32BufferAttribute(A.home, 3));
  g.setAttribute('aNormal', new THREE.Float32BufferAttribute(A.nrm, 3));
  g.setAttribute('aColor', new THREE.Float32BufferAttribute(A.col, 3));
  for (const [k, name] of [['region', 'aRegion'], ['seed', 'aSeed'], ['headW', 'aHeadW'], ['arm', 'aArm'], ['size', 'aSize'], ['loose', 'aLoose'], ['cell', 'aCell'], ['rot', 'aRot'], ['u', 'aU']]) {
    g.setAttribute(name, new THREE.Float32BufferAttribute(A[k], 1));
  }
  g.boundingSphere = new THREE.Sphere(V(0, -0.5, 0), 1.6);
  return g;
}

/* ---------------- the figure ---------------- */

const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler(0, 0, 0, 'YXZ');
const _m4 = new THREE.Matrix4();

export class PetalHumanoid {
  constructor(scene) {
    this.kind = 'petalfigure';
    this.framing = 'full';
    this.group = new THREE.Group();
    this.group.position.set(0, 1.4, 0);
    scene.add(this.group);
    const small = window.innerWidth < 760 || (navigator.hardwareConcurrency || 8) <= 4;
    this.geo = build(small ? 0.7 : 1);
    this.count = this.geo.attributes.position.count;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
      uniforms: {
        uTime: { value: 0 }, uBreath: { value: 0 }, uEnergy: { value: 0.3 }, uSleep: { value: 0 }, uScatter: { value: 0 },
        uScale: { value: 900 }, uDisperse: { value: 0 }, uHeadRot: { value: new THREE.Matrix3() }, uNeck: { value: NECK_PIVOT.clone() },
        uTint: { value: new THREE.Color(1, 1, 1) }, uArmL: { value: 0 }, uArmR: { value: 0 },
        uShL: { value: SHOULDER[0].clone() }, uShR: { value: SHOULDER[1].clone() }, uAtlas: { value: atlas() }, uWind: { value: 1 }, uLoose: { value: 0 },
      },
    });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    this.group.add(this.points);
    this.eyeTex = { soft: [eyeTexture(false), eyeTexture(true)], petal: [eyePetalTexture(false), eyePetalTexture(true)] };
    const eyeTex = this.eyeTex.soft;
    this.eyes = [-1, 1].map((side) => {
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: eyeTex[side < 0 ? 0 : 1], transparent: true, depthWrite: false, depthTest: false }));
      m.userData.side = side; m.renderOrder = 3; this.group.add(m); return m;
    });
    this.eyeStyle = 'soft';   // 'soft' (her eyes) | 'petal' (parked idea: a petal for each eye) | 'none'
    this.eyeTilt = 0.25;      // petal eyes only: how far their outer ends dip
    // a faint light behind her face, so it reads as a face and not a gap
    const gc = document.createElement('canvas'); gc.width = gc.height = 64;
    const gx = gc.getContext('2d'); const gg = gx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gg.addColorStop(0, 'rgba(255,226,234,0.9)'); gg.addColorStop(1, 'rgba(255,226,234,0)');
    gx.fillStyle = gg; gx.fillRect(0, 0, 64, 64);
    const gt = new THREE.CanvasTexture(gc); gt.colorSpace = THREE.SRGBColorSpace;
    this.faceGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: gt, transparent: true, depthWrite: false, depthTest: false, opacity: 0.22 }));
    this.faceGlow.renderOrder = 2; this.group.add(this.faceGlow);
    this.t = 0;
    this.headQ = new THREE.Quaternion();
    this.headRot = new THREE.Matrix3();
    this.scatter = 0;
    this.tint = new THREE.Color(1, 1, 1);
    // disperse / gather
    this.disperse = 0; this.disperseGoal = 0;
    this.weight = 0; this.weightGoal = 0; this.weightTimer = 4;
  }

  setVisible(v) { this.group.visible = v; }
  headWorld(out) { return out.copy(this.group.position); }
  faceWorld(out) { return out.copy(this.group.position).add(_v.set(0, -0.005, 0.085)); }
  scatterAway(instant = false) { this.disperseGoal = 1; if (instant) this.disperse = 1; }
  gather() { this.disperseGoal = 0; }
  get scattered() { return this.disperse > 0.5; }

  update(dt, R, camera, renderer) {
    this.t += dt;
    const m = R.mood, u = this.mat.uniforms;
    u.uTime.value = this.t;
    u.uBreath.value = R.breath.value;
    u.uEnergy.value = m.arousal;
    u.uSleep.value = m.asleep ? 1 : m.sleepy * 0.6;
    this.scatter += (m.surprise - this.scatter) * (1 - Math.exp(-dt * (m.surprise > this.scatter ? 14 : 3)));
    u.uScatter.value = this.scatter;
    if (camera && renderer) u.uScale.value = renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));

    // the breeze rises and falls, never on a beat
    u.uWind.value = 0.8 + 0.25 * Math.sin(this.t * 0.31) + 0.15 * Math.sin(this.t * 0.77 + 1.3) + 0.08 * Math.sin(this.t * 1.9);
    // the loose petals' own clock: faster in a gust, a fright or when she's lively, slower asleep
    u.uLoose.value += dt * (1 + this.scatter * 3 + u.uEnergy.value * 0.4 + (u.uWind.value - 1) * 0.6) * (1 - u.uSleep.value * 0.5);
    // scattering takes ~2 s, gathering back ~2.5 s
    const dir = Math.sign(this.disperseGoal - this.disperse);
    this.disperse = clamp(this.disperse + dir * dt / (dir > 0 ? 2.0 : 2.5));
    u.uDisperse.value = this.disperse;

    const goal = m.dreaming ? [0.88, 0.85, 1.08] : m.annoy > 0.4 ? [1.04, 0.88, 0.9] : m.joy > 0.3 ? [1.03, 1.0, 1.0] : [1, 1, 1];
    const k = 1 - Math.exp(-dt * 2);
    this.tint.setRGB(this.tint.r + (goal[0] - this.tint.r) * k, this.tint.g + (goal[1] - this.tint.g) * k, this.tint.b + (goal[2] - this.tint.b) * k);
    u.uTint.value.copy(this.tint);

    // head
    _v.subVectors(R.head, this.group.position);
    const yaw = clamp(Math.atan2(_v.x, _v.z) * 0.55, -0.6, 0.6);
    let pitch = clamp(-Math.atan2(_v.y, Math.hypot(_v.x, _v.z)) * 0.5, -0.28, 0.32);
    const sleep = clamp(R.blink.lid * (m.asleep ? 1 : 0.4));
    pitch += sleep * 0.3 - R.yawn.amt * 0.18 - m.surprise * 0.05;
    const roll = R.tilt + sleep * 0.1 + Math.sin(this.t * 0.29) * 0.015;
    _e.set(pitch, yaw, roll, 'YXZ');
    this.headQ.setFromEuler(_e);
    this.headRot.setFromMatrix4(_m4.makeRotationFromQuaternion(this.headQ));
    u.uHeadRot.value.copy(this.headRot);

    // arms and stance
    const sway = Math.sin(this.t * 0.5) * 0.03;
    u.uArmL.value = -0.05 - sway - R.breath.value * 0.012 + m.shy * 0.12 - m.surprise * 0.1;
    u.uArmR.value = 0.05 + sway * 0.8 + R.breath.value * 0.012 - m.shy * 0.12 + m.surprise * 0.1;
    this.weightTimer -= dt;
    if (this.weightTimer <= 0) { this.weightGoal = rnd(-1, 1); this.weightTimer = rnd(5, 12); }
    this.weight += (this.weightGoal - this.weight) * (1 - Math.exp(-dt * 0.8));
    this.group.rotation.set(0, Math.sin(this.t * 0.23) * 0.04, this.weight * 0.012 + Math.sin(this.t * 0.37) * 0.006);

    const presentFace = 1 - smooth(0.05, 0.4, this.disperse);
    this.faceGlow.position.copy(_v.set(0, -0.01, HEAD.r.z * 0.6).sub(NECK_PIVOT).applyQuaternion(this.headQ).add(NECK_PIVOT));
    this.faceGlow.scale.set(0.15, 0.19, 1);
    this.faceGlow.material.opacity = 0.22 * presentFace * (m.asleep ? 0.6 : 1);
    // eyes
    const open = 1 - R.blink.value;
    _v.subVectors(R.eye, this.group.position).applyQuaternion(_q.copy(this.headQ).invert());
    const gx = clamp(_v.x / Math.max(0.2, _v.z), -1, 1) * 0.006;
    const gy = clamp(_v.y / Math.max(0.2, _v.z), -1, 1) * 0.004;
    const widen = 1 + m.surprise * 0.3;
    const soften = 1 - clamp(m.joy * 0.9) * 0.4 - clamp(m.annoy) * 0.25;
    const t = this.t;
    const petal = this.eyeStyle === 'petal';
    // petal eyes leave with the rest of her and drift in the cloud; her own eyes just fade
    const away = petal ? smooth(0.02, 0.45, this.disperse) : 0;
    const present = 1 - smooth(0.05, 0.4, this.disperse);
    for (const e of this.eyes) {
      const s = e.userData.side;
      const tex = this.eyeTex[petal ? 'petal' : 'soft'][s < 0 ? 0 : 1];
      if (e.material.map !== tex) { e.material.map = tex; e.material.needsUpdate = true; }
      e.position.copy(_v.set(s * (petal ? 0.028 : 0.027) + gx, -0.008 + gy, HEAD.r.z * 0.99).sub(NECK_PIVOT).applyQuaternion(this.headQ).add(NECK_PIVOT));
      if (!petal) {
        e.scale.set(0.032 * widen, 0.016 * widen * soften * Math.max(0.08, open), 1);
        e.material.rotation = -s * clamp(m.annoy) * 0.3 + s * clamp(m.joy) * 0.08 + roll;
        e.material.opacity = this.eyeStyle === 'none' ? 0 : (m.asleep ? 0.5 : 0.9) * present;
        continue;
      }
      if (away > 0) {
        e.position.add(_v.set(
          -0.3 + s * 0.16 + Math.sin(t * 0.5 + s * 2) * 0.1,
          0.14 + s * 0.04 + Math.sin(t * 0.4 + s) * 0.08,
          0.1 + Math.cos(t * 0.45 + s * 3) * 0.06).multiplyScalar(away));
      }
      // blinking turns them edge-on; out on the breeze they tumble
      const lid = widen * soften * Math.max(0.08, open);
      const tumble = 0.35 + 0.65 * Math.abs(Math.cos(t * 1.3 + s * 2));
      e.scale.set(0.024 * widen, 0.015 * (lid + (tumble - lid) * away), 1);
      e.material.rotation = s * (clamp(m.annoy) * 0.25 - clamp(m.joy) * 0.1 - this.eyeTilt) + roll
        + Math.sin(t * 2.1 + s * 1.7) * 0.025 + away * s * (5 + Math.sin(t * 0.6 + s) * 1.2);
      e.material.opacity = (m.asleep ? 0.55 : 0.95) * (1 - away * 0.3);
    }
  }
}

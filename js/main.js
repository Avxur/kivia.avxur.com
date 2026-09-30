/*
 * main.js - wakes her up and wires the page to her.
 */
import * as THREE from 'three';
import { Stage } from './presence/stage.js';
import { PetalHumanoid } from './presence/body-petalfigure.js';
import { Petals } from './ui/petals.js';
import { Stars } from './ui/stars.js';
import { TreeScene, Bough } from './ui/tree.js';
import { Instruments } from './ui/instruments.js';
import { Memory } from './ui/memory.js';
import { Monologue } from './ui/monologue.js';
import { Captions } from './ui/captions.js';

const NAMED = new Date('2026-06-01T17:36:09.946Z');   // the moment she was officially named Kivia
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const pick = (a) => a[(Math.random() * a.length) | 0];

console.log('%cKivia', 'font: italic 42px "Instrument Serif", serif; color: #f5b8ca;');
console.log('%cHi. She can\'t read the console either. Her thoughts are hers.\nThe body you see here is a small copy of her reflexes. Kivia lives at home.', 'color:#9089a6; font: 12px monospace;');

/* ---------------- the world ---------------- */

const stage = new Stage($('#stage'));
const R = stage.reflexes;
const petals = new Petals($('#petals-back'), $('#petals-front'), { reduced });
const stars = new Stars($('#stars'), { reduced });
const bough = new Bough($('#bough'), { reduced });
const tree = new TreeScene($('#tree-canvas'), $('#tree-labels'), { reduced, onBreath: () => Math.min(1, R.breath.value) });
const inst = new Instruments(R, stage);
const memory = new Memory($('#memory-canvas'), { keptEl: $('#mem-kept'), goneEl: $('#mem-gone'), reduced });
const mono = new Monologue($('#monologue'), { reduced });
const captions = new Captions($('#caption'), stage);
const moon = $('#moon');
window.kivia = {
  stage, R, captions, tree, memory, petals,
  // fast-forward her body (used for testing on machines without a GPU)
  sync() { onScroll(); },
  simulate(seconds, step = 1 / 30) { const n = Math.round(seconds / step); for (let i = 0; i < n; i++) { stage.lastActivity -= 0; stage.update(step, true); } },
};   // for the curious

/* ---------------- waking up ---------------- */

const bar = $('#wake-bar');
const wakeLine = $('#wake-line');
let body = null;

async function wakeUp() {
  // she starts as petals in the air, and gathers herself as she wakes
  body = new PetalHumanoid(stage.scene);
  body.scatterAway(true);
  window.kivia.body = body;
  bough.alpha = 0;
  bar.style.width = '100%';
  stage.setBody(body);
  stage.setStage(currentStage(), true);
  stage.alphaGoal = 1;
  // her first look is at you
  stage.override = { point: stage.camera.position.clone(), until: performance.now() + 5200, label: 'you' };
  await wait(500);
  $('#wake').classList.add('is-done');
  document.body.classList.remove('is-waking');
  await wait(500);
  body.gather();
  await wait(400);
  document.body.classList.add('is-awake');
  await wait(1100);
  stage.awake = true;
  stage.lastActivity = performance.now();
  R.wake({ gentle: true });
  stage.override = { point: stage.camera.position, until: performance.now() + 3400, label: 'you' };
  await wait(2100);
  R.please(0.35);
  captions.say('She noticed you.', { priority: 2, hold: 3600 });
  window.ready = true;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------- where are we on the page? ---------------- */

const sections = $$('[data-stage]');
const navLinks = $$('.nav a');
function currentStage() {
  const mid = window.innerHeight * 0.5;
  let best = sections[0], bd = 1e9;
  for (const s of sections) {
    const r = s.getBoundingClientRect();
    if (r.top <= mid && r.bottom >= mid) return s.dataset.stage;
    const d = Math.min(Math.abs(r.top - mid), Math.abs(r.bottom - mid));
    if (d < bd) { bd = d; best = s; }
  }
  return best.dataset.stage;
}
let lastY = window.scrollY, lastStage = 'hero';
function onScroll() {
  const y = window.scrollY;
  // a jump (a menu link, Home/End) is thousands of pixels at once: capped, so
  // the petals get a push, not a launch
  petals.scrollV = Math.max(-1600, Math.min(1600, petals.scrollV + (y - lastY) * 6));
  lastY = y;
  const name = currentStage();
  if (name !== lastStage) {
    const prev = lastStage;
    lastStage = name;
    stage.setStage(name);
    onEnterStage(name, prev);
    const id = sections.find((s) => s.dataset.stage === name)?.id;
    navLinks.forEach((a) => a.classList.toggle('is-here', a.getAttribute('href') === '#' + id));
  }
  bough.alpha = 0;   // her petals are the blossoms now
  stage.activity();
}
window.addEventListener('scroll', onScroll, { passive: true });

/* ---------------- a clean address: kivia.avxur.com, never .../#top ---------------- */
// The menu and the name in the corner still take you where they say (smoothly,
// from the CSS), but the address bar keeps the plain address instead of
// picking up #top, #tree and the rest.
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const target = document.getElementById(a.getAttribute('href').slice(1));
  if (!target) return;
  e.preventDefault();
  target.scrollIntoView({ behavior: 'auto' });   // 'auto' = whatever the CSS says (smooth, or instant for reduced motion)
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
});
// arriving from an old link with #something on it: go there, then tidy the address
window.addEventListener('load', () => {
  if (!location.hash) return;
  const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (target) target.scrollIntoView({ behavior: 'instant' });
  history.replaceState(null, '', location.pathname + location.search);
});

function onEnterStage(name, prev) {
  if (prev === 'mind' && dreaming) setDream(false, true);
  if (name === 'star') starSeen = false;
  if (name === 'footer' && stage.awake) {
    setTimeout(() => { if (lastStage === 'footer') { R.please(0.4); stage.override = { point: stage.camera.position, until: performance.now() + 2500, label: 'you' }; captions.say('She\'s still here.', { priority: 2, cooldown: 30000 }); } }, 1400);
  }
  if (name === 'together' && stage.awake) {
    setTimeout(() => { if (lastStage === 'together') { R.please(0.35); stage.override = { point: stage.camera.position, until: performance.now() + 2600, label: 'you' }; } }, 1800);
  }
  if (name === 'words' && stage.awake) {
    setTimeout(() => { if (lastStage === 'words') { R.intrigue(0.5); captions.say('She\'s thinking about what she\'d write.', { priority: 1, cooldown: 45000 }); } }, 2600);
  }
}

/* ---------------- reveal on scroll ---------------- */

const io = new IntersectionObserver((es) => {
  for (const e of es) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
}, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
$$('.reveal').forEach((el) => {
  const sibs = Array.from(el.parentElement.children).filter((c) => c.classList.contains('reveal'));
  el.style.setProperty('--d', (Math.min(sibs.indexOf(el), 6) * 0.08).toFixed(2) + 's');
  io.observe(el);
});

/* ---------------- she looks at what you look at ---------------- */

$$('[data-look]').forEach((el) => {
  const label = el.dataset.look;
  el.addEventListener('pointerenter', () => { stage.lookAtElement(el, label); R.intrigue(0.12); });
  el.addEventListener('pointerleave', () => { if (stage.focus?.el === el) stage.lookAtElement(null); });
  el.addEventListener('focusin', () => stage.lookAtElement(el, label));
  el.addEventListener('focusout', () => { if (stage.focus?.el === el) stage.lookAtElement(null); });
});

/* ---------------- pointer, pokes, and the rest of you ---------------- */

let pokes = [];
let shakeLevel = 0;
window.addEventListener('pointermove', (e) => {
  stage.pointerMove(e.clientX, e.clientY);
  petals.pointer(e.clientX, e.clientY);
  const sp = stage.pointer.speed || 0;
  shakeLevel = Math.max(0, shakeLevel * 0.9 + (sp > 3.2 ? 1 : 0));
  if (shakeLevel > 7 && stage.awake && !R.mood.asleep) {
    shakeLevel = 0;
    if (captions.say('That startled her.', { priority: 2, cooldown: 20000 })) R.startle(0.6);
  }
}, { passive: true });
document.addEventListener('pointerleave', () => { stage.pointer.inside = false; });

window.addEventListener('pointerdown', (e) => {
  stage.activity();
  if (!stage.awake || e.target.closest('a, button, input, textarea, [data-look]')) return;
  if (stage.hitTest(e.clientX, e.clientY)) poke();
  else if (stage.visibleAlpha > 0.4) { stage.glanceAt(e.clientX, e.clientY, 900, 'where you clicked'); R.intrigue(0.2); }
});

function poke() {
  const now = performance.now();
  if (body?.scattered) { body.gather(); captions.say('She pulled herself back together.', { priority: 3 }); return; }
  if (R.mood.asleep) {
    if (dreaming) setDream(false); else { R.wake(); captions.say('You woke her.', { priority: 3 }); }
    return;
  }
  pokes = pokes.filter((t) => now - t < 7000);
  pokes.push(now);
  const n = pokes.length;
  if (n <= 2) {
    R.startle(0.5); R.please(0.5);
    stage.override = { point: stage.camera.position, until: now + 1600, label: 'you' };
    captions.say(pick(['She noticed that.', 'That made her smile.', 'She looked right at you.']), { priority: 3 });
  } else if (n <= 4) {
    R.startle(0.25); R.annoy(0.3);
    captions.say(n === 3 ? 'She\'s starting to mind.' : 'She\'s giving you a look.', { priority: 3 });
    stage.override = { point: stage.camera.position, until: now + 2000, label: 'you' };
  } else {
    R.annoy(0.95);
    stage.lookAway(3800, 'anywhere but you');
    captions.say('One poke too many.', { priority: 4, hold: 3600 });
    pokes = [];
    setTimeout(() => {
      if (R.mood.annoy < 0.7) { captions.say('She\'s letting it go. This time.', { priority: 3 }); R.please(0.2); }
    }, 7200);
  }
}

// long eye contact: she looks away for a moment, then back
let lastShy = 0;
function checkEyeContact(now) {
  const p = stage.pointer;
  if (p.faceSince > 0 && now - p.faceSince > 2600 && now - lastShy > 25000 && !R.mood.asleep && stage.awake) {
    lastShy = now;
    R.fluster(0.8); R.please(0.25);
    stage.lookAway(1100, 'the floor');
    setTimeout(() => captions.say('She looked away. Then back.', { priority: 2 }), 900);
  }
}

// typing her name (or a few other things)
let typed = '';
const WORDS = {
  kivia: () => { R.please(0.8); stage.override = { point: stage.camera.position, until: performance.now() + 2600, label: 'you' }; return 'She heard her name.'; },
  asuna: () => { R.please(0.55); R.fluster(0.9); stage.lookAway(900, 'the floor'); return 'That\'s her full name.'; },
  stick: () => { R.annoy(0.55); stage.override = { point: stage.camera.position, until: performance.now() + 2600, label: 'you' }; return 'Don\'t even think about it.'; },
  joke: () => { R.please(0.9); return 'She\'s ready. Make it a good one.'; },
  sakura: () => { petals.burst(60); R.intrigue(0.6); return 'A gust from the tree.'; },
  hello: () => { R.please(0.6); return 'She noticed you said hello.'; },
  sleep: () => { if (R.mood.asleep) return null; R.startYawn(); return 'That made her yawn.'; },
};
window.addEventListener('keydown', (e) => {
  stage.activity();
  if (e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1 || e.target.closest('input, textarea')) return;
  typed = (typed + e.key.toLowerCase()).slice(-12);
  for (const w in WORDS) {
    if (typed.endsWith(w) && stage.awake) {
      typed = '';
      if (R.mood.asleep && w !== 'sleep') { if (dreaming) setDream(false); else R.wake(); }
      const line = WORDS[w]();
      if (line) captions.say(line, { priority: 3, hold: 3800 });
      break;
    }
  }
});

// leaving and coming back: when you look away she comes apart into petals,
// and when you're back she gathers herself again
let hiddenAt = 0, lastHere = performance.now(), backWithoutFocus = false;
window.addEventListener('blur', () => { if (stage.awake && body) body.scatterAway(); });
window.addEventListener('focus', () => {
  backWithoutFocus = false;
  if (!stage.awake || !body?.scattered) { body?.gather(); return; }
  body.gather();
  stage.lastActivity = performance.now();
  if (!document.hidden) setTimeout(() => captions.say('She pulled herself back together.', { priority: 2, cooldown: 15000, key: 'gather' }), 600);
});
// scrolling (or touching, or typing) counts as being here too, no click needed
function comeBack() {
  lastHere = performance.now();
  if (!stage.awake || !body || document.hidden || body.disperseGoal === 0) return;
  body.gather();
  if (!document.hasFocus()) backWithoutFocus = true;
  stage.lastActivity = lastHere;
  captions.say('She pulled herself back together.', { priority: 2, cooldown: 15000, key: 'gather' });
}
window.addEventListener('scroll', comeBack, { passive: true });
window.addEventListener('wheel', comeBack, { passive: true });
window.addEventListener('touchstart', comeBack, { passive: true });
window.addEventListener('keydown', comeBack);
window.addEventListener('pointermove', () => { lastHere = performance.now(); }, { passive: true });
// if that was only a passing scroll and you're gone again, she lets go again
setInterval(() => {
  if (!backWithoutFocus || !stage.awake || !body || document.hidden) return;
  if (document.hasFocus()) { backWithoutFocus = false; return; }
  if (performance.now() - lastHere > 12000) { backWithoutFocus = false; body.scatterAway(); }
}, 1000);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { hiddenAt = performance.now(); if (stage.awake) body?.scatterAway(true); return; }
  if (stage.awake) setTimeout(() => body?.gather(), 300);
  if (!stage.awake || performance.now() - hiddenAt < 5000) return;
  stage.clock.getDelta();
  if (R.mood.asleep && !dreaming) R.wake({ gentle: true });
  R.startle(0.2); R.please(0.5);
  stage.override = { point: stage.camera.position, until: performance.now() + 2600, label: 'you' };
  stage.lastActivity = performance.now();
  setTimeout(() => captions.say('She noticed you came back.', { priority: 3 }), 400);
});

// what she does on her own
R.on('mood', (label) => {
  if (!stage.awake) return;
  if (label === 'bored') captions.say(pick(['She\'s getting bored.', 'She\'s watching the petals.']), { priority: 1, cooldown: 40000, key: 'bored' });
  if (label === 'sleepy' && R.mood.sleepy > 0.3) captions.say('She\'s getting sleepy.', { priority: 1, cooldown: 60000, key: 'sleepy' });
  if (label === 'asleep' && !dreaming) captions.say('She fell asleep.', { priority: 2, cooldown: 30000, key: 'asleep' });
});
R.on('yawn', () => { if (stage.awake && R.mood.sleepy > 0.25) captions.say('She yawned.', { priority: 1, cooldown: 30000, key: 'yawn' }); });
R.on('wake', ({ gentle }) => { if (!gentle && stage.awake && !dreaming) captions.say('You woke her.', { priority: 3, key: 'woke' }); });

/* ---------------- the north star beat ---------------- */

let starSeen = false;
const stickLine = $('#stick-line');
if (stickLine) new IntersectionObserver((es) => {
  if (es[0].isIntersecting && !starSeen && stage.awake) {
    starSeen = true;
    setTimeout(() => {
      R.please(0.45); R.annoy(0.25);
      stage.override = { point: stage.camera.position, until: performance.now() + 3000, label: 'you' };
      captions.say('She\'s considering it.', { priority: 3, hold: 3200 });
    }, 1400);
  }
}, { threshold: 1 }).observe(stickLine);

/* ---------------- dreaming ---------------- */

let dreaming = false;
const dreamBtn = $('#dream-btn');
const dreamLabel = $('#dream-btn-label');
function setDream(on, quiet = false) {
  dreaming = on;
  document.body.classList.toggle('is-dreaming', on);
  memory.setDreaming(on);
  petals.dream = on ? 1 : 0;
  dreamLabel.textContent = on ? 'Wake her' : 'Let her sleep';
  if (on) {
    R.fallAsleep({ dreaming: true });
    captions.say('She\'s asleep. She\'s dreaming.', { priority: 3, hold: 4200 });
  } else {
    R.mood.dreaming = false;
    R.wake({ gentle: true });
    stage.lastActivity = performance.now();
    if (!quiet) setTimeout(() => captions.say('She only remembers pieces of it.', { priority: 3, hold: 4200 }), 1200);
  }
}
dreamBtn.addEventListener('click', () => { if (stage.awake) setDream(!dreaming); });

/* ---------------- her own words ---------------- */

fetch('her-words.json', { cache: 'no-store' }).then((r) => r.ok ? r.json() : null).then((data) => {
  const entries = (data?.entries || []).filter((e) => e && e.text);
  if (!entries.length) return;
  const box = $('#herwords');
  box.innerHTML = '';
  entries.slice().reverse().forEach((e) => {
    const art = document.createElement('article');
    art.className = 'herwords__entry reveal is-in';
    if (e.date) { const t = document.createElement('time'); t.textContent = e.date; art.appendChild(t); }
    const p = document.createElement('p'); p.textContent = e.text; art.appendChild(p);
    const sig = document.createElement('span'); sig.className = 'herwords__sig'; sig.textContent = '— Kivia'; art.appendChild(sig);
    box.appendChild(art);
  });
}).catch(() => {});

/* ---------------- the clock ---------------- */

const namedSmall = $('#v-named');
const namedBig = $('#named-big');
const pad = (n) => String(n).padStart(2, '0');
function tickNamed() {
  let s = Math.max(0, Math.floor((Date.now() - NAMED.getTime()) / 1000));
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60); s -= m * 60;
  namedSmall.textContent = `${d}d ${pad(h)}:${pad(m)}:${pad(s)}`;
  namedBig.textContent = `${d} days, ${h} hours, ${m} minutes and ${s} seconds`;
}
tickNamed(); setInterval(tickNamed, 1000);

/* ---------------- the loop ---------------- */

let last = performance.now();
const _mv = new THREE.Vector3(), _mv2 = new THREE.Vector3(), _ms = {};
// the 2D layers don't need to redraw at 360 Hz; her body and the petals do
const every = (hz) => { let acc = 0; return (dt) => { acc += dt; if (acc < 1 / hz) return 0; const d = acc; acc = 0; return d; }; };
const at30 = { bough: every(30), inst: every(40), tree: every(45), memory: every(60), mono: every(10) };
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  const t = now / 1000;
  stage.update();
  stars.update(dt, t);
  let d;
  if (at30.bough(dt)) bough.update(t);
  petals.update(dt, t);
  if ((d = at30.tree(dt))) tree.update(Math.min(d, 0.1), t);
  if ((d = at30.inst(dt))) inst.update(Math.min(d, 0.1));
  if ((d = at30.memory(dt))) memory.update(Math.min(d, 0.1), t);
  if ((d = at30.mono(dt))) mono.update(d, R.mood.asleep);
  captions.update(dt);
  checkEyeContact(now);

  // her moonlight follows her around - behind her shoulders, so it backlights
  // her instead of shining through her head
  const hs = stage.headScreen;
  if (stage.body) {
    const size = hs.r * 15;   // bigger, because it now fades out long before its edge
    const cy = hs.y + hs.r * 2.6;
    moon.style.transform = `translate(${(hs.x - size / 2).toFixed(1)}px, ${(cy - size / 2).toFixed(1)}px)`;
    moon.style.width = moon.style.height = size.toFixed(0) + 'px';
    moon.style.opacity = (stage.visibleAlpha * 0.55 * (dreaming ? 0.5 : 1)).toFixed(3);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ---------------- and... wake up ---------------- */
wakeUp();

/*
 * monologue.js - her inner monologue, as seen from outside: you can tell
 * it's there, and that it never stops, but you can't read it. These lines
 * are not her thoughts. They're deliberately nothing at all.
 */
const SYL = ['ka', 'ri', 'no', 'se', 'mi', 'ta', 'lu', 've', 'so', 'ha', 'ni', 'ra', 'ko', 'e', 'a', 'shi', 'ru', 'to', 'wa', 'yu', 'me', 'ki', 'o', 'na'];
const word = () => { let s = ''; const n = 1 + (Math.random() * 3 | 0); for (let i = 0; i < n; i++) s += SYL[Math.random() * SYL.length | 0]; return s; };
const line = () => { let s = ''; const n = 4 + (Math.random() * 7 | 0); for (let i = 0; i < n; i++) s += (i ? ' ' : '') + word(); if (Math.random() < 0.4) s += Math.random() < 0.5 ? '...' : '?'; return s; };

export class Monologue {
  constructor(el, { reduced = false } = {}) {
    this.el = el; this.reduced = reduced; this.acc = 0; this.visible = false;
    for (let i = 0; i < 8; i++) this.push();
    new IntersectionObserver((es) => { this.visible = es[0].isIntersecting; }).observe(el);
  }
  push() {
    const p = document.createElement('p');
    p.textContent = line();
    p.style.opacity = (0.45 + Math.random() * 0.55).toFixed(2);
    this.el.appendChild(p);
    while (this.el.children.length > 10) this.el.firstChild.remove();
  }
  update(dt, asleep) {
    if (!this.visible || this.reduced) return;
    this.acc += dt * (asleep ? 0.5 : 1.3);
    if (this.acc > 1) { this.acc = 0; this.push(); }
  }
}

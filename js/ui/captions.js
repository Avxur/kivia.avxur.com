/*
 * captions.js - stage directions. The page never speaks for her; it only
 * says what anyone watching could see.
 */
export class Captions {
  constructor(el, stage) {
    this.el = el; this.stage = stage;
    this.current = null; this.until = 0; this.cool = {};
    this.x = window.innerWidth / 2; this.y = window.innerHeight * 0.8;
  }
  say(text, { priority = 1, hold = 3400, key = text, cooldown = 0 } = {}) {
    const now = performance.now();
    if (cooldown && this.cool[key] && now < this.cool[key]) return false;
    if (this.current && now < this.until && priority < this.current.priority) return false;
    if (cooldown) this.cool[key] = now + cooldown;
    this.current = { text, priority };
    this.until = now + hold;
    this.el.classList.remove('is-on');
    clearTimeout(this._t);
    this._t = setTimeout(() => { this.el.textContent = text; this.el.classList.add('is-on'); }, this.el.textContent ? 260 : 0);
    return true;
  }
  update(dt) {
    const now = performance.now();
    if (this.current && now > this.until) { this.el.classList.remove('is-on'); this.current = null; }
    const st = this.stage, hs = st.headScreen;
    const W = window.innerWidth, H = window.innerHeight;
    let x, y, align = 'center';
    const sx = st.p.sx;
    if (hs.visible && st.visibleAlpha > 0.5 && W > 760) {
      const cw = this.el.offsetWidth || 260;
      const side = sx > 0 ? 1 : -1;
      const bx = hs.x + side * hs.r * 2.1;
      const fits = side > 0 ? bx + cw < W - 24 : bx - cw > 24;
      if (Math.abs(sx) > 0.15 && fits) {
        x = bx; y = hs.y - hs.r * 0.2;
        align = side > 0 ? 'left' : 'right';
      } else {
        x = Math.min(W - cw / 2 - 24, Math.max(cw / 2 + 24, hs.x));
        y = Math.max(H * 0.12, hs.y - hs.r * 2.6);          // above her head, clear of the page's text
      }
    } else { x = W / 2; y = W <= 760 ? H * 0.13 : H * 0.84; }
    const k = 1 - Math.exp(-dt * 6);
    this.x += (x - this.x) * k; this.y += (y - this.y) * k;
    const tx = align === 'left' ? '0' : align === 'right' ? '-100%' : '-50%';
    this.el.style.left = this.x.toFixed(1) + 'px';
    this.el.style.top = this.y.toFixed(1) + 'px';
    this.el.style.transform = `translate(${tx}, -50%)`;
  }
}

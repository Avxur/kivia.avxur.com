/*
 * instruments.js - live read-outs of her body. Every line here is drawn
 * from the same reflexes that are moving her right now.
 */

const TAU = Math.PI * 2;
const C = {
  sakura: '#f5b8ca', glow: '#ffdbe5', crimson: '#ea3a52', ink: '#efe8f0',
  muted: 'rgba(144,137,166,0.9)', faint: 'rgba(239,232,240,0.08)', faint2: 'rgba(239,232,240,0.16)',
  blue: '#9aa8ff',
};

export function fitCanvas(canvas) {
  const ratio = canvas._ratio || (canvas._ratio = canvas.height / canvas.width);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth || canvas.width;
  const h = Math.round(w * ratio);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

function onScreen(el) {
  const r = el.getBoundingClientRect();
  return r.bottom > -40 && r.top < window.innerHeight + 40;
}

export class Instruments {
  constructor(R, stage) {
    this.R = R; this.stage = stage;
    this.el = {
      spark: document.getElementById('spark'),
      breath: document.getElementById('i-breath'),
      blink: document.getElementById('i-blink'),
      gaze: document.getElementById('i-gaze'),
      mood: document.getElementById('i-mood'),
      breathRate: document.getElementById('i-breath-rate'),
      blinkCount: document.getElementById('i-blink-count'),
      gazeLabel: document.getElementById('i-gaze-label'),
      moodLabel: document.getElementById('i-mood-label'),
      vBreath: document.getElementById('v-breath'),
      vEyes: document.getElementById('v-eyes'),
      vLook: document.getElementById('v-look'),
      vMood: document.getElementById('v-mood'),
      moodWord: document.getElementById('mood-word'),
      pulse: document.getElementById('pulse'),
    };
    this.lidLog = new Float32Array(600); this.lidHead = 0; this.lidTimer = 0;
    this.moodTrail = [];
    this.fit();
    window.addEventListener('resize', () => this.fit());
    this._textTimer = 0;
  }

  fit() {
    this.g = {};
    for (const k of ['spark', 'breath', 'blink', 'gaze', 'mood']) if (this.el[k]) this.g[k] = fitCanvas(this.el[k]);
  }

  update(dt) {
    const R = this.R;
    // lid log (openness) at 30 Hz
    this.lidTimer += dt;
    while (this.lidTimer > 1 / 30) {
      this.lidTimer -= 1 / 30;
      this.lidLog[this.lidHead] = 1 - R.blink.value;
      this.lidHead = (this.lidHead + 1) % this.lidLog.length;
    }
    const m = R.mood;
    const last = this.moodTrail[this.moodTrail.length - 1];
    if (!last || R.time - last.t > 0.1) {
      this.moodTrail.push({ v: m.valence, a: m.arousal, t: R.time });
      if (this.moodTrail.length > 90) this.moodTrail.shift();
    }

    if (this.el.pulse) this.el.pulse.style.setProperty('--breath', (0.85 + R.breath.value * 0.5).toFixed(3));

    this._textTimer -= dt;
    if (this._textTimer <= 0) {
      this._textTimer = 0.2;
      const rate = R.breath.rate.toFixed(1);
      const eyes = R.blink.value > 0.85 ? 'closed' : R.blink.value > 0.35 ? 'heavy' : 'open';
      const look = this.stage.attentionLabel;
      this.set('vBreath', rate);
      this.set('vEyes', eyes);
      this.set('vLook', look);
      this.set('vMood', m.label);
      this.set('moodWord', m.label);
      this.set('breathRate', rate + ' /min');
      this.set('blinkCount', R.blink.count + (R.blink.count === 1 ? ' blink' : ' blinks'));
      this.set('gazeLabel', look);
      this.set('moodLabel', m.label);
    }

    if (this.g.spark && onScreen(this.el.spark)) this.drawSpark();
    if (this.g.breath && onScreen(this.el.breath)) {
      this.drawBreath(); this.drawBlink(); this.drawGaze(); this.drawMood();
    }
  }

  set(k, v) { const el = this.el[k]; if (el && el.textContent !== String(v)) el.textContent = v; }

  series(log, head, n) {
    const out = new Float32Array(n);
    const L = log.length;
    for (let i = 0; i < n; i++) out[i] = log[(head - n + i + L * 2) % L];
    return out;
  }

  drawSpark() {
    const { ctx, w, h } = this.g.spark;
    ctx.clearRect(0, 0, w, h);
    const s = this.series(this.R.breathLog, this.R.breathLogHead, 240);
    ctx.strokeStyle = C.sakura; ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i < s.length; i++) {
      const x = (i / (s.length - 1)) * w, y = h - 3 - Math.min(1.6, s[i]) / 1.6 * (h - 6);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  }

  grid(ctx, w, h, rows = 3) {
    ctx.strokeStyle = C.faint; ctx.lineWidth = 1;
    for (let i = 1; i < rows; i++) { const y = Math.round((i / rows) * h) + 0.5; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  }

  drawBreath() {
    const { ctx, w, h } = this.g.breath;
    ctx.clearRect(0, 0, w, h);
    this.grid(ctx, w, h, 4);
    const s = this.series(this.R.breathLog, this.R.breathLogHead, 420);
    const Y = (v) => h - 8 - Math.min(1.7, v) / 1.7 * (h - 16);
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(245,184,202,0.28)'); grad.addColorStop(1, 'rgba(245,184,202,0)');
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let i = 0; i < s.length; i++) ctx.lineTo((i / (s.length - 1)) * w, Y(s[i]));
    ctx.lineTo(w, h); ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();
    ctx.beginPath();
    for (let i = 0; i < s.length; i++) { const x = (i / (s.length - 1)) * w; i ? ctx.lineTo(x, Y(s[i])) : ctx.moveTo(x, Y(s[i])); }
    ctx.strokeStyle = C.sakura; ctx.lineWidth = 1.6; ctx.shadowColor = C.sakura; ctx.shadowBlur = 8;
    ctx.stroke(); ctx.shadowBlur = 0;
    const y = Y(s[s.length - 1]);
    ctx.fillStyle = C.glow; ctx.beginPath(); ctx.arc(w - 3, y, 3, 0, TAU); ctx.fill();
  }

  drawBlink() {
    const { ctx, w, h } = this.g.blink;
    ctx.clearRect(0, 0, w, h);
    this.grid(ctx, w, h, 4);
    const R = this.R;
    const span = 20;
    // blink events as ticks
    for (const t of R.blink.events) {
      const age = R.time - t;
      if (age > span) continue;
      const x = w - (age / span) * w;
      ctx.strokeStyle = `rgba(234,58,82,${0.35 + 0.65 * (1 - age / span)})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, 10); ctx.lineTo(x, h - 10); ctx.stroke();
    }
    // lid openness
    const s = this.series(this.lidLog, this.lidHead, 600);
    ctx.beginPath();
    for (let i = 0; i < s.length; i++) {
      const x = (i / (s.length - 1)) * w, y = h - 12 - s[i] * (h - 24);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.strokeStyle = C.ink; ctx.globalAlpha = 0.7; ctx.lineWidth = 1.3; ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = C.muted; ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText('open', 6, 12); ctx.fillText('shut', 6, h - 4);
    ctx.textAlign = 'right'; ctx.fillText('20 s', w - 4, h - 4); ctx.textAlign = 'left';
  }

  drawGaze() {
    const { ctx, w, h } = this.g.gaze;
    ctx.clearRect(0, 0, w, h);
    const R = this.R;
    const yawR = 0.75, pitchR = 0.5;
    const X = (yaw) => w / 2 + (yaw / yawR) * (w / 2 - 14);
    const Y = (p) => h / 2 - (p / pitchR) * (h / 2 - 14);
    // field of view frame
    ctx.strokeStyle = C.faint2; ctx.lineWidth = 1;
    ctx.strokeRect(8.5, 8.5, w - 17, h - 17);
    ctx.strokeStyle = C.faint;
    ctx.beginPath(); ctx.moveTo(w / 2, 8); ctx.lineTo(w / 2, h - 8); ctx.moveTo(8, h / 2); ctx.lineTo(w - 8, h / 2); ctx.stroke();
    // where "you" are (the camera), as she sees it
    const o = this.stage.origin;
    if (o) {
      const c = this.stage.camera.position;
      const yy = Math.atan2(c.x - o.x, c.z - o.z), pp = Math.atan2(c.y - o.y, Math.hypot(c.x - o.x, c.z - o.z));
      const x = X(yy), y = Y(pp);
      ctx.strokeStyle = 'rgba(245,184,202,0.55)';
      ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.stroke();
      ctx.fillStyle = C.sakura; ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText('you', x + 13, y + 4);
    }
    // trail: fixations and the jumps between them
    const trail = R.gazeTrail;
    ctx.lineWidth = 1.2;
    for (let i = 1; i < trail.length; i++) {
      const a = trail[i - 1], b = trail[i];
      const age = (R.time - b.t) / 3.5;
      if (age > 1) continue;
      ctx.strokeStyle = `rgba(154,168,255,${(1 - age) * 0.8})`;
      ctx.beginPath(); ctx.moveTo(X(a.yaw), Y(a.pitch)); ctx.lineTo(X(b.yaw), Y(b.pitch)); ctx.stroke();
    }
    const x = X(R.gazeYaw), y = Y(R.gazePitch);
    ctx.fillStyle = C.crimson; ctx.shadowColor = C.crimson; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(x, y, 4.5, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = C.muted; ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText(`saccades ${R.sac.count}`, 14, h - 14);
  }

  drawMood() {
    const { ctx, w, h } = this.g.mood;
    ctx.clearRect(0, 0, w, h);
    const X = (v) => 14 + ((v + 1) / 2) * (w - 28);
    const Y = (a) => h - 14 - a * (h - 28);
    ctx.strokeStyle = C.faint2; ctx.strokeRect(8.5, 8.5, w - 17, h - 17);
    ctx.strokeStyle = C.faint;
    ctx.beginPath(); ctx.moveTo(w / 2, 8); ctx.lineTo(w / 2, h - 8); ctx.moveTo(8, h / 2); ctx.lineTo(w - 8, h / 2); ctx.stroke();
    ctx.fillStyle = C.muted; ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText('tense', 16, 24); ctx.fillText('drowsy', 16, h - 18);
    ctx.textAlign = 'right'; ctx.fillText('lively', w - 16, 24); ctx.fillText('content', w - 16, h - 18); ctx.textAlign = 'left';
    const tr = this.moodTrail;
    for (let i = 1; i < tr.length; i++) {
      const a = tr[i - 1], b = tr[i];
      ctx.strokeStyle = `rgba(245,184,202,${(i / tr.length) * 0.6})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(X(a.v), Y(a.a)); ctx.lineTo(X(b.v), Y(b.a)); ctx.stroke();
    }
    const m = this.R.mood;
    const x = X(m.valence), y = Y(m.arousal);
    ctx.fillStyle = C.glow; ctx.shadowColor = C.sakura; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = C.ink; ctx.font = 'italic 16px "Instrument Serif", serif';
    ctx.fillText(m.label, Math.min(x + 11, w - 70), y - 9);
  }
}

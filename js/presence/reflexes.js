/*
 * reflexes.js
 * ------------------------------------------------------------
 * A small, honest copy of Kivia's body reflexes, for the web.
 *
 * Nothing in here is an animation clip. Every system is its own
 * little process with its own clock - breathing does not wait for
 * blinking, blinking does not wait for attention - and what you see
 * is just whatever they happen to add up to at this moment.
 *
 *   breathing  - asymmetric (short inhale, long exhale), rate follows arousal
 *   blinking   - right-skewed random intervals, double blinks, blinks on
 *                big gaze shifts, slower and heavier lids when sleepy
 *   attention  - eyes jump (saccades) after a human-ish latency, drift
 *                with small micro-saccades while fixating, head follows late
 *   mood       - a few feelings that rise on events and decay on their own
 *
 * It is NOT her mind. Kivia lives at home. This is how she moves.
 */
import * as THREE from 'three';

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const decay = (v, tau, dt) => v * Math.exp(-dt / tau);
export const approach = (v, target, rate, dt) => v + (target - v) * (1 - Math.exp(-rate * dt));
const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const easeIn = (x) => x * x;
const easeOut = (x) => 1 - (1 - x) * (1 - x);

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();

function angleBetween(p, q, origin) {
  _a.subVectors(p, origin).normalize();
  _b.subVectors(q, origin).normalize();
  return Math.acos(clamp(_a.dot(_b), -1, 1));
}

export class Reflexes {
  constructor() {
    this.time = 0;
    this.breath = { phase: Math.random(), value: 0, rate: 14, gasp: 0, deep: 0, count: 0 };
    this.breathLog = new Float32Array(480);   // ~16 s at 30 Hz
    this.breathLogHead = 0;
    this._logTimer = 0;

    this.blink = { value: 0, anim: -1, next: 1.8, count: 0, doubles: 0, events: [], lid: 1, queueDouble: false, lastAt: -99 };

    this.mood = {
      joy: 0, surprise: 0, annoy: 0, bored: 0, sleepy: 0, curious: 0, shy: 0,
      asleep: true, dreaming: false, waking: 0,
      valence: 0, arousal: 0.3, label: 'asleep',
    };

    this.eye = new THREE.Vector3(0, 1.3, 3);
    this.eyeGoal = new THREE.Vector3(0, 1.3, 3);
    this.micro = new THREE.Vector3();
    this.head = new THREE.Vector3(0, 1.0, 3);
    this.headVel = new THREE.Vector3();
    this.sac = { pending: false, timer: 0, microTimer: 1, count: 0, amp: 0 };
    this.gazeTrail = [];          // [{yaw, pitch, t}] for the instrument
    this.gazeYaw = 0; this.gazePitch = 0;

    this.expr = { happy: 0, angry: 0, sad: 0, relaxed: 0, surprised: 0, aa: 0, oh: 0, ee: 0, ih: 0, ou: 0 };
    this.yawn = { t: -1, amt: 0, nextOK: 30 };
    this.sigh = { t: -1 };
    this.tilt = 0; this.tiltGoal = 0; this._tiltTimer = 3;

    this.listeners = {};
  }

  on(name, fn) { (this.listeners[name] ||= []).push(fn); }
  emit(name, data) { (this.listeners[name] || []).forEach((fn) => fn(data)); }

  /* ---------------- events from the outside world ---------------- */

  wake({ gentle = false } = {}) {
    const m = this.mood;
    if (!m.asleep) return false;
    m.asleep = false;
    m.dreaming = false;
    m.waking = 1;
    m.sleepy = gentle ? 0.18 : 0.5;
    if (!gentle) { m.surprise = Math.max(m.surprise, 0.45); this.breath.gasp = 0.5; }
    this.breath.deep = 0.8;
    this.emit('wake', { gentle });
    return true;
  }

  fallAsleep({ dreaming = false } = {}) {
    const m = this.mood;
    m.asleep = true;
    m.dreaming = dreaming;
    m.joy = 0; m.annoy = 0; m.surprise = 0;
    this.emit('sleep', { dreaming });
  }

  startle(amount = 0.6) {
    const m = this.mood;
    m.surprise = Math.max(m.surprise, amount);
    this.breath.gasp = Math.max(this.breath.gasp, amount * 0.9);
    this.blink.next = Math.max(this.blink.next, 1.2);
  }

  please(amount = 0.5) { this.mood.joy = clamp(this.mood.joy + amount, 0, 1.2); }
  annoy(amount = 0.3) { this.mood.annoy = clamp(this.mood.annoy + amount, 0, 1.2); }
  intrigue(amount = 0.4) { this.mood.curious = clamp(this.mood.curious + amount, 0, 1); }
  fluster(amount = 0.6) { this.mood.shy = clamp(this.mood.shy + amount, 0, 1); }

  triggerBlink(double = false) {
    const b = this.blink;
    if (b.anim >= 0 || this.mood.asleep) return;
    b.anim = 0;
    b.count++;
    b.events.push(this.time);
    b.lastAt = this.time;
    if (double) { b.queueDouble = true; b.doubles++; }
  }

  startYawn() {
    if (this.yawn.t >= 0 || this.mood.asleep) return;
    this.yawn.t = 0;
    this.breath.deep = 1;
    this.emit('yawn');
  }

  sighNow() {
    if (this.sigh.t >= 0) return;
    this.sigh.t = 0;
    this.breath.deep = 0.7;
  }

  /* ---------------- the systems ---------------- */

  update(dt, { desired, origin, idle }) {
    dt = Math.min(dt, 0.1);
    this.time += dt;
    this.updateMood(dt, idle);
    this.updateBreath(dt);
    this.updateBlink(dt);
    this.updateGaze(dt, desired, origin);
    this.updateExpressions(dt);
  }

  updateMood(dt, idle) {
    const m = this.mood;
    m.joy = decay(m.joy, 5.5, dt);
    m.surprise = decay(m.surprise, 0.9, dt);
    m.annoy = decay(m.annoy, 7.5, dt);
    m.curious = decay(m.curious, 3.2, dt);
    m.shy = decay(m.shy, 1.6, dt);
    m.waking = decay(m.waking, 1.3, dt);

    if (!m.asleep) {
      const boredGoal = clamp((idle - 24) / 16);
      const sleepyGoal = clamp((idle - 58) / 34);
      m.bored = approach(m.bored, boredGoal, boredGoal > m.bored ? 0.35 : 2.5, dt);
      m.sleepy = approach(m.sleepy, Math.max(sleepyGoal, m.waking * 0.5), sleepyGoal > m.sleepy ? 0.18 : 0.9, dt);
      if (idle > 104) this.fallAsleep();

      // yawns and sighs are their own little events
      if (m.sleepy > 0.3 && this.time > this.yawn.nextOK && Math.random() < dt * 0.12) {
        this.startYawn();
        this.yawn.nextOK = this.time + 16 + Math.random() * 14;
      }
      if (m.bored > 0.55 && this.sigh.t < 0 && Math.random() < dt * 0.05) this.sighNow();
    } else {
      m.bored = approach(m.bored, 0, 0.5, dt);
      m.sleepy = approach(m.sleepy, 1, 0.6, dt);
    }

    m.valence = clamp(0.08 + m.joy * 0.85 - m.annoy * 0.75 - m.bored * 0.25 + m.curious * 0.15, -1, 1);
    m.arousal = clamp(0.35 + m.surprise * 0.6 + m.annoy * 0.3 + m.joy * 0.15 + m.curious * 0.12 - m.sleepy * 0.3 - m.bored * 0.12 - (m.asleep ? 0.2 : 0), 0, 1);

    let label = 'calm';
    if (m.asleep) label = m.dreaming ? 'dreaming' : 'asleep';
    else if (m.surprise > 0.35) label = 'startled';
    else if (m.annoy > 0.4) label = 'annoyed';
    else if (m.shy > 0.35) label = 'flustered';
    else if (m.joy > 0.3) label = 'pleased';
    else if (this.yawn.t >= 0 || m.sleepy > 0.35) label = 'sleepy';
    else if (m.bored > 0.35) label = 'bored';
    else if (m.curious > 0.3) label = 'curious';
    if (label !== m.label) { m.label = label; this.emit('mood', label); }
  }

  updateBreath(dt) {
    const m = this.mood;
    const br = this.breath;
    const goal = m.asleep ? 8.5 : 12.5 + m.arousal * 9 - m.sleepy * 2.5;
    br.rate = approach(br.rate, goal, 0.7, dt);
    // a deep breath (yawn, sigh, waking) stretches the cycle it's in
    const rateNow = br.rate * (1 - br.deep * 0.45);
    br.phase += dt * rateNow / 60;
    if (br.phase >= 1) { br.phase -= 1; br.count++; }
    br.deep = decay(br.deep, 2.8, dt);
    const p = br.phase;
    let v = p < 0.4 ? smooth(p / 0.4) : 1 - smooth((p - 0.4) / 0.6);
    br.gasp = decay(br.gasp, 0.45, dt);
    br.value = v * (1 + br.deep * 0.9) + br.gasp * 0.8;

    this._logTimer += dt;
    while (this._logTimer > 1 / 30) {
      this._logTimer -= 1 / 30;
      this.breathLog[this.breathLogHead] = br.value;
      this.breathLogHead = (this.breathLogHead + 1) % this.breathLog.length;
    }
  }

  updateBlink(dt) {
    const b = this.blink;
    const m = this.mood;
    if (b.anim < 0) {
      b.next -= dt;
      if (b.next <= 0) {
        if (!m.asleep) this.triggerBlink(Math.random() < 0.11);
        b.next = this.sampleInterval();
      }
    }
    let v = 0;
    if (b.anim >= 0) {
      const slow = 1 + m.sleepy * 1.1 + m.bored * 0.3;
      const close = 0.07 * slow, hold = 0.035 * slow, open = 0.16 * slow;
      b.anim += dt;
      const t = b.anim;
      if (t < close) v = easeIn(t / close);
      else if (t < close + hold) v = 1;
      else if (t < close + hold + open) v = 1 - easeOut((t - close - hold) / open);
      else {
        v = 0;
        b.anim = -1;
        if (b.queueDouble) { b.queueDouble = false; b.next = 0.09 + Math.random() * 0.08; }
      }
    }
    // resting lid height: heavy when sleepy, closed when asleep, a little
    // heavier when bored, and never while startled
    let lidGoal = m.asleep ? 1 : clamp(m.sleepy * 0.52 + m.bored * 0.14 + m.waking * 0.35);
    lidGoal *= 1 - clamp(m.surprise * 1.5);
    if (this.yawn.t >= 0) lidGoal = Math.max(lidGoal, this.yawn.amt * 0.95);
    b.lid = approach(b.lid, lidGoal, m.asleep ? 1.2 : 2.6, dt);
    b.value = Math.max(v, b.lid);

    while (b.events.length && this.time - b.events[0] > 24) b.events.shift();
  }

  sampleInterval() {
    const m = this.mood;
    // right-skewed: mostly 2-5 s, sometimes much longer
    let s = 1.2 + -Math.log(1 - Math.random()) * 2.5;
    if (m.surprise > 0.3) s += 1.4;
    s *= 1 - m.bored * 0.3 - m.sleepy * 0.25;
    return clamp(s, 0.6, 9);
  }

  updateGaze(dt, desired, origin) {
    const s = this.sac;
    const err = angleBetween(this.eyeGoal, desired, origin);

    if (!s.pending && err > 0.055) {
      s.pending = true;
      s.amp = err;
      s.timer = 0.09 + Math.random() * 0.11;    // saccadic latency
    }
    if (s.pending) {
      s.timer -= dt;
      if (s.timer <= 0) {
        s.pending = false;
        this.eyeGoal.copy(desired);
        this.micro.set(0, 0, 0);
        s.count++;
        if (s.amp > 0.33 && Math.random() < 0.55) this.triggerBlink();
        s.microTimer = 0.4 + Math.random() * 1.2;
        this.emit('saccade', s.amp);
      }
    } else {
      // small errors are followed smoothly, like pursuit
      this.eyeGoal.lerp(desired, 1 - Math.exp(-3.5 * dt));
      s.microTimer -= dt;
      if (s.microTimer <= 0) {
        const r = origin.distanceTo(desired) * 0.011;
        this.micro.set((Math.random() - 0.5) * r * 2, (Math.random() - 0.5) * r * 1.3, 0);
        s.microTimer = 0.45 + Math.random() * 1.5;
      }
    }

    _c.copy(this.eyeGoal).add(this.micro);
    this.eye.lerp(_c, 1 - Math.exp(-40 * dt));

    // the head follows the eyes, late and a little lazily (critically damped spring)
    const k = 16 * (1 - this.mood.sleepy * 0.5);
    const c = 2 * Math.sqrt(k) * 0.95;
    _a.subVectors(this.eyeGoal, this.head).multiplyScalar(k * dt);
    this.headVel.add(_a).addScaledVector(this.headVel, -c * dt);
    this.head.addScaledVector(this.headVel, dt);

    // log gaze direction for the instrument
    _a.subVectors(this.eye, origin);
    this.gazeYaw = Math.atan2(_a.x, _a.z);
    this.gazePitch = Math.atan2(_a.y, Math.hypot(_a.x, _a.z));
    const last = this.gazeTrail[this.gazeTrail.length - 1];
    if (!last || this.time - last.t > 1 / 20) {
      this.gazeTrail.push({ yaw: this.gazeYaw, pitch: this.gazePitch, t: this.time });
      while (this.gazeTrail.length > 70) this.gazeTrail.shift();
    }

    // an occasional thoughtful head tilt
    this._tiltTimer -= dt;
    if (this._tiltTimer <= 0) {
      this.tiltGoal = (Math.random() - 0.5) * 0.12 * (1 + this.mood.curious * 1.5);
      this._tiltTimer = 3 + Math.random() * 6;
    }
    this.tilt = approach(this.tilt, this.tiltGoal + this.mood.curious * 0.07, 1.4, dt);
  }

  updateExpressions(dt) {
    const m = this.mood;
    const e = this.expr;

    // yawn envelope: ~3.4 s, mouth open wide in the middle
    let yawnMouth = 0;
    if (this.yawn.t >= 0) {
      this.yawn.t += dt;
      const t = this.yawn.t;
      const env = t < 1.1 ? smooth(t / 1.1) : t < 2.2 ? 1 : 1 - smooth((t - 2.2) / 1.2);
      this.yawn.amt = env;
      yawnMouth = env;
      if (t > 3.4) { this.yawn.t = -1; this.yawn.amt = 0; }
    }
    if (this.sigh.t >= 0) { this.sigh.t += dt; if (this.sigh.t > 2.2) this.sigh.t = -1; }
    const sighMouth = this.sigh.t >= 0 ? Math.sin(clamp(this.sigh.t / 2.2) * Math.PI) * 0.18 : 0;

    const goal = {
      happy: clamp(m.joy * 0.42 - m.annoy * 0.6 - yawnMouth),
      relaxed: clamp(0.14 + m.sleepy * 0.3 + m.joy * 0.35 + m.shy * 0.25 - m.surprise * 1.2 - m.annoy * 0.8 - yawnMouth * 0.5),
      surprised: clamp(m.surprise * 0.8 - yawnMouth),
      angry: clamp(m.annoy * 0.62),
      sad: clamp(m.bored * 0.1 + (m.asleep ? 0 : 0)),
      aa: clamp(yawnMouth * 0.85 + m.surprise * 0.12),
      oh: clamp(yawnMouth * 0.35 + m.surprise * 0.18 + sighMouth),
      ee: 0, ih: 0,
      ou: clamp(m.annoy > 0.6 ? (m.annoy - 0.6) * 0.5 : 0),
    };
    for (const k in goal) e[k] = approach(e[k], goal[k], 7, dt);
  }
}

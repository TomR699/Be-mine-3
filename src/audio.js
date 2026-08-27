/**
 * Sound.
 *
 * Everything here is synthesised at runtime. There are no audio files to lose,
 * to mis-path, or to fail to download on the night — the same reason the art is
 * generated rather than loaded.
 *
 * The one exception is optional: drop a file at `audio/theme.mp3` and it plays
 * over the bench scene at the end. If it isn't there, nothing breaks and the
 * ending runs on wind alone.
 *
 * Browsers refuse to start audio until the user has interacted with the page,
 * which is why `start()` is called from the title screen rather than on load.
 */
export class Sound {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.muted = false;
    this.dusk = 0;
    this.nearSea = 0;
  }

  /** Must be called from inside a real user gesture. */
  async start() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;                       // no audio here; play on in silence

    try {
      this.ctx = new AC();
      if (this.ctx.state === 'suspended') await this.ctx.resume();
    } catch {
      this.ctx = null;
      return;
    }

    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.0001;
    this.master.connect(ctx.destination);
    // fade up, rather than arriving with a thump
    this.master.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 2.5);

    this._buildNoise();
    this._buildWind();
    this._buildSea();
    this._buildPad();

    this.ready = true;
  }

  /** Two seconds of white noise, looped — the source for wind and sea. */
  _buildNoise() {
    const ctx = this.ctx;
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buf;
  }

  _noiseSource() {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuffer;
    s.loop = true;
    s.start();
    return s;
  }

  /** Wind: noise through a bandpass, breathing on a slow LFO. */
  _buildWind() {
    const ctx = this.ctx;
    const src = this._noiseSource();
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 520;
    band.Q.value = 0.7;

    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0.05;

    // two LFOs at different rates so the gusting never sounds periodic
    for (const [rate, depth] of [[0.06, 0.035], [0.017, 0.02]]) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = rate;
      const amt = ctx.createGain();
      amt.gain.value = depth;
      lfo.connect(amt).connect(this.windGain.gain);
      lfo.start();
    }

    src.connect(band).connect(this.windGain).connect(this.master);
  }

  /** Sea: darker noise with a swell, louder the closer she is to the water. */
  _buildSea() {
    const ctx = this.ctx;
    const src = this._noiseSource();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;

    this.seaSwell = ctx.createGain();
    this.seaSwell.gain.value = 0.5;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.14;            // roughly a wave every seven seconds
    const amt = ctx.createGain();
    amt.gain.value = 0.4;
    lfo.connect(amt).connect(this.seaSwell.gain);
    lfo.start();

    this.seaGain = ctx.createGain();
    this.seaGain.gain.value = 0;

    src.connect(lp).connect(this.seaSwell).connect(this.seaGain).connect(this.master);
  }

  /**
   * A quiet held chord. The filter opens and the chord shifts as dusk falls,
   * so the world sounds like it's getting later rather than just looking it.
   */
  _buildPad() {
    const ctx = this.ctx;
    this.padGain = ctx.createGain();
    this.padGain.gain.value = 0.055;

    this.padFilter = ctx.createBiquadFilter();
    this.padFilter.type = 'lowpass';
    this.padFilter.frequency.value = 700;
    this.padFilter.Q.value = 0.6;

    this.padVoices = [];
    // an open, unresolved voicing — nothing that sounds like an ending yet
    for (const f of [110, 164.81, 220, 329.63]) {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = 0.25;
      // a slow detune drift keeps it from sounding like a held synth chord
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.05 + Math.random() * 0.06;
      const amt = ctx.createGain();
      amt.gain.value = 2.2;
      lfo.connect(amt).connect(o.detune);
      lfo.start();
      o.connect(g).connect(this.padFilter);
      o.start();
      this.padVoices.push(o);
    }
    this.padFilter.connect(this.padGain).connect(this.master);
  }

  /** A soft struck bell, for opening a memory. */
  chime(semitone = 0) {
    if (!this.ready || this.muted) return;
    const ctx = this.ctx;
    const base = 523.25 * Math.pow(2, semitone / 12);
    const out = ctx.createGain();
    out.gain.value = 0.0001;
    out.connect(this.master);

    // a fundamental plus two quiet partials, each decaying at its own rate
    [[1, 0.16, 2.6], [2.01, 0.06, 1.7], [2.98, 0.03, 1.1]].forEach(([mul, amp, dec]) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = base * mul;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(amp, ctx.currentTime + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dec);
      o.connect(g).connect(out);
      o.start();
      o.stop(ctx.currentTime + dec + 0.1);
    });
    out.gain.setValueAtTime(1, ctx.currentTime);
  }

  /** A low swell, for the gate coming open. */
  swell() {
    if (!this.ready || this.muted) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(55, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 2.4);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 3.4);
    o.connect(g).connect(this.master);
    o.start();
    o.stop(ctx.currentTime + 3.6);
  }

  /**
   * The bench. Wind and sea pull back, the pad opens up, and if there's a
   * theme file it comes in underneath.
   */
  async ending() {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    this.windGain.gain.linearRampToValueAtTime(0.018, t + 4);
    this.seaGain.gain.linearRampToValueAtTime(0.012, t + 4);
    this.padGain.gain.linearRampToValueAtTime(0.1, t + 6);
    this.padFilter.frequency.linearRampToValueAtTime(1500, t + 8);
    this._endingStarted = true;

    // Optional: your own music, if you drop a file in.
    try {
      const res = await fetch('audio/theme.mp3');
      if (!res.ok) return;
      const buf = await ctx.decodeAudioData(await res.arrayBuffer());
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.55, ctx.currentTime + 5);
      src.connect(g).connect(this.master);
      src.start();
      this.theme = src;
    } catch {
      // no theme, or it wouldn't decode — the wind carries the scene instead
    }
  }

  toggleMute() {
    if (!this.ready) return this.muted;
    this.muted = !this.muted;
    this.master.gain.setTargetAtTime(this.muted ? 0.0001 : 0.5, this.ctx.currentTime, 0.2);
    return this.muted;
  }

  /**
   * Called every frame. `seaProximity` is 0 inland, 1 at the water's edge.
   */
  update(dusk, seaProximity) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this.dusk = dusk;

    if (!this._endingStarted) {
      // the pad warms and opens as the light goes
      this.padFilter.frequency.setTargetAtTime(700 + dusk * 900, t, 1.5);
      this.padGain.gain.setTargetAtTime(0.045 + dusk * 0.05, t, 1.5);
      this.windGain.gain.setTargetAtTime(0.05 - dusk * 0.015, t, 2);
      this.seaGain.gain.setTargetAtTime(seaProximity * 0.14, t, 0.8);
    }
  }
}

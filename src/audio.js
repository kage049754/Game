// Tiny WebAudio synth: every sound effect and the music loop are generated
// on the fly, so there are no audio files to load.
const NOTES = {
  A1: 55.0, C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.0, A2: 110.0,
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0
};

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicBus = null;
    this.sfxBus = null;
    this.muted = false;
    this.musicOn = false;
    this.step = 0;
    this.nextStepTime = 0;
    this.timer = null;
    this.lastSfx = {};
  }

  // Cheap rate limit: returns true if the sound may play now.
  allow(name, minGap = 0.035) {
    if (!this.ctx) return false;
    const now = this.ctx.currentTime;
    if (this.lastSfx[name] && now - this.lastSfx[name] < minGap) return false;
    this.lastSfx[name] = now;
    return true;
  }

  init() {
    if (this.ctx) return true;
    const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return false;
    try {
      this.ctx = new AC();
    } catch {
      return false;
    }
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.55;
    this.master.connect(this.ctx.destination);

    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = 0.9;
    this.sfxBus.connect(this.master);

    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = 0.0;
    this.musicBus.connect(this.master);
    return true;
  }

  unlock() {
    if (!this.init()) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  get ready() {
    return !!this.ctx && this.ctx.state === 'running';
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setTargetAtTime(muted ? 0 : 0.55, this.ctx.currentTime, 0.02);
    }
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  // ---- primitives -------------------------------------------------------

  tone({ freq = 440, to = null, type = 'square', dur = 0.1, vol = 0.2, when = 0, attack = 0.004, bus = null }) {
    if (!this.ready) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(bus || this.sfxBus);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  noise({ dur = 0.12, vol = 0.2, freq = 1200, to = null, q = 1, type = 'lowpass', when = 0 }) {
    if (!this.ready) return;
    const t0 = this.ctx.currentTime + when;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t0);
    filter.Q.value = q;
    if (to !== null) filter.frequency.exponentialRampToValueAtTime(Math.max(40, to), t0 + dur);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxBus);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  arp(freqs, { step = 0.06, vol = 0.14, type = 'square', dur = 0.1 } = {}) {
    freqs.forEach((f, i) => this.tone({ freq: f, type, dur, vol, when: i * step }));
  }

  // ---- game sounds ------------------------------------------------------

  shoot() {
    if (!this.allow('shoot', 0.04)) return;
    this.tone({ freq: 880, to: 420, type: 'square', dur: 0.07, vol: 0.045 });
    this.noise({ dur: 0.04, vol: 0.03, freq: 3200, type: 'highpass' });
  }
  hit() {
    if (!this.allow('hit', 0.03)) return;
    this.noise({ dur: 0.06, vol: 0.07, freq: 2200, to: 700 });
  }
  kill() {
    if (!this.allow('kill', 0.045)) return;
    this.tone({ freq: 180, to: 55, type: 'sawtooth', dur: 0.18, vol: 0.07 });
    this.noise({ dur: 0.16, vol: 0.06, freq: 900, to: 200 });
  }
  crit() {
    this.tone({ freq: 1400, to: 340, type: 'square', dur: 0.1, vol: 0.06 });
    this.tone({ freq: 700, to: 200, type: 'triangle', dur: 0.14, vol: 0.05 });
  }
  hurt() {
    this.tone({ freq: 320, to: 70, type: 'sawtooth', dur: 0.28, vol: 0.14 });
    this.noise({ dur: 0.2, vol: 0.1, freq: 700, to: 120 });
  }
  dash() {
    this.noise({ dur: 0.22, vol: 0.1, freq: 380, to: 2600, type: 'bandpass', q: 1.2 });
    this.tone({ freq: 200, to: 620, type: 'triangle', dur: 0.16, vol: 0.05 });
  }
  gem(pitch = 0) {
    if (!this.allow('gem', 0.03)) return;
    this.tone({ freq: 880 + pitch * 60, to: 1320 + pitch * 60, type: 'sine', dur: 0.08, vol: 0.05 });
  }
  levelUp() {
    this.arp([NOTES.C5, NOTES.E5, NOTES.G5, NOTES.C5 * 2], { step: 0.07, vol: 0.12, dur: 0.16 });
  }
  waveStart() {
    this.tone({ freq: 110, to: 55, type: 'sawtooth', dur: 0.6, vol: 0.09 });
    this.arp([NOTES.A3, NOTES.C4, NOTES.E4], { step: 0.09, vol: 0.06, type: 'triangle' });
  }
  boss() {
    this.tone({ freq: 90, to: 45, type: 'sawtooth', dur: 1.1, vol: 0.16 });
    this.tone({ freq: 134, to: 67, type: 'square', dur: 1.1, vol: 0.07 });
    this.noise({ dur: 1.0, vol: 0.08, freq: 300, to: 60 });
  }
  gameOver() {
    this.arp([NOTES.A3, NOTES.G3, NOTES.F3, NOTES.E3], { step: 0.16, vol: 0.14, dur: 0.32, type: 'triangle' });
    this.tone({ freq: 110, to: 40, type: 'sawtooth', dur: 1.2, vol: 0.1, when: 0.2 });
  }
  click() {
    this.tone({ freq: 660, to: 880, type: 'square', dur: 0.05, vol: 0.07 });
  }
  select() {
    this.arp([NOTES.E4, NOTES.A4, NOTES.E5], { step: 0.055, vol: 0.1, dur: 0.12 });
  }

  // ---- music ------------------------------------------------------------

  startMusic() {
    if (!this.init() || this.musicOn) return;
    this.musicOn = true;
    this.step = 0;
    this.nextStepTime = this.ctx.currentTime + 0.1;
    this.musicBus.gain.cancelScheduledValues(this.ctx.currentTime);
    this.musicBus.gain.setTargetAtTime(0.16, this.ctx.currentTime, 1.2);
    this.timer = setInterval(() => this.scheduleMusic(), 60);
  }

  stopMusic(fade = 0.6) {
    if (!this.ctx) return;
    this.musicOn = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.musicBus.gain.cancelScheduledValues(this.ctx.currentTime);
    this.musicBus.gain.setTargetAtTime(0, this.ctx.currentTime, fade / 3);
  }

  scheduleMusic() {
    if (!this.musicOn || !this.ready) return;
    const stepDur = 0.165;
    // dark A-minor ostinato with a wandering high arp
    const bass = [0, null, null, 1, null, null, 2, null, 3, null, null, 4, null, null, 5, null];
    const bassNotes = [NOTES.A1, NOTES.C2, NOTES.E2, NOTES.F2, NOTES.G2, NOTES.A1];
    const arpNotes = [NOTES.A3, NOTES.C4, NOTES.E4, NOTES.A4, NOTES.G4, NOTES.E4];

    while (this.nextStepTime < this.ctx.currentTime + 0.2) {
      const s = this.step % 16;
      if (bass[s] !== null) {
        this.playMusicNote(bassNotes[bass[s]], 0.22, 'triangle', 0.5, this.nextStepTime);
      }
      if (s % 2 === 1) {
        const n = arpNotes[(this.step >> 1) % arpNotes.length];
        this.playMusicNote(n, 0.1, 'square', 0.16, this.nextStepTime);
      }
      if (s === 0 || s === 8) {
        this.playNoiseHit(this.nextStepTime, 0.06);
      }
      this.nextStepTime += stepDur;
      this.step++;
    }
  }

  playMusicNote(freq, dur, type, vol, when) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1400;
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(vol, when + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicBus);
    osc.start(when);
    osc.stop(when + dur + 0.05);
  }

  playNoiseHit(when, vol) {
    const len = Math.floor(this.ctx.sampleRate * 0.08);
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    const gain = this.ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicBus);
    src.start(when);
  }
}

export const audio = new AudioEngine();
export default audio;

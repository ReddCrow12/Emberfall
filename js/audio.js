/* ============ Emberfall — procedural WebAudio music & SFX ============ */
'use strict';

const Audio2 = {
  ctx: null, musicGain: null, sfxGain: null,
  musicVol: 0.5, sfxVol: 0.7,
  theme: null, _timer: null, _step: 0, _nextTime: 0,

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.musicGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.musicGain.connect(this.ctx.destination);
    this.sfxGain.connect(this.ctx.destination);
    const mv = parseFloat(localStorage.getItem('ef_musicVol'));
    const sv = parseFloat(localStorage.getItem('ef_sfxVol'));
    if (!isNaN(mv)) this.musicVol = mv;
    if (!isNaN(sv)) this.sfxVol = sv;
    this.musicGain.gain.value = this.musicVol * 0.4;
    this.sfxGain.gain.value = this.sfxVol;
  },

  setMusicVol(v) {
    this.musicVol = v; localStorage.setItem('ef_musicVol', v);
    if (this.musicGain) this.musicGain.gain.value = v * 0.4;
  },
  setSfxVol(v) {
    this.sfxVol = v; localStorage.setItem('ef_sfxVol', v);
    if (this.sfxGain) this.sfxGain.gain.value = v;
  },

  // ---------- music sequencer ----------
  // Each theme: tempo (steps/sec), bass + lead note sequences (Hz, 0 = rest), waveforms
  THEMES: {
    village: {
      rate: 3.4, bassWave: 'triangle', leadWave: 'sine',
      bass: [131, 0, 165, 0, 98, 0, 123, 0, 131, 0, 165, 0, 196, 0, 123, 0],
      lead: [523, 0, 659, 587, 523, 0, 494, 0, 440, 0, 523, 494, 392, 0, 0, 0],
    },
    explore: {
      rate: 3.0, bassWave: 'triangle', leadWave: 'square',
      bass: [110, 0, 110, 0, 87, 0, 87, 0, 98, 0, 98, 0, 73, 0, 82, 0],
      lead: [440, 0, 523, 0, 587, 523, 440, 0, 392, 0, 440, 523, 587, 0, 659, 0],
    },
    forest: {
      rate: 2.6, bassWave: 'sine', leadWave: 'sine',
      bass: [98, 0, 0, 110, 0, 0, 87, 0, 0, 98, 0, 0, 73, 0, 0, 0],
      lead: [587, 0, 659, 0, 740, 0, 659, 0, 587, 0, 494, 0, 440, 0, 494, 0],
    },
    cave: {
      rate: 2.0, bassWave: 'sine', leadWave: 'triangle',
      bass: [55, 0, 0, 0, 58, 0, 0, 0, 49, 0, 0, 0, 55, 0, 0, 0],
      lead: [220, 0, 0, 233, 0, 0, 0, 0, 196, 0, 0, 220, 0, 0, 0, 0],
    },
    boss: {
      rate: 5.0, bassWave: 'sawtooth', leadWave: 'square',
      bass: [82, 82, 0, 82, 87, 0, 82, 0, 78, 78, 0, 78, 82, 0, 73, 0],
      lead: [330, 0, 311, 330, 0, 392, 0, 330, 311, 0, 294, 311, 0, 247, 0, 0],
    },
    victory: {
      rate: 4.2, bassWave: 'triangle', leadWave: 'square', once: true,
      bass: [131, 0, 165, 0, 196, 0, 262, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      lead: [523, 523, 0, 523, 0, 659, 0, 784, 1047, 0, 0, 0, 0, 0, 0, 0],
    },
  },

  playMusic(theme) {
    if (theme === this.theme) return;
    this.theme = theme;
    this._step = 0;
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    if (!this.ctx || !theme || !this.THEMES[theme]) return;
    this._nextTime = this.ctx.currentTime + 0.08;
    this._timer = setInterval(() => this._tick(), 90);
  },

  stopMusic() { this.playMusic(null); },

  _tick() {
    if (!this.ctx || !this.theme) return;
    const t = this.THEMES[this.theme];
    const stepDur = 1 / t.rate;
    while (this._nextTime < this.ctx.currentTime + 0.25) {
      const i = this._step % 16;
      if (t.bass[i]) this._note(t.bass[i], this._nextTime, stepDur * 0.95, t.bassWave, 0.45);
      if (t.lead[i]) this._note(t.lead[i], this._nextTime, stepDur * 0.8, t.leadWave, 0.22);
      this._step++;
      this._nextTime += stepDur;
      if (t.once && this._step >= 16) {
        clearInterval(this._timer); this._timer = null; this.theme = null;
        return;
      }
    }
  },

  _note(freq, when, dur, wave, vol) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = wave; o.frequency.value = freq;
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    o.connect(g); g.connect(this.musicGain);
    o.start(when); o.stop(when + dur + 0.05);
  },

  // ---------- SFX ----------
  sfx(name) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const S = (fn) => fn(this.ctx, this.sfxGain, t);
    const tone = (freq, dur, wave, vol, when, slideTo) => {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = wave || 'sine'; o.frequency.setValueAtTime(freq, t + (when || 0));
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + (when || 0) + dur);
      g.gain.setValueAtTime(vol || 0.3, t + (when || 0));
      g.gain.exponentialRampToValueAtTime(0.001, t + (when || 0) + dur);
      o.connect(g); g.connect(this.sfxGain);
      o.start(t + (when || 0)); o.stop(t + (when || 0) + dur + 0.05);
    };
    const noise = (dur, vol, when, filterFreq) => {
      const len = Math.ceil(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource(); src.buffer = buf;
      const g = this.ctx.createGain(); g.gain.value = vol || 0.3;
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filterFreq || 3000;
      src.connect(f); f.connect(g); g.connect(this.sfxGain);
      src.start(t + (when || 0));
    };

    switch (name) {
      case 'click': tone(660, 0.06, 'square', 0.12); break;
      case 'open': tone(440, 0.08, 'sine', 0.15); tone(660, 0.1, 'sine', 0.12, 0.06); break;
      case 'close': tone(660, 0.08, 'sine', 0.12); tone(440, 0.1, 'sine', 0.1, 0.06); break;
      case 'step': noise(0.05, 0.06, 0, 900); break;
      case 'sword': noise(0.12, 0.25, 0, 5000); tone(300, 0.1, 'square', 0.12, 0, 120); break;
      case 'crit': noise(0.18, 0.35, 0, 6000); tone(500, 0.18, 'square', 0.2, 0, 100); tone(750, 0.12, 'square', 0.15, 0.05); break;
      case 'hit': noise(0.1, 0.22, 0, 1200); tone(150, 0.12, 'square', 0.18, 0, 70); break;
      case 'magic': tone(400, 0.3, 'sine', 0.2, 0, 1200); tone(800, 0.25, 'triangle', 0.12, 0.08, 1600); break;
      case 'fire': noise(0.35, 0.25, 0, 1800); tone(200, 0.3, 'sawtooth', 0.1, 0, 80); break;
      case 'ice': tone(1400, 0.25, 'sine', 0.15, 0, 500); tone(1800, 0.2, 'triangle', 0.1, 0.08, 700); break;
      case 'heal': tone(523, 0.15, 'sine', 0.18); tone(659, 0.15, 'sine', 0.18, 0.1); tone(784, 0.25, 'sine', 0.18, 0.2); break;
      case 'coin': tone(988, 0.07, 'square', 0.15); tone(1319, 0.18, 'square', 0.15, 0.07); break;
      case 'loot': tone(523, 0.1, 'triangle', 0.2); tone(659, 0.1, 'triangle', 0.2, 0.09); tone(784, 0.1, 'triangle', 0.2, 0.18); tone(1047, 0.3, 'triangle', 0.22, 0.27); break;
      case 'lootEpic':
        for (let i = 0; i < 6; i++) tone(523 * Math.pow(1.122, i), 0.12, 'triangle', 0.2, i * 0.07);
        tone(1568, 0.5, 'sine', 0.18, 0.45); break;
      case 'levelup':
        tone(392, 0.12, 'square', 0.18); tone(523, 0.12, 'square', 0.18, 0.11);
        tone(659, 0.12, 'square', 0.18, 0.22); tone(784, 0.4, 'square', 0.2, 0.33); break;
      case 'quest': tone(587, 0.14, 'sine', 0.2); tone(880, 0.3, 'sine', 0.2, 0.13); break;
      case 'dodge': noise(0.08, 0.12, 0, 7000); tone(900, 0.1, 'sine', 0.08, 0, 1400); break;
      case 'death': tone(300, 0.5, 'sawtooth', 0.2, 0, 60); noise(0.4, 0.2, 0.1, 600); break;
      case 'flee': noise(0.2, 0.12, 0, 2500); tone(600, 0.25, 'sine', 0.1, 0, 200); break;
      case 'chest': tone(330, 0.1, 'square', 0.15); tone(415, 0.1, 'square', 0.15, 0.1); tone(523, 0.25, 'square', 0.18, 0.2); break;
      case 'talk': tone(500, 0.05, 'sine', 0.1); tone(620, 0.06, 'sine', 0.08, 0.05); break;
      case 'error': tone(220, 0.15, 'square', 0.15); tone(180, 0.2, 'square', 0.15, 0.12); break;
      case 'shrine': tone(440, 0.4, 'sine', 0.15); tone(554, 0.4, 'sine', 0.13, 0.05); tone(659, 0.6, 'sine', 0.13, 0.1); break;
      case 'stairs': tone(400, 0.12, 'triangle', 0.15, 0, 200); tone(300, 0.15, 'triangle', 0.13, 0.1, 150); break;
      case 'roar': tone(90, 0.8, 'sawtooth', 0.3, 0, 50); noise(0.7, 0.3, 0, 400); break;
      default: tone(440, 0.08, 'sine', 0.1);
    }
  },
};

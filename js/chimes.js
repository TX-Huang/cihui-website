// 風鈴聲：用 Web Audio 現場合成，不需要音檔。
// 音階用五聲音階（宮商角徵羽），左邊的字低音、右邊的字高音。

const PENTA = [0, 2, 4, 7, 9]; // 宮 商 角 徵 羽（半音）
const BASE_HZ = 523.25; // C5
const PARTIALS = [
  { ratio: 1, gain: 1, decay: 2.2 },
  { ratio: 2.76, gain: 0.45, decay: 1.1 },
  { ratio: 5.4, gain: 0.22, decay: 0.55 },
  { ratio: 8.93, gain: 0.1, decay: 0.3 }
];

export class Chimes {
  constructor() {
    this.enabled = true;
    this.volume = 0.28;
    this.ctx = null;
    this.master = null;
    this.lastId = -1;
    this.lastTime = 0;
    this.noteOffset = 0;
  }

  // 瀏覽器規定：要使用者先點一下，才能出聲
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
  }

  setNoteOffset(n) {
    this.noteOffset = n;
  }

  strike({ id, col, cols, intensity = 0.5, force = false }) {
    if (!this.enabled || !this.ctx || this.ctx.state !== "running") return;
    const now = performance.now();
    if (!force && (id === this.lastId || now - this.lastTime < 70)) return;
    this.lastId = id;
    this.lastTime = now;

    const steps = PENTA.length * 2;
    const idx = Math.min(steps - 1, Math.floor((col / Math.max(1, cols - 1)) * steps));
    const octave = Math.floor(idx / PENTA.length);
    const semis = PENTA[idx % PENTA.length] + octave * 12 + this.noteOffset;
    const freq = BASE_HZ * 2 ** (semis / 12) * (1 + (Math.random() - 0.5) * 0.004);
    this.ring(freq, Math.min(1, intensity));
  }

  ring(freq, intensity) {
    const t = this.ctx.currentTime;
    const pan = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    const out = pan || this.master;
    if (pan) {
      pan.pan.value = (Math.random() - 0.5) * 0.6;
      pan.connect(this.master);
    }
    for (const p of PARTIALS) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq * p.ratio;
      const peak = 0.18 * p.gain * intensity;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + p.decay);
      osc.connect(g).connect(out);
      osc.start(t);
      osc.stop(t + p.decay + 0.05);
    }
  }
}

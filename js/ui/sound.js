// Âm thanh kiểu synth tổng hợp trực tiếp bằng Web Audio API → không cần file âm thanh nào.

/**
 * Mỗi âm thanh là danh sách nốt:
 * freq: tần số bắt đầu (Hz), to: tần số kết thúc (trượt), at: thời điểm bắt đầu (giây),
 * duration: độ dài, type: dạng sóng, volume: âm lượng tương đối.
 */
const C_MAJOR_UP = [523.25, 659.25, 783.99, 1046.5]; // Đô – Mi – Sol – Đô

const SOUNDS = Object.freeze({
  placeX: [{ freq: 660, to: 990, duration: 0.09, type: 'square', volume: 0.3 }],
  placeO: [{ freq: 520, to: 330, duration: 0.11, type: 'triangle', volume: 0.6 }],
  hint: [
    { freq: 1320, duration: 0.1, volume: 0.35 },
    { freq: 1760, at: 0.07, duration: 0.16, volume: 0.3 },
  ],
  undo: [{ freq: 600, to: 380, duration: 0.1, type: 'triangle', volume: 0.5 }],
  win: [
    ...C_MAJOR_UP.map((freq, i) => ({ freq, at: 0.12 + i * 0.09, duration: 0.24, type: 'triangle', volume: 0.6 })),
    { freq: 2093, at: 0.5, duration: 0.35, volume: 0.2 },
  ],
  lose: [
    { freq: 330, to: 110, at: 0.12, duration: 0.6, type: 'sawtooth', volume: 0.3 },
    { freq: 247, to: 82, at: 0.12, duration: 0.6, type: 'square', volume: 0.12 },
  ],
  draw: [
    { freq: 440, at: 0.12, duration: 0.14, volume: 0.45 },
    { freq: 440, at: 0.32, duration: 0.22, volume: 0.45 },
  ],
});

export class SoundEngine {
  #ctx = null;
  #master = null;
  #muted = false;
  #unlocked = false;

  /**
   * Trình duyệt chỉ cho phát âm thanh sau khi người dùng tương tác,
   * nên chỉ tạo AudioContext ở lần click/nhấn phím đầu tiên.
   */
  attachUnlock(target = document) {
    const unlock = () => {
      this.#unlocked = true;
      this.#ensureContext();
      target.removeEventListener('pointerdown', unlock);
      target.removeEventListener('keydown', unlock);
    };
    target.addEventListener('pointerdown', unlock);
    target.addEventListener('keydown', unlock);
  }

  get muted() {
    return this.#muted;
  }

  setMuted(muted) {
    this.#muted = Boolean(muted);
  }

  play(name) {
    if (this.#muted || !this.#unlocked) return;
    const recipe = SOUNDS[name];
    const ctx = recipe && this.#ensureContext();
    if (!ctx) return;
    for (const note of recipe) this.#tone(ctx, note);
  }

  #ensureContext() {
    if (!this.#ctx) {
      const AudioCtx = globalThis.AudioContext ?? globalThis.webkitAudioContext;
      if (!AudioCtx) return null;
      this.#ctx = new AudioCtx();
      this.#master = this.#ctx.createGain();
      this.#master.gain.value = 0.18;
      this.#master.connect(this.#ctx.destination);
    }
    if (this.#ctx.state === 'suspended') this.#ctx.resume().catch(() => {});
    return this.#ctx;
  }

  #tone(ctx, { freq, to = freq, at = 0, duration = 0.12, type = 'sine', volume = 1 }) {
    const t0 = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to !== freq) osc.frequency.exponentialRampToValueAtTime(to, t0 + duration);

    // Envelope: bật lên nhanh, tắt dần → tránh tiếng "lụp bụp"
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    osc.connect(gain).connect(this.#master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }
}

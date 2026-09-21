/**
 * Tiny synthesized sound effects. No audio files, no licensing, and they only
 * play after the kid has tapped something, which is when browsers allow audio.
 */
type Effect = "correct" | "wrong" | "whistle" | "badge" | "tap";

let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(ac: AudioContext, freq: number, start: number, length: number, type: OscillatorType = "sine", gain = 0.12) {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + length);
  osc.connect(g).connect(ac.destination);
  osc.start(start);
  osc.stop(start + length + 0.02);
}

export function playSound(effect: Effect) {
  if (!enabled) return;
  const ac = context();
  if (!ac) return;
  const t = ac.currentTime;
  try {
    switch (effect) {
      case "correct":
        tone(ac, 660, t, 0.12);
        tone(ac, 880, t + 0.12, 0.18);
        break;
      case "wrong":
        tone(ac, 220, t, 0.2, "triangle", 0.1);
        tone(ac, 180, t + 0.15, 0.25, "triangle", 0.1);
        break;
      case "whistle":
        tone(ac, 2200, t, 0.08, "square", 0.05);
        tone(ac, 2600, t + 0.08, 0.22, "square", 0.05);
        break;
      case "badge":
        [523, 659, 784, 1047].forEach((f, i) => tone(ac, f, t + i * 0.1, 0.25));
        break;
      case "tap":
        tone(ac, 440, t, 0.05, "sine", 0.06);
        break;
    }
  } catch {
    // Audio is a nicety. Never let it break the game.
  }
}

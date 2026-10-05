// A bell made in the browser (Web Audio): no sound file, no dependency. Browsers only allow
// sound after the page was touched once, so the board unlocks the audio on its first tap.

let context: AudioContext | null = null;

function audio() {
  if (typeof window === "undefined" || !("AudioContext" in window)) return null;
  context ??= new AudioContext();
  return context;
}

/** Call from a user gesture (tap, key): later chimes can then play. */
export function unlockAudio() {
  const ctx = audio();
  if (ctx?.state === "suspended") void ctx.resume();
}

// A soft three note "ding-dong-ding" (E6, C6, G6) with bell-like overtones.
const NOTES = [1318.5, 1046.5, 1568];

function ding(ctx: AudioContext, at: number, frequency: number) {
  for (const [ratio, level] of [
    [1, 0.22],
    [2.4, 0.05],
  ] as const) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency * ratio;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(level, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 1.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + 1.5);
  }
}

/** Rings every few seconds for `durationMs`; returns a stop function. Silent if audio is locked. */
export function startChime(durationMs: number) {
  const ctx = audio();
  if (!ctx) return () => {};
  const play = () => {
    if (ctx.state !== "running") return;
    NOTES.forEach((f, i) => ding(ctx, ctx.currentTime + i * 0.35, f));
  };
  play();
  const repeat = setInterval(play, 3000);
  const end = setTimeout(() => clearInterval(repeat), durationMs);
  return () => {
    clearInterval(repeat);
    clearTimeout(end);
  };
}

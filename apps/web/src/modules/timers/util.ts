import type { Timer } from "@toolkit/shared";

export function isRunning(timer: Timer): boolean {
  return timer.endsAt != null;
}

/** Remaining whole seconds, computed live from endsAt while running. */
export function remainingSeconds(timer: Timer, nowMs: number): number {
  if (timer.endsAt) {
    return Math.max(0, Math.round((Date.parse(timer.endsAt) - nowMs) / 1000));
  }
  return Math.max(0, timer.remainingSeconds);
}

/** Formats seconds as M:SS, or H:MM:SS when an hour or longer. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

let audioCtx: AudioContext | null = null;

/** Short two-tone beep via WebAudio. No asset; the GM's click unlocks audio. */
export function playAlarm(): void {
  try {
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    audioCtx ??= new Ctor();
    const ctx = audioCtx;
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = now + i * 0.18;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.18);
    });
  } catch {
    /* audio unavailable — visual flash still fires */
  }
}

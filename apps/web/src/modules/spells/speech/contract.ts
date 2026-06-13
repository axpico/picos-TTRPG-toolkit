/**
 * Shared contract for the voice-search engines. Two implementations satisfy it:
 * the native Web Speech API (`useNativeSpeechRecognition`, for Chrome/Edge/Safari)
 * and an offline WASM Vosk engine (`useVoskSpeechRecognition`, the Firefox path).
 * `useSpeechRecognition` picks one. The minimal typed surface below doubles as the
 * contract for test fakes.
 */

export interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}

export interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

export interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  start: () => void;
  stop: () => void;
}

export type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Keep only the tail of the rolling transcript; old speech is irrelevant. */
export const TRANSCRIPT_MAX_CHARS = 400;

/**
 * Voice capture only works in a secure context (HTTPS or localhost). Over a plain
 * http:// LAN or remote IP `getUserMedia` is unavailable — the single most common
 * "mic not working" report for self-hosted setups — so we treat it as unsupported.
 */
export function isSecureContext(): boolean {
  return typeof window !== "undefined" && window.isSecureContext === true;
}

export const INSECURE_REASON = "Voice search needs HTTPS or localhost";

export interface UseSpeechRecognition {
  supported: boolean;
  listening: boolean;
  /** Accumulated final results (rolling, capped). */
  transcript: string;
  /** Current interim hypothesis, replaced as the engine refines it. */
  interim: string;
  error: string | null;
  /** True while an offline model is downloading / initialising (Vosk path). */
  loading?: boolean;
  /** Human-readable progress for the loading state, e.g. "Downloading… 45%". */
  loadingDetail?: string;
  start: () => void;
  stop: () => void;
}

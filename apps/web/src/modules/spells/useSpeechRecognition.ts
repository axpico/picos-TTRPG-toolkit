import { useNativeSpeechRecognition } from "./speech/useNativeSpeechRecognition.js";
import { useVoskSpeechRecognition } from "./speech/useVoskSpeechRecognition.js";
import type { UseSpeechRecognition } from "./speech/contract.js";

// Re-exported for back-compat: callers and tests import the contract + ctor
// detection from here.
export {
  getSpeechRecognitionCtor,
  type UseSpeechRecognition,
} from "./speech/contract.js";

/**
 * Voice search for the Spells widget. Picks the best available engine:
 *
 *   - Native Web Speech API (Chrome/Edge/Safari) when present in a secure context.
 *   - Offline WASM Vosk engine (Firefox) when a model is configured.
 *   - Otherwise unsupported, surfacing the most specific reason so the mic button
 *     can explain itself (insecure context, or "configure the offline model").
 *
 * Both engine hooks are called unconditionally (Rules of Hooks); each is inert
 * until its `start()` runs, so the unused one costs nothing.
 */
export function useSpeechRecognition(opts?: { lang?: string }): UseSpeechRecognition {
  const native = useNativeSpeechRecognition(opts);
  const vosk = useVoskSpeechRecognition();

  if (native.supported) return native;
  if (vosk.supported) return vosk;
  // Neither engine is usable — return whichever carries a concrete reason so the
  // UI explains the situation instead of looking generically broken.
  return native.error ? native : vosk;
}

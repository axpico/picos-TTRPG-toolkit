import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getSpeechRecognitionCtor,
  INSECURE_REASON,
  isSecureContext,
  TRANSCRIPT_MAX_CHARS,
  type SpeechRecognitionLike,
  type UseSpeechRecognition,
} from "./contract.js";

/**
 * Thin React wrapper around the Web Speech API (Chrome/Edge/Safari; Firefox has
 * no implementation — `supported` is false here and the Vosk engine takes over).
 */

/** Errors that mean "stop trying" rather than a transient hiccup. */
const FATAL_ERRORS = new Set([
  "not-allowed",
  "service-not-allowed",
  "audio-capture",
  // `network` fires when the engine can't reach its backend — almost always an
  // insecure-context / offline page rather than a recoverable hiccup.
  "network",
]);

/** Human-readable copy for the fatal error codes we surface in the UI. */
function fatalMessage(code: string): string {
  switch (code) {
    case "audio-capture":
      return "No microphone found";
    case "network":
      return "Voice service unavailable (needs HTTPS / network)";
    default:
      return "Microphone access denied";
  }
}

export function useNativeSpeechRecognition(opts?: { lang?: string }): UseSpeechRecognition {
  const ctor = useMemo(getSpeechRecognitionCtor, []);
  const secure = useMemo(isSecureContext, []);
  const supported = ctor !== null && secure;
  const lang = opts?.lang ?? "en-US";
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const wantListeningRef = useRef(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  // Surface the insecure-context reason up front so the button can explain
  // itself rather than looking generically broken.
  const [error, setError] = useState<string | null>(
    ctor !== null && !secure ? INSECURE_REASON : null,
  );

  const stop = useCallback(() => {
    wantListeningRef.current = false;
    recognitionRef.current?.stop();
    setListening(false);
    setInterim("");
  }, []);

  const start = useCallback(() => {
    if (!supported || !ctor || wantListeningRef.current) return;
    // Prime the mic permission explicitly: the Speech API's implicit prompt is
    // flaky, and a direct getUserMedia call surfaces denied/missing-device
    // errors with a clear message before we even start recognition.
    void navigator.mediaDevices
      ?.getUserMedia({ audio: true })
      .then((stream) => stream.getTracks().forEach((t) => t.stop()))
      .catch((err: unknown) => {
        const name = err instanceof Error ? err.name : "";
        setError(name === "NotFoundError" ? "No microphone found" : "Microphone access denied");
        wantListeningRef.current = false;
        setListening(false);
      });
    let recognition = recognitionRef.current;
    if (!recognition) {
      recognition = new ctor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = lang;
      recognition.onresult = (e) => {
        let finalText = "";
        let interimText = "";
        for (let i = e.resultIndex; i < e.results.length; i += 1) {
          const result = e.results[i]!;
          if (result.isFinal) finalText += ` ${result[0].transcript}`;
          else interimText += ` ${result[0].transcript}`;
        }
        if (finalText) {
          setTranscript((prev) => `${prev}${finalText}`.slice(-TRANSCRIPT_MAX_CHARS));
        }
        setInterim(interimText.trim());
      };
      recognition.onend = () => {
        // Chrome ends recognition after silence; keep going until stop().
        if (wantListeningRef.current) {
          try {
            recognitionRef.current?.start();
          } catch {
            setListening(false);
          }
        } else {
          setListening(false);
        }
      };
      recognition.onerror = (e) => {
        // `no-speech` / `aborted` are transient — onend restarts. Only stop on
        // the fatal set (permission, no device, network/insecure context).
        if (e.error && FATAL_ERRORS.has(e.error)) {
          setError(fatalMessage(e.error));
          wantListeningRef.current = false;
          setListening(false);
        }
      };
      recognitionRef.current = recognition;
    }
    setError(null);
    wantListeningRef.current = true;
    recognition.start();
    setListening(true);
  }, [supported, ctor, lang]);

  useEffect(
    () => () => {
      wantListeningRef.current = false;
      recognitionRef.current?.stop();
    },
    [],
  );

  return { supported, listening, transcript, interim, error, start, stop };
}

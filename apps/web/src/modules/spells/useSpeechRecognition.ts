import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Thin React wrapper around the Web Speech API (Chrome/Edge/Safari; Firefox has
 * no implementation — `supported` is false and `start` is a no-op so callers
 * degrade to manual search). The minimal typed surface below doubles as the
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

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Keep only the tail of the rolling transcript; old speech is irrelevant. */
const TRANSCRIPT_MAX_CHARS = 400;
/** Errors that mean "stop trying" rather than a transient hiccup. */
const FATAL_ERRORS = new Set(["not-allowed", "service-not-allowed", "audio-capture"]);

export interface UseSpeechRecognition {
  supported: boolean;
  listening: boolean;
  /** Accumulated final results (rolling, capped). */
  transcript: string;
  /** Current interim hypothesis, replaced as the engine refines it. */
  interim: string;
  error: string | null;
  start: () => void;
  stop: () => void;
}

export function useSpeechRecognition(opts?: { lang?: string }): UseSpeechRecognition {
  const ctor = useMemo(getSpeechRecognitionCtor, []);
  const lang = opts?.lang ?? "en-US";
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const wantListeningRef = useRef(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    wantListeningRef.current = false;
    recognitionRef.current?.stop();
    setListening(false);
    setInterim("");
  }, []);

  const start = useCallback(() => {
    if (!ctor || wantListeningRef.current) return;
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
        if (e.error && FATAL_ERRORS.has(e.error)) {
          setError(
            e.error === "audio-capture" ? "No microphone found" : "Microphone access denied",
          );
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
  }, [ctor, lang]);

  useEffect(
    () => () => {
      wantListeningRef.current = false;
      recognitionRef.current?.stop();
    },
    [],
  );

  return { supported: ctor !== null, listening, transcript, interim, error, start, stop };
}

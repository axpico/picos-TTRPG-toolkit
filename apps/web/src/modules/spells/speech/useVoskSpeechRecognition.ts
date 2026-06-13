import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// Type-only import: `vosk-browser` (Worker + WASM, multi-MB) is loaded lazily in
// `start()` via dynamic import so it never weighs down the main bundle for the
// browsers that use the native engine.
import type { KaldiRecognizer, Model } from "vosk-browser";
import {
  INSECURE_REASON,
  isSecureContext,
  TRANSCRIPT_MAX_CHARS,
  type UseSpeechRecognition,
} from "./contract.js";

/**
 * Offline voice-search engine for browsers without the Web Speech API (Firefox).
 * Captures mic audio with getUserMedia + an AudioWorklet and transcribes it
 * locally with a WASM Vosk model — no cloud, no API key, matching the project's
 * self-hosted / offline design.
 *
 * The model (~tens of MB) is downloaded on first `start()` from
 * `VITE_VOSK_MODEL_URL`. When that env var is unset, the engine reports itself
 * unsupported with an actionable reason so the mic button can explain what to do
 * rather than looking generically broken.
 */

const WORKLET_URL = "/vosk/recognizer-processor.js";
const MODEL_MISSING_REASON =
  "Offline voice search needs a model — set VITE_VOSK_MODEL_URL (see README)";
const LOAD_FAILED_REASON = "Could not load the offline voice model";

/** Read the configured model URL; empty/unset means the engine is disabled. */
export function getVoskModelUrl(): string | null {
  const url = import.meta.env.VITE_VOSK_MODEL_URL;
  return typeof url === "string" && url.length > 0 ? url : null;
}

/**
 * Download the model archive ourselves (rather than letting `createModel` fetch
 * it) so we can report byte progress and fail fast + clearly on a 404 instead of
 * the silent multi-MB stall users were hitting. Returns an object URL for the
 * downloaded blob, which `createModel` then loads from memory.
 */
export async function downloadModelBlobUrl(
  url: string,
  onProgress: (detail: string) => void,
): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Model not found (HTTP ${res.status}) at ${url}`);
  }
  const total = Number(res.headers.get("content-length")) || 0;
  if (!res.body || total === 0) {
    onProgress("Downloading model…");
    return URL.createObjectURL(await res.blob());
  }
  const reader = res.body.getReader();
  const chunks: BlobPart[] = [];
  let received = 0;
  const totalMb = (total / 1_048_576).toFixed(0);
  for (;;) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
    received += value.length;
    const pct = Math.round((received / total) * 100);
    onProgress(`Downloading model… ${pct}% (${(received / 1_048_576).toFixed(0)}/${totalMb} MB)`);
  }
  return URL.createObjectURL(new Blob(chunks));
}

interface VoskGraph {
  model: Model;
  recognizer: KaldiRecognizer;
  audioContext: AudioContext;
  stream: MediaStream;
  node: AudioWorkletNode;
}

export function useVoskSpeechRecognition(): UseSpeechRecognition {
  const secure = useMemo(isSecureContext, []);
  const modelUrl = useMemo(getVoskModelUrl, []);
  const hasMedia =
    typeof navigator !== "undefined" && typeof navigator.mediaDevices !== "undefined";
  const supported = secure && modelUrl !== null && hasMedia;

  const graphRef = useRef<VoskGraph | null>(null);
  const modelPromiseRef = useRef<Promise<Model> | null>(null);
  const wantListeningRef = useRef(false);
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState<string | undefined>(undefined);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(
    !secure ? INSECURE_REASON : modelUrl === null ? MODEL_MISSING_REASON : null,
  );

  const teardown = useCallback(() => {
    const graph = graphRef.current;
    graphRef.current = null;
    if (!graph) return;
    try {
      graph.node.disconnect();
      graph.stream.getTracks().forEach((t) => t.stop());
      graph.recognizer.remove();
      void graph.audioContext.close();
    } catch {
      // Best-effort cleanup; nothing actionable if a teardown step throws.
    }
  }, []);

  const stop = useCallback(() => {
    wantListeningRef.current = false;
    teardown();
    setListening(false);
    setLoading(false);
    setLoadingDetail(undefined);
    setInterim("");
  }, [teardown]);

  const start = useCallback(() => {
    if (!supported || modelUrl === null || wantListeningRef.current) return;
    wantListeningRef.current = true;
    setError(null);
    setLoading(true);

    void (async () => {
      try {
        // 1. Mic permission + stream (surfaces denied/missing-device clearly).
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // 2. Load (and cache) the engine + model — the expensive, one-time step.
        if (!modelPromiseRef.current) {
          modelPromiseRef.current = (async () => {
            console.info("[voice] downloading offline model:", modelUrl);
            setLoadingDetail("Downloading model…");
            const blobUrl = await downloadModelBlobUrl(modelUrl, setLoadingDetail);
            console.info("[voice] model downloaded; unpacking + loading WASM…");
            setLoadingDetail("Unpacking model + starting engine…");
            const { createModel } = await import("vosk-browser");
            const m = await createModel(blobUrl);
            URL.revokeObjectURL(blobUrl);
            console.info("[voice] offline voice engine ready");
            return m;
          })();
        }
        const model = await modelPromiseRef.current;

        // The user may have hit stop() while the model downloaded.
        if (!wantListeningRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        // 3. Audio graph: mic -> worklet -> (silent) destination; the worklet
        // posts PCM chunks back here to feed the recognizer.
        const audioContext = new AudioContext();
        await audioContext.audioWorklet.addModule(WORKLET_URL);
        const recognizer = new model.KaldiRecognizer(audioContext.sampleRate);
        recognizer.setWords(false);
        recognizer.on("result", (msg) => {
          const text = "result" in msg && "text" in msg.result ? msg.result.text : "";
          if (text) {
            setTranscript((prev) => `${prev} ${text}`.slice(-TRANSCRIPT_MAX_CHARS));
          }
        });
        recognizer.on("partialresult", (msg) => {
          const partial = "result" in msg && "partial" in msg.result ? msg.result.partial : "";
          setInterim(partial);
        });

        const source = audioContext.createMediaStreamSource(stream);
        const node = new AudioWorkletNode(audioContext, "vosk-recognizer-processor");
        node.port.onmessage = (e: MessageEvent<Float32Array>) => {
          recognizer.acceptWaveformFloat(e.data, audioContext.sampleRate);
        };
        source.connect(node);
        node.connect(audioContext.destination);

        graphRef.current = { model, recognizer, audioContext, stream, node };
        setLoading(false);
        setLoadingDetail(undefined);
        setListening(true);
      } catch (err: unknown) {
        console.error("[voice] offline engine failed to start:", err);
        // Drop the cached (rejected) model promise so a later retry re-downloads
        // instead of replaying the same failure.
        modelPromiseRef.current = null;
        const name = err instanceof Error ? err.name : "";
        const message = err instanceof Error ? err.message : "";
        setError(
          name === "NotAllowedError"
            ? "Microphone access denied"
            : name === "NotFoundError"
              ? "No microphone found"
              : message.startsWith("Model not found")
                ? message
                : LOAD_FAILED_REASON,
        );
        wantListeningRef.current = false;
        setLoading(false);
        setLoadingDetail(undefined);
        setListening(false);
        teardown();
      }
    })();
  }, [supported, modelUrl, teardown]);

  useEffect(
    () => () => {
      wantListeningRef.current = false;
      teardown();
      void modelPromiseRef.current?.then((m) => m.terminate()).catch(() => undefined);
    },
    [teardown],
  );

  return { supported, listening, transcript, interim, error, loading, loadingDetail, start, stop };
}

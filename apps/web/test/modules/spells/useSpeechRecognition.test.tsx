import { describe, it, expect, afterEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSpeechRecognition } from "../../../src/modules/spells/useSpeechRecognition.js";

// The Vosk engine imports `vosk-browser`, which spins up a Worker + WASM that
// jsdom can't run. Mock it: these tests only exercise engine selection and the
// `supported`/`error` surface, never `start()`.
vi.mock("vosk-browser", () => ({ createModel: vi.fn() }));

/** Minimal SpeechRecognition stand-in so the ctor lookup succeeds. */
class FakeRecognition {
  continuous = false;
  interimResults = false;
  lang = "";
  onresult: unknown = null;
  onend: unknown = null;
  onerror: unknown = null;
  start = vi.fn();
  stop = vi.fn();
}

const w = window as unknown as {
  SpeechRecognition?: unknown;
  webkitSpeechRecognition?: unknown;
  isSecureContext: boolean;
};

function setSecure(secure: boolean) {
  Object.defineProperty(window, "isSecureContext", { value: secure, configurable: true });
}

/** jsdom has no mediaDevices; the Vosk engine needs it present to be usable. */
function stubMediaDevices() {
  Object.defineProperty(navigator, "mediaDevices", { value: {}, configurable: true });
}

afterEach(() => {
  delete w.SpeechRecognition;
  delete w.webkitSpeechRecognition;
  setSecure(true);
  Reflect.deleteProperty(navigator, "mediaDevices");
  vi.unstubAllEnvs();
});

describe("useSpeechRecognition", () => {
  it("falls back to the offline engine's reason when no native API and no model is configured", () => {
    // Firefox without a configured model: native is absent, Vosk has no model.
    setSecure(true);
    delete w.SpeechRecognition;
    const { result } = renderHook(() => useSpeechRecognition());
    expect(result.current.supported).toBe(false);
    expect(result.current.error).toMatch(/model|VITE_VOSK_MODEL_URL/i);
    // No more "try Chrome or Edge" dead-end.
    expect(result.current.error ?? "").not.toMatch(/chrome|edge/i);
  });

  it("uses the offline (Vosk) engine when no native API but a model is configured", () => {
    // Firefox with a model: native absent, Vosk model URL present → supported.
    setSecure(true);
    delete w.SpeechRecognition;
    stubMediaDevices();
    vi.stubEnv("VITE_VOSK_MODEL_URL", "/models/vosk-model-small-en-us-0.15.tar.gz");
    const { result } = renderHook(() => useSpeechRecognition());
    expect(result.current.supported).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("is unsupported with a clear reason in an insecure context", () => {
    w.SpeechRecognition = FakeRecognition;
    setSecure(false);
    const { result } = renderHook(() => useSpeechRecognition());
    expect(result.current.supported).toBe(false);
    expect(result.current.error).toMatch(/HTTPS or localhost/i);
  });

  it("reports the insecure-context reason in Firefox too (no native API)", () => {
    delete w.SpeechRecognition;
    setSecure(false);
    const { result } = renderHook(() => useSpeechRecognition());
    expect(result.current.supported).toBe(false);
    expect(result.current.error).toMatch(/HTTPS or localhost/i);
  });

  it("is supported when the native API exists in a secure context", () => {
    w.SpeechRecognition = FakeRecognition;
    setSecure(true);
    const { result } = renderHook(() => useSpeechRecognition());
    expect(result.current.supported).toBe(true);
    expect(result.current.error).toBeNull();
  });
});

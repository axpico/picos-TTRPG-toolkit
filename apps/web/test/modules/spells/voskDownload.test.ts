import { describe, it, expect, afterEach, vi } from "vitest";
import { downloadModelBlobUrl } from "../../../src/modules/spells/speech/useVoskSpeechRecognition.js";

// jsdom doesn't implement URL.createObjectURL; stub it to a sentinel.
const createObjectURL = vi.fn(() => "blob:mock");

afterEach(() => {
  vi.unstubAllGlobals();
  createObjectURL.mockClear();
});

/** Build a fake streaming Response from chunk byte-lengths. */
function streamResponse(chunkSizes: number[], contentLength: number | null): Response {
  let i = 0;
  return {
    ok: true,
    status: 200,
    headers: { get: (k: string) => (k === "content-length" ? contentLength?.toString() ?? null : null) },
    body: {
      getReader: () => ({
        read: async () =>
          i < chunkSizes.length
            ? { done: false, value: new Uint8Array(chunkSizes[i++]!) }
            : { done: true, value: undefined },
      }),
    },
    blob: async () => new Blob([new Uint8Array(4)]),
  } as unknown as Response;
}

describe("downloadModelBlobUrl", () => {
  it("rejects with a clear, fast error on a 404 (no silent hang)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404 }) as unknown as Response));
    await expect(downloadModelBlobUrl("/models/missing.tar.gz", vi.fn())).rejects.toThrow(
      /Model not found \(HTTP 404\)/,
    );
  });

  it("reports byte progress and reaches 100% when content-length is known", async () => {
    const total = 1_048_576; // 1 MB
    vi.stubGlobal("URL", { createObjectURL });
    vi.stubGlobal("fetch", vi.fn(async () => streamResponse([total / 2, total / 2], total)));

    const progress: string[] = [];
    const url = await downloadModelBlobUrl("/models/m.tar.gz", (d) => progress.push(d));

    expect(url).toBe("blob:mock");
    expect(progress.at(-1)).toMatch(/100%/);
    expect(progress.some((p) => /50%/.test(p))).toBe(true);
  });

  it("falls back to an indeterminate message when no content-length is sent", async () => {
    vi.stubGlobal("URL", { createObjectURL });
    vi.stubGlobal("fetch", vi.fn(async () => streamResponse([10], null)));

    const progress: string[] = [];
    const url = await downloadModelBlobUrl("/models/m.tar.gz", (d) => progress.push(d));

    expect(url).toBe("blob:mock");
    expect(progress).toContain("Downloading model…");
  });

  it("passes an AbortSignal through to fetch", async () => {
    const fetchSpy = vi.fn(async () => streamResponse([4], 4));
    vi.stubGlobal("URL", { createObjectURL });
    vi.stubGlobal("fetch", fetchSpy);

    const controller = new AbortController();
    await downloadModelBlobUrl("/models/m.tar.gz", vi.fn(), controller.signal);

    expect(fetchSpy).toHaveBeenCalledWith("/models/m.tar.gz", { signal: expect.any(AbortSignal) });
  });

  it("rejects with a clear timeout error when a read stalls past the watchdog", async () => {
    vi.useFakeTimers();
    let signalForReader: AbortSignal | undefined;
    // A body whose read never resolves on its own — simulates a hung connection.
    // It rejects only once the stall watchdog aborts the fetch signal.
    const hung = {
      ok: true,
      status: 200,
      headers: { get: (k: string) => (k === "content-length" ? "1048576" : null) },
      body: {
        getReader: () => ({
          read: (): Promise<never> =>
            new Promise((_resolve, reject) => {
              signalForReader?.addEventListener("abort", () => reject(new Error("aborted")), {
                once: true,
              });
            }),
        }),
      },
    } as unknown as Response;
    vi.stubGlobal("URL", { createObjectURL });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        signalForReader = init?.signal ?? undefined;
        return hung;
      }),
    );

    const promise = downloadModelBlobUrl("/models/m.tar.gz", vi.fn());
    const assertion = expect(promise).rejects.toThrow(/timed out/i);
    await vi.advanceTimersByTimeAsync(30_000);
    await assertion;
    vi.useRealTimers();
  });
});

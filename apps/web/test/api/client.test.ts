import { describe, it, expect, afterEach, vi } from "vitest";
import { api, type ApiError } from "../../src/api/client.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(status: number, body?: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: `HTTP ${status}`,
    text: () => Promise.resolve(body === undefined ? "" : JSON.stringify(body)),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("api client", () => {
  it("parses JSON bodies on success", async () => {
    stubFetch(200, { id: "x1" });
    const res = await api.get<{ id: string }>("/api/thing");
    expect(res.id).toBe("x1");
  });

  it("returns undefined for 204 responses", async () => {
    stubFetch(204);
    const res = await api.delete("/api/thing/1");
    expect(res).toBeUndefined();
  });

  it("sends JSON bodies with the right headers", async () => {
    const fetchMock = stubFetch(200, { ok: true });
    await api.post("/api/thing", { name: "N" });
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(init.body).toBe(JSON.stringify({ name: "N" }));
    expect(init.credentials).toBe("include");
  });

  it("shapes server error envelopes into ApiError", async () => {
    stubFetch(400, { error: { code: "VALIDATION", message: "Name required", details: { field: "name" } } });
    try {
      await api.post("/api/thing", {});
      expect.unreachable("should have thrown");
    } catch (e) {
      const err = e as ApiError;
      expect(err.message).toBe("Name required");
      expect(err.status).toBe(400);
      expect(err.code).toBe("VALIDATION");
      expect(err.details).toEqual({ field: "name" });
    }
  });

  it("falls back to statusText when there is no envelope", async () => {
    stubFetch(500);
    await expect(api.get("/api/thing")).rejects.toMatchObject({ message: "HTTP 500", status: 500 });
  });
});

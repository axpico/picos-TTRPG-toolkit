import { test } from "node:test";
import assert from "node:assert/strict";
import { generateShareToken } from "../../src/lib/share-token.js";

test("token is 32 URL-safe base64 characters", () => {
  const token = generateShareToken();
  assert.equal(token.length, 32);
  assert.match(token, /^[A-Za-z0-9_-]+$/);
});

test("token contains no standard-base64 padding or non-url-safe chars", () => {
  for (let i = 0; i < 50; i++) {
    const token = generateShareToken();
    assert.ok(!token.includes("+"));
    assert.ok(!token.includes("/"));
    assert.ok(!token.includes("="));
  }
});

test("tokens are unique across many calls", () => {
  const tokens = new Set<string>();
  for (let i = 0; i < 1000; i++) tokens.add(generateShareToken());
  assert.equal(tokens.size, 1000);
});

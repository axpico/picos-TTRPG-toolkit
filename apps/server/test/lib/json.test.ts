import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { parseJsonField, stringifyJsonField } from "../../src/lib/json.js";

const schema = z.array(z.number());

test("parseJsonField parses valid JSON matching the schema", () => {
  assert.deepEqual(parseJsonField("[1,2,3]", schema, []), [1, 2, 3]);
});

test("parseJsonField returns the fallback on malformed JSON", () => {
  assert.deepEqual(parseJsonField("not json", schema, [42]), [42]);
});

test("parseJsonField returns the fallback on schema mismatch", () => {
  assert.deepEqual(parseJsonField('["a","b"]', schema, []), []);
});

test("parseJsonField returns the fallback for null/undefined/empty", () => {
  assert.deepEqual(parseJsonField(null, schema, [0]), [0]);
  assert.deepEqual(parseJsonField(undefined, schema, [0]), [0]);
  assert.deepEqual(parseJsonField("", schema, [0]), [0]);
});

test("stringifyJsonField validates then serializes", () => {
  assert.equal(stringifyJsonField([1, 2], schema), "[1,2]");
});

test("stringifyJsonField throws when the value does not match the schema", () => {
  // @ts-expect-error intentionally passing an invalid value
  assert.throws(() => stringifyJsonField(["x"], schema));
});

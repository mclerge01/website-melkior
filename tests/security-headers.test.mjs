import assert from "node:assert/strict";
import { test } from "node:test";
import { renderHeadersFile, SECURITY_HEADERS } from "../lib/security-headers.mjs";

test("Worker-managed security headers do not emit HSTS", () => {
  assert.equal(Object.hasOwn(SECURITY_HEADERS, "Strict-Transport-Security"), false);
  assert.doesNotMatch(renderHeadersFile(), /Strict-Transport-Security/i);
});

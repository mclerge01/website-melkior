import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const headers = readFileSync(new URL("../_headers", import.meta.url), "utf8");

function headerBlock(pathPattern) {
  const escaped = pathPattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = headers.match(new RegExp(`^${escaped}\\n([\\s\\S]*?)(?=\\n/|\\z)`, "m"));
  assert.ok(match, `${pathPattern} header block should exist`);
  return match[1];
}

function publicCsp(pathPattern) {
  const block = headerBlock(pathPattern);
  const match = block.match(/^\s+Content-Security-Policy:\s*(.+)$/m);
  assert.ok(match, `${pathPattern} should define a Content-Security-Policy`);
  return match[1];
}

for (const pathPattern of ["/fr/*", "/en/*"]) {
  test(`${pathPattern} CSP allows Cloudflare Web Analytics automatic beacon`, () => {
    const csp = publicCsp(pathPattern);
    assert.match(csp, /script-src[^;]*https:\/\/static\.cloudflareinsights\.com/);
    assert.match(csp, /connect-src[^;]*'self'/);
  });
}

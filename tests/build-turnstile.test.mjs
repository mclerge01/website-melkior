import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

const TEST_SITE_KEY = "1x00000000000000000000AA";

function wranglerSiteKey() {
  const wrangler = readFileSync(new URL("../wrangler.toml", import.meta.url), "utf8");
  const match = wrangler.match(/^\s*TURNSTILE_SITE_KEY\s*=\s*"([^"]+)"/m);
  assert.ok(match, "wrangler.toml should define the public Turnstile site key");
  return match[1];
}

test("production build uses the committed Turnstile site key instead of local dev vars", () => {
  execFileSync("node", ["build.js"], {
    cwd: new URL("..", import.meta.url),
    env: {
      ...process.env,
      TURNSTILE_SITE_KEY: "",
    },
    stdio: "pipe",
  });

  const html = readFileSync(new URL("../dist/fr/index.html", import.meta.url), "utf8");
  assert.match(html, new RegExp(`data-sitekey="${wranglerSiteKey()}"`));
  assert.doesNotMatch(html, new RegExp(`data-sitekey="${TEST_SITE_KEY}"`));
});

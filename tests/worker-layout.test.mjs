import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

test("site Worker owns its route modules under workers/site", async () => {
  const workerIndex = await readFile(join(ROOT, "workers/site/index.js"), "utf8");
  const readme = await readFile(join(ROOT, "README.md"), "utf8");
  const wranglerConfig = await readFile(join(ROOT, "wrangler.toml"), "utf8");

  assert.equal(existsSync(join(ROOT, "functions")), false, "top-level functions/ is reserved for Pages Functions projects");
  assert.match(wranglerConfig, /^main = "workers\/site\/index\.js"$/m);
  assert.doesNotMatch(workerIndex, /\.\.\/\.\.\/functions\//, "Worker entrypoint should import local workers/site modules");
  assert.match(workerIndex, /from "\.\/api\/contact\.js"/);
  assert.match(workerIndex, /from "\.\/middleware\.js"/);
  assert.doesNotMatch(readme, /^functions\//m, "README layout should not advertise a top-level Pages Functions directory");
});

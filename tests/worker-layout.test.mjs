import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

test("Workers live in directories matching their Wrangler names", async () => {
  const readme = await readFile(join(ROOT, "README.md"), "utf8");
  const wranglerConfig = await readFile(join(ROOT, "wrangler.toml"), "utf8");
  const workerName = wranglerConfig.match(/^name = "([^"]+)"$/m)?.[1];
  const mainPath = wranglerConfig.match(/^main = "([^"]+)"$/m)?.[1];

  assert.ok(workerName, "wrangler.toml should declare a Worker name");
  assert.ok(mainPath, "wrangler.toml should declare a Worker entrypoint");

  const expectedMainPath = `workers/${workerName}/index.js`;

  assert.equal(mainPath, expectedMainPath);

  const workerIndex = await readFile(join(ROOT, mainPath), "utf8");

  assert.equal(existsSync(join(ROOT, "functions")), false, "top-level functions/ is reserved for Pages Functions projects");
  assert.doesNotMatch(workerIndex, /\.\.\/\.\.\/functions\//, "Worker entrypoint should import local Worker modules");
  assert.match(workerIndex, /from "\.\/api\/contact\.js"/);
  assert.match(workerIndex, /from "\.\/middleware\.js"/);
  assert.doesNotMatch(readme, /^functions\//m, "README layout should not advertise a top-level Pages Functions directory");
  assert.doesNotMatch(readme, /workers\/site/);
});

test("README Project Layout stays alphabetized", async () => {
  const readme = await readFile(join(ROOT, "README.md"), "utf8");
  const layoutBlock = readme.match(/## Project Layout\s+```text\n(?<layout>[\s\S]*?)\n```/);

  assert.ok(layoutBlock?.groups?.layout, "README should include a Project Layout code block");

  const paths = layoutBlock.groups.layout
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim().split(/\s+/)[0]);
  const sortedPaths = [...paths].sort((left, right) => left.localeCompare(right));

  assert.deepEqual(paths, sortedPaths);
  assert.equal(new Set(paths).size, paths.length, "Project Layout should not list duplicate paths");
});

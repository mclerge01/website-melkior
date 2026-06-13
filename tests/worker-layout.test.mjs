import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { adminPathForState } from "../admin/admin-routing.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

test("README documents current public email and admin routes", async () => {
  const readme = await readFile(join(ROOT, "README.md"), "utf8");
  const settings = JSON.parse(await readFile(join(ROOT, "content/settings.json"), "utf8"));
  const publicEmail = settings.shared.email;
  const adminRoutes = [
    "/admin/",
    adminPathForState({ activeView: "content", activeLocale: "en-CA" }),
    adminPathForState({ activeView: "content", activeLocale: "fr-CA" }),
    adminPathForState({ activeView: "colors" }),
    adminPathForState({ activeView: "images" }),
    adminPathForState({ activeView: "seo", activeSeoLocale: "en-CA" }),
    adminPathForState({ activeView: "seo", activeSeoLocale: "fr-CA" }),
  ];

  assert.match(readme, new RegExp(escapeRegExp(publicEmail)));
  assert.doesNotMatch(readme, /consultation@melkiorclerge\.ca/);
  for (const route of adminRoutes) {
    assert.match(readme, new RegExp(escapeRegExp(route)));
  }
});

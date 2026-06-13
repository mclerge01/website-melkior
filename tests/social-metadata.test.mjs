import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIST_DIR = join(ROOT, "dist");

async function htmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(path);
    return entry.isFile() && entry.name.endsWith(".html") ? [path] : [];
  }));
  return files.flat();
}

function headHtml(html) {
  return html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] || "";
}

function tagContent(head, attribute, value) {
  const pattern = new RegExp(`<meta\\b(?=[^>]*\\b${attribute}=["']${value}["'])(?=[^>]*\\bcontent=["']([^"']+)["'])[^>]*>`, "i");
  return head.match(pattern)?.[1] || "";
}

function linkHref(head, rel) {
  const pattern = new RegExp(`<link\\b(?=[^>]*\\brel=["']${rel}["'])(?=[^>]*\\bhref=["']([^"']+)["'])[^>]*>`, "i");
  return head.match(pattern)?.[1] || "";
}

test("every generated HTML page has complete social preview metadata", async () => {
  const files = (await htmlFiles(DIST_DIR)).sort();
  assert.ok(files.length > 0, "dist should contain generated HTML files");

  for (const file of files) {
    const label = relative(DIST_DIR, file).replace(/\\/g, "/");
    const head = headHtml(await readFile(file, "utf8"));

    assert.match(head, /<title>[^<]+<\/title>/i, `${label}: title is required`);
    assert.ok(tagContent(head, "name", "description"), `${label}: meta description is required`);
    assert.match(linkHref(head, "canonical"), /^https:\/\/melkiorclerge\.ca\//, `${label}: canonical URL must be absolute`);

    for (const property of ["og:title", "og:description", "og:image", "og:image:alt", "og:image:width", "og:image:height", "og:url", "og:type", "og:site_name", "og:locale"]) {
      assert.ok(tagContent(head, "property", property), `${label}: ${property} is required`);
    }

    for (const name of ["twitter:card", "twitter:title", "twitter:description", "twitter:image", "twitter:image:alt"]) {
      assert.ok(tagContent(head, "name", name), `${label}: ${name} is required`);
    }

    assert.match(tagContent(head, "property", "og:image"), /^https:\/\/melkiorclerge\.ca\/assets\/images\//, `${label}: og:image must be absolute`);
    assert.match(tagContent(head, "name", "twitter:image"), /^https:\/\/melkiorclerge\.ca\/assets\/images\//, `${label}: twitter:image must be absolute`);
  }
});

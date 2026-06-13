import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIST_DIR = join(ROOT, "dist");
const ORIGIN = "https://melkiorclerge.ca";

async function htmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(path);
    return entry.isFile() && entry.name.endsWith(".html") ? [path] : [];
  }));
  return files.flat();
}

function pagePath(label) {
  if (label === "index.html") return "/";
  if (label.endsWith("/index.html")) return `/${label.slice(0, -"index.html".length)}`;
  return `/${label}`;
}

function headHtml(html) {
  return html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] || "";
}

function tagContent(head, attribute, value) {
  const pattern = new RegExp(`<meta\\b(?=[^>]*\\b${attribute}=["']${value}["'])(?=[^>]*\\bcontent=["']([^"']+)["'])[^>]*>`, "i");
  return head.match(pattern)?.[1] || "";
}

function titleText(head) {
  return head.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() || "";
}

function linkHref(head, rel) {
  const pattern = new RegExp(`<link\\b(?=[^>]*\\brel=["']${rel}["'])(?=[^>]*\\bhref=["']([^"']+)["'])[^>]*>`, "i");
  return head.match(pattern)?.[1] || "";
}

function alternateLinks(head) {
  const links = new Map();
  for (const match of head.matchAll(/<link\b(?=[^>]*\brel=["']alternate["'])(?=[^>]*\bhreflang=["']([^"']+)["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>/gi)) {
    links.set(match[1], match[2]);
  }
  return links;
}

function jsonLdGraphs(head) {
  return [...head.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => JSON.parse(match[1].trim()))
    .flatMap((value) => Array.isArray(value?.["@graph"]) ? value["@graph"] : [value]);
}

function hasType(node, type) {
  return Array.isArray(node?.["@type"]) ? node["@type"].includes(type) : node?.["@type"] === type;
}

test("generated pages expose complete SEO metadata, not only social preview tags", async () => {
  const files = (await htmlFiles(DIST_DIR)).sort();
  assert.ok(files.length > 0, "dist should contain generated HTML files");

  const indexableTitles = new Map();
  const indexableDescriptions = new Map();

  for (const file of files) {
    const label = relative(DIST_DIR, file).replace(/\\/g, "/");
    const html = await readFile(file, "utf8");
    const head = headHtml(html);
    const robots = tagContent(head, "name", "robots");
    const isIndexable = !/\bnoindex\b/i.test(robots);
    const expectedCanonical = `${ORIGIN}${pagePath(label)}`;

    assert.match(html, /<html\b[^>]*\blang=["'][a-z]{2}(?:-[A-Z]{2})?["']/i, `${label}: html lang is required`);
    assert.ok(titleText(head), `${label}: title is required`);
    assert.ok(tagContent(head, "name", "description"), `${label}: meta description is required`);
    assert.equal(linkHref(head, "canonical"), expectedCanonical, `${label}: canonical should match the generated URL`);
    assert.ok(robots, `${label}: robots meta is required`);

    for (const property of ["og:title", "og:description", "og:image", "og:image:alt", "og:image:width", "og:image:height", "og:url", "og:type", "og:site_name", "og:locale"]) {
      assert.ok(tagContent(head, "property", property), `${label}: ${property} is required`);
    }
    for (const name of ["twitter:card", "twitter:title", "twitter:description", "twitter:image", "twitter:image:alt"]) {
      assert.ok(tagContent(head, "name", name), `${label}: ${name} is required`);
    }
    assert.equal(tagContent(head, "property", "og:url"), expectedCanonical, `${label}: og:url should match canonical`);

    if (!isIndexable || label.startsWith("admin/")) continue;

    const title = titleText(head);
    const description = tagContent(head, "name", "description");
    assert.ok(!indexableTitles.has(title), `${label}: title duplicates ${indexableTitles.get(title)}`);
    assert.ok(!indexableDescriptions.has(description), `${label}: description duplicates ${indexableDescriptions.get(description)}`);
    indexableTitles.set(title, label);
    indexableDescriptions.set(description, label);

    const alternates = alternateLinks(head);
    for (const hreflang of ["fr", "fr-CA", "en", "en-CA", "x-default"]) {
      assert.match(alternates.get(hreflang) || "", /^https:\/\/melkiorclerge\.ca\//, `${label}: ${hreflang} alternate must be absolute`);
    }
    assert.ok([...alternates.values()].includes(expectedCanonical), `${label}: hreflang alternates should include the canonical URL`);

    const graph = jsonLdGraphs(head);
    assert.ok(graph.some((node) => hasType(node, "WebPage") && node.url === expectedCanonical), `${label}: JSON-LD WebPage should describe the canonical page`);
    assert.ok(graph.some((node) => hasType(node, "WebSite") && node.url === `${ORIGIN}/`), `${label}: JSON-LD WebSite is required`);
    assert.ok(graph.some((node) => hasType(node, "FinancialService") || hasType(node, "ProfessionalService")), `${label}: JSON-LD business entity is required`);
  }
});

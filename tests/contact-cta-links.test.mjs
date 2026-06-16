import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIST_DIR = join(ROOT, "dist");

function attributesFromTag(tag) {
  const attributes = {};
  for (const match of tag.matchAll(/\s([a-zA-Z:-]+)=["']([^"']*)["']/g)) {
    attributes[match[1].toLowerCase()] = match[2];
  }
  return attributes;
}

function textFromHtml(html) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function anchors(html) {
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map((match) => ({
    attributes: attributesFromTag(match[1]),
    text: textFromHtml(match[2]),
  }));
}

function assertCalendlyAnchor(anchor, bookingUrl, label) {
  assert.equal(anchor.attributes.href, bookingUrl, `${label}: should open Calendly directly`);
  assert.equal(anchor.attributes.target, "_blank", `${label}: should open in a separate tab`);
  assert.match(anchor.attributes.rel || "", /\bnoopener\b/, `${label}: should protect the new tab`);
}

test("contact CTA links open Calendly in a separate tab", async () => {
  const settings = JSON.parse(await readFile(join(ROOT, "content", "settings.json"), "utf8"));
  const bookingUrl = settings.shared.booking_url;

  for (const [locale, path] of [["fr-CA", "fr/index.html"], ["en-CA", "en/index.html"]]) {
    const copy = settings.locales[locale];
    const html = await readFile(join(DIST_DIR, path), "utf8");
    const pageAnchors = anchors(html);
    const contactLabels = [
      copy.header.cta_text,
      copy.hero.primary_cta,
      copy.services.cta_text,
      copy.calculator.cta_text,
      copy.final_cta.booking_cta,
    ].filter(Boolean);

    for (const label of contactLabels) {
      const matches = pageAnchors.filter((anchor) => anchor.text.includes(label));
      assert.ok(matches.length > 0, `${path}: should render contact CTA "${label}"`);
      for (const anchor of matches) assertCalendlyAnchor(anchor, bookingUrl, `${path}: ${label}`);
    }

    assert.doesNotMatch(html, /href=["'](?:\/(?:fr|en)\/)?#contact["']/, `${path}: contact CTAs should not scroll to the contact section`);
  }

  for (const path of [
    "fr/politique-de-confidentialite/index.html",
    "fr/mentions-legales/index.html",
    "fr/404.html",
    "en/privacy-policy/index.html",
    "en/legal-notice/index.html",
    "en/404.html",
  ]) {
    const html = await readFile(join(DIST_DIR, path), "utf8");
    const navCta = anchors(html).find((anchor) => /\bnav-cta\b/.test(anchor.attributes.class || ""));
    assert.ok(navCta, `${path}: should render a nav contact CTA`);
    assertCalendlyAnchor(navCta, bookingUrl, `${path}: nav contact CTA`);
  }
});

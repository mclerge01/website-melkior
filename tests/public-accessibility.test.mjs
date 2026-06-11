import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const publicTemplates = ["template.html", "template-legal.html"];

for (const templateName of publicTemplates) {
  test(`${templateName} site logo accessible name includes its visible text`, () => {
    const source = readFileSync(new URL(`../${templateName}`, import.meta.url), "utf8");
    const match = source.match(/<a\s+class="site-logo"[^>]*>/);

    assert.ok(match, `${templateName} should render a public site logo link`);
    assert.doesNotMatch(
      match[0],
      /\saria-label=/,
      `${templateName} should let the visible logo text provide the accessible name`,
    );
  });
}

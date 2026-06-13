import assert from "node:assert/strict";
import test from "node:test";

import { groupImageGalleryItems } from "../admin/image-gallery.js";

test("collapses responsive image variants into one source set item", () => {
  const images = [
    {
      name: "melkior-clerge-hero-480w.webp",
      path: "assets/images/melkior-clerge-hero-480w.webp",
      sha: "sha-480",
      size: 12,
    },
    {
      name: "melkior-clerge-hero-1920w.webp",
      path: "assets/images/melkior-clerge-hero-1920w.webp",
      sha: "sha-1920",
      size: 48,
    },
    {
      name: "melkior-clerge-hero-960w.webp",
      path: "assets/images/melkior-clerge-hero-960w.webp",
      sha: "sha-960",
      size: 24,
    },
    {
      name: "multi-prets-logo-dark-fr.svg",
      path: "assets/images/multi-prets-logo-dark-fr.svg",
      sha: "sha-svg",
      size: 8,
    },
  ];

  const grouped = groupImageGalleryItems(images);

  assert.equal(grouped.length, 2);
  assert.equal(grouped[0].displayName, "melkior-clerge-hero");
  assert.equal(grouped[0].name, "melkior-clerge-hero-1920w.webp");
  assert.equal(grouped[0].path, "assets/images/melkior-clerge-hero-1920w.webp");
  assert.equal(grouped[0].variantCount, 3);
  assert.deepEqual(grouped[0].variantWidths, [480, 960, 1920]);
  assert.deepEqual(grouped[0].variants.map((variant) => variant.name), [
    "melkior-clerge-hero-480w.webp",
    "melkior-clerge-hero-960w.webp",
    "melkior-clerge-hero-1920w.webp",
  ]);

  assert.equal(grouped[1].displayName, "multi-prets-logo-dark-fr.svg");
  assert.equal(grouped[1].variantCount, 1);
  assert.deepEqual(grouped[1].variants.map((variant) => variant.name), ["multi-prets-logo-dark-fr.svg"]);
});

const RESPONSIVE_VARIANT_PATTERN = /^(.*\/)?(.+)-(\d+)w\.webp$/i;

function responsiveVariantInfo(image) {
  const path = String(image?.path || image?.name || "");
  const match = path.match(RESPONSIVE_VARIANT_PATTERN);
  if (!match) return null;
  const width = Number.parseInt(match[3], 10);
  if (!Number.isFinite(width) || width <= 0) return null;
  return {
    key: `${match[1] || ""}${match[2]}`,
    displayName: match[2],
    width,
  };
}

function byVariantWidthThenName(a, b) {
  return (a.variantWidth || 0) - (b.variantWidth || 0) || String(a.name || "").localeCompare(String(b.name || ""));
}

function sourceSetItem(group) {
  const variants = [...group.variants].sort(byVariantWidthThenName);
  const representative = variants[variants.length - 1];
  return {
    ...representative,
    displayName: group.displayName,
    sourceSetKey: group.key,
    variantCount: variants.length,
    variantWidths: variants.map((variant) => variant.variantWidth),
    variants,
  };
}

function singleImageItem(image) {
  return {
    ...image,
    displayName: image.name,
    variantCount: 1,
    variants: [image],
  };
}

export function groupImageGalleryItems(images) {
  const items = [];
  const sourceSets = new Map();

  for (const image of images) {
    const info = responsiveVariantInfo(image);
    if (!info) {
      items.push({ type: "single", image });
      continue;
    }

    let group = sourceSets.get(info.key);
    if (!group) {
      group = { type: "sourceSet", key: info.key, displayName: info.displayName, variants: [] };
      sourceSets.set(info.key, group);
      items.push(group);
    }
    group.variants.push({ ...image, variantWidth: info.width });
  }

  return items.map((item) => (item.type === "sourceSet" ? sourceSetItem(item) : singleImageItem(item.image)));
}

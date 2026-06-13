import assert from "node:assert/strict";
import { access, readdir, readFile } from "node:fs/promises";
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

function jpegDimensions(buffer) {
  let offset = 2;
  while (offset < buffer.length) {
    while (buffer[offset] === 0xff) offset += 1;
    const marker = buffer[offset];
    offset += 1;
    if (marker === 0xd9 || marker === 0xda) break;

    const length = buffer.readUInt16BE(offset);
    if (marker >= 0xc0 && marker <= 0xc3) {
      return {
        width: buffer.readUInt16BE(offset + 5),
        height: buffer.readUInt16BE(offset + 3),
        type: "image/jpeg",
      };
    }
    offset += length;
  }
  throw new Error("JPEG dimensions not found");
}

function imageInfo(buffer) {
  const isPng = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (isPng) {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
      type: "image/png",
      size: buffer.length,
    };
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    return { ...jpegDimensions(buffer), size: buffer.length };
  }

  throw new Error("Unsupported social preview image format");
}

function robotsAllowsUserAgent(robots, userAgent) {
  const groups = robots.split(/\r?\n\s*\r?\n/);
  return groups.some((group) => {
    const lines = group.split(/\r?\n/).map((line) => line.trim());
    const agents = lines
      .filter((line) => /^User-agent:/i.test(line))
      .map((line) => line.slice(line.indexOf(":") + 1).trim().toLowerCase());
    if (!agents.includes(userAgent.toLowerCase())) return false;

    return lines.some((line) => /^Allow:\s*\/\s*$/i.test(line))
      && !lines.some((line) => /^Disallow:\s*\/\s*$/i.test(line));
  });
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

    for (const property of ["og:title", "og:description", "og:image", "og:image:secure_url", "og:image:type", "og:image:alt", "og:image:width", "og:image:height", "og:url", "og:type", "og:site_name", "og:locale"]) {
      assert.ok(tagContent(head, "property", property), `${label}: ${property} is required`);
    }

    for (const name of ["twitter:card", "twitter:title", "twitter:description", "twitter:image", "twitter:image:alt"]) {
      assert.ok(tagContent(head, "name", name), `${label}: ${name} is required`);
    }

    const ogImage = tagContent(head, "property", "og:image");
    const twitterImage = tagContent(head, "name", "twitter:image");
    assert.match(ogImage, /^https:\/\/melkiorclerge\.ca\/assets\/images\//, `${label}: og:image must be absolute`);
    assert.match(twitterImage, /^https:\/\/melkiorclerge\.ca\/assets\/images\//, `${label}: twitter:image must be absolute`);
    assert.match(ogImage, /\.(?:jpe?g|png)$/i, `${label}: og:image should use JPG or PNG for social crawler compatibility`);
    assert.match(twitterImage, /\.(?:jpe?g|png)$/i, `${label}: twitter:image should use JPG or PNG for social crawler compatibility`);
    assert.equal(tagContent(head, "property", "og:image:secure_url"), ogImage, `${label}: og:image:secure_url should match og:image`);
    assert.equal(twitterImage, ogImage, `${label}: twitter:image should match og:image`);

    const imagePath = join(DIST_DIR, new URL(ogImage, ORIGIN).pathname.slice(1));
    await access(imagePath);
    const image = imageInfo(await readFile(imagePath));
    assert.equal(tagContent(head, "property", "og:image:type"), image.type, `${label}: og:image:type should match the image file`);
    assert.equal(Number(tagContent(head, "property", "og:image:width")), image.width, `${label}: og:image:width should match the image file`);
    assert.equal(Number(tagContent(head, "property", "og:image:height")), image.height, `${label}: og:image:height should match the image file`);
    assert.ok(image.size <= 1_000_000, `${label}: social preview image should stay under 1 MB`);
  }
});

test("robots.txt allows social preview crawlers to fetch cards", async () => {
  const robots = await readFile(join(DIST_DIR, "robots.txt"), "utf8");

  for (const userAgent of [
    "facebookexternalhit",
    "Facebot",
    "FacebookBot",
    "Twitterbot",
    "LinkedInBot",
    "Slackbot-LinkExpanding",
    "Slack-ImgProxy",
    "Discordbot",
    "TelegramBot",
    "WhatsApp",
    "Pinterestbot",
    "SkypeUriPreview",
    "Applebot",
    "MobileSMS",
  ]) {
    assert.ok(robotsAllowsUserAgent(robots, userAgent), `${userAgent} should be allowed for social previews`);
  }
});

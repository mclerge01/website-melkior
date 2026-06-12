import { execFileSync } from "child_process";
import CleanCSS from "clean-css";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "fs";
import { dirname, join, relative } from "path";
import { minify as minifyJs } from "terser";
import { fileURLToPath } from "url";
import {
  LOCALES,
  canonicalUrl,
  pagePath,
} from "./lib/i18n.mjs";
import { prepareLocaleData } from "./lib/page-data.mjs";
import { processMarkdown, render } from "./lib/render.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(ROOT, "dist");
const read = (path) => readFileSync(join(ROOT, path), "utf-8");
const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";
const IS_DEV_BUILD = process.argv.includes("--dev");

function loadLocalEnv() {
  const envPath = join(ROOT, ".dev.vars");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (/^[A-Z_][A-Z0-9_]*$/.test(key) && process.env[key] === undefined) process.env[key] = value;
  }
}

function readWranglerVar(name) {
  if (!existsSync(join(ROOT, "wrangler.toml"))) return "";
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = read("wrangler.toml").match(new RegExp(`^\\s*${escaped}\\s*=\\s*"([^"]+)"`, "m"));
  return match?.[1] || "";
}

function turnstileSiteKey() {
  if (IS_DEV_BUILD) return process.env.TURNSTILE_SITE_KEY || TURNSTILE_TEST_SITE_KEY;
  return readWranglerVar("TURNSTILE_SITE_KEY") || process.env.TURNSTILE_SITE_KEY || TURNSTILE_TEST_SITE_KEY;
}

function write(path, content) {
  const abs = join(OUT_DIR, path);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content, "utf-8");
  console.log("Generated:", path);
}

function copyStatic(path) {
  const source = join(ROOT, path);
  if (!existsSync(source)) return;
  const destination = join(OUT_DIR, path);
  mkdirSync(dirname(destination), { recursive: true });
  cpSync(source, destination, { recursive: true });
  console.log("Copied:", path);
}

async function minifyCode(code, loader, filePath) {
  if (loader === "css") {
    const result = new CleanCSS({ level: 2 }).minify(code);
    if (result.errors.length) {
      const rel = relative(ROOT, filePath).replace(/\\/g, "/");
      throw new Error(`Unable to minify CSS in ${rel}: ${result.errors.join("; ")}`);
    }
    return result.styles;
  }
  const result = await minifyJs(code, {
    compress: true,
    ecma: 2020,
    format: { comments: false },
    mangle: true,
  });
  if (result.error) {
    const rel = relative(ROOT, filePath).replace(/\\/g, "/");
    throw new Error(`Unable to minify JS in ${rel}: ${result.error.message}`);
  }
  return result.code || "";
}

async function minifyAsset(path, loader) {
  const abs = join(OUT_DIR, path);
  if (!existsSync(abs)) return;
  const source = readFileSync(abs, "utf-8");
  const minified = await minifyCode(source, loader, abs);
  writeFileSync(abs, minified, "utf-8");
  console.log(`Minified: ${path} (${source.length} -> ${minified.length} bytes)`);
}

async function minifyStaticAssets() {
  for (const filePath of distFilesWithExtension(OUT_DIR, ".css")) {
    await minifyAsset(relative(OUT_DIR, filePath).replace(/\\/g, "/"), "css");
  }
  for (const filePath of distFilesWithExtension(OUT_DIR, ".js")) {
    await minifyAsset(relative(OUT_DIR, filePath).replace(/\\/g, "/"), "js");
  }
}

async function minifyInlineBlock(code, loader, filePath) {
  try {
    return (await minifyCode(code, loader, filePath)).trim();
  } catch (error) {
    const rel = relative(ROOT, filePath).replace(/\\/g, "/");
    throw new Error(`Unable to minify inline ${loader} in ${rel}: ${error.message}`);
  }
}

function isJavaScriptScriptTag(attributes) {
  if (/\bsrc\s*=/i.test(attributes)) return false;
  const typeMatch = attributes.match(/\btype\s*=\s*["']?([^"'\s>]+)/i);
  if (!typeMatch) return true;
  return [
    "application/ecmascript",
    "application/javascript",
    "module",
    "text/ecmascript",
    "text/javascript",
  ].includes(typeMatch[1].toLowerCase());
}

function distFilesWithExtension(dir, extension) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    const stats = statSync(abs);
    if (stats.isDirectory()) files.push(...distFilesWithExtension(abs, extension));
    else if (entry.endsWith(extension)) files.push(abs);
  }
  return files;
}

async function minifyHtmlInlineAssets() {
  for (const filePath of distFilesWithExtension(OUT_DIR, ".html")) {
    const source = readFileSync(filePath, "utf-8");
    let changed = false;
    const styleBlocks = [];
    let html = source.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (match, attributes, css) => {
      if (!css.trim()) return match;
      changed = true;
      const marker = `__MELKIOR_MINIFIED_STYLE_${styleBlocks.length}__`;
      styleBlocks.push({ marker, attributes, css });
      return marker;
    });
    for (const block of styleBlocks) {
      html = html.replace(block.marker, `<style${block.attributes}>${await minifyInlineBlock(block.css, "css", filePath)}</style>`);
    }

    const scriptBlocks = [];
    html = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (match, attributes, js) => {
      if (!js.trim() || !isJavaScriptScriptTag(attributes)) return match;
      changed = true;
      const marker = `__MELKIOR_MINIFIED_SCRIPT_${scriptBlocks.length}__`;
      scriptBlocks.push({ marker, attributes, js });
      return marker;
    });
    for (const block of scriptBlocks) {
      html = html.replace(block.marker, `<script${block.attributes}>${await minifyInlineBlock(block.js, "js", filePath)}</script>`);
    }

    if (changed) {
      writeFileSync(filePath, html, "utf-8");
      console.log("Minified inline assets:", relative(OUT_DIR, filePath).replace(/\\/g, "/"));
    }
  }
}

function gitOutput(args) {
  try {
    return execFileSync("git", args, {
      cwd: ROOT,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function pageDate(sourcePaths) {
  const relatedFiles = Array.isArray(sourcePaths) ? sourcePaths : [sourcePaths];
  const dirty = gitOutput(["status", "--porcelain", "--", ...relatedFiles]);
  if (dirty) return new Date();

  const isoDate = gitOutput(["log", "-1", "--format=%cI", "--", ...relatedFiles]);
  const date = isoDate ? new Date(isoDate) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function formatPageUpdated(locale, fallback, sourcePaths) {
  const match = fallback.match(/^([^:]+)(\s*:\s*)/);
  const prefix = match ? match[1].trim() : locale.startsWith("en") ? "Last updated" : "Dernière mise à jour";
  const separator = locale.startsWith("fr") ? " : " : ": ";
  const formattedDate = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(pageDate(sourcePaths));

  return `${prefix}${separator}${formattedDate}`;
}

function legalPageData(settings, locale, page, homeData) {
  const pageContent = page === "privacy" ? homeData.privacy_page : homeData.legal_page;

  return {
    ...prepareLocaleData(settings, locale, page),
    page_robots: "index, follow",
    page_main_class: "legal-page",
    page_content_class: "legal-content",
    page_body_class: "rich-text",
    page_eyebrow: homeData.header.site_name,
    page_title: pageContent.title,
    page_updated: formatPageUpdated(locale, pageContent.updated, ["content/settings.json", "template-legal.html"]),
    page_body: pageContent.body,
  };
}

function notFoundPageData(settings, locale, path = pagePath(locale, "not_found")) {
  const homeData = prepareLocaleData(settings, locale, "not_found");
  const current = LOCALES[locale];
  const copy = locale.startsWith("en")
    ? {
        summary: "Page not found",
        body: "The page you requested is no longer available or the address may contain a typo.",
        primary: "Back to home",
      }
    : {
        summary: "Page introuvable",
        body: "La page demandée n'est plus disponible ou l'adresse contient peut-être une erreur.",
        primary: "Retour à l'accueil",
      };

  return {
    ...homeData,
    page_path: path,
    canonical_url: canonicalUrl(settings.site.domain, path),
    alternate_fr: canonicalUrl(settings.site.domain, pagePath("fr-CA", "not_found")),
    alternate_en: canonicalUrl(settings.site.domain, pagePath("en-CA", "not_found")),
    page_robots: "noindex, follow",
    page_main_class: "not-found-page",
    page_content_class: "not-found-content",
    page_body_class: "not-found-body",
    page_title: "404",
    page_summary: copy.summary,
    page_body: copy.body,
    page_actions: [
      { label: copy.primary, href: current.homePath, class: "btn-primary" },
    ],
  };
}

function generateSitemap(settings) {
  const today = new Date().toISOString().split("T")[0];
  const urls = [
    "/fr/",
    "/en/",
    "/fr/politique-de-confidentialite/",
    "/en/privacy-policy/",
    "/fr/mentions-legales/",
    "/en/legal-notice/",
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((url) => `  <url><loc>${canonicalUrl(settings.site.domain, url)}</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>${url === "/fr/" || url === "/en/" ? "1.0" : "0.5"}</priority></url>`)
    .join("\n")}\n</urlset>\n`;
}

function themeHex(theme, key, fallbackKey = "") {
  const value = theme?.[key];
  if (typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)) return value;
  const fallback = theme?.[fallbackKey];
  return typeof fallback === "string" && /^#[0-9a-fA-F]{6}$/.test(fallback) ? fallback : "";
}

function generateFavicon(theme) {
  const primary = themeHex(theme, "primary", "brand_blue");
  const brandBlue = themeHex(theme, "brand_blue", "primary");
  const secondaryBright = themeHex(theme, "secondary_bright", "secondary");
  const white = themeHex(theme, "white", "bg");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="logo-mark-gradient" x1="12" y1="8" x2="52" y2="56" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${primary}"/>
      <stop offset="0.54" stop-color="${brandBlue}"/>
      <stop offset="1" stop-color="${secondaryBright}"/>
    </linearGradient>
  </defs>
  <rect x="1" y="1" width="62" height="62" rx="13" fill="url(#logo-mark-gradient)" stroke="${white}" stroke-opacity="0.26" stroke-width="2"/>
  <text x="32" y="33" text-anchor="middle" dominant-baseline="middle" fill="${white}" font-family="Inter, Arial, sans-serif" font-size="26" font-weight="800" letter-spacing="0">MC</text>
</svg>
`;
}

if (IS_DEV_BUILD) loadLocalEnv();

rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

if (!existsSync(join(ROOT, "content", "settings.json"))) {
  console.error("Error: content/settings.json not found.");
  process.exit(1);
}
if (!existsSync(join(ROOT, "template.html"))) {
  console.error("Error: template.html not found.");
  process.exit(1);
}

const settings = processMarkdown(JSON.parse(read("content/settings.json")));
const template = read("template.html");
const legalTemplate = read("template-legal.html");

for (const path of ["styles.css", "script.js", "_headers", "assets", "admin"]) {
  copyStatic(path);
}
write("favicon.svg", generateFavicon(settings.theme));
await minifyStaticAssets();
write("admin/preview-template.txt", template);

for (const locale of settings.site.locales) {
  const homeData = prepareLocaleData(settings, locale, "home", { turnstileSiteKey: turnstileSiteKey() });
  write(`${LOCALES[locale].slug}/index.html`, render(template, homeData));

  const privacyPath = `${LOCALES[locale].privacyPath.slice(1)}index.html`;
  write(privacyPath, render(legalTemplate, legalPageData(settings, locale, "privacy", homeData)));

  const legalPath = `${LOCALES[locale].legalPath.slice(1)}index.html`;
  write(legalPath, render(legalTemplate, legalPageData(settings, locale, "legal", homeData)));

  write(`${LOCALES[locale].slug}/404.html`, render(legalTemplate, notFoundPageData(settings, locale)));
}

write("404.html", render(legalTemplate, notFoundPageData(settings, "fr-CA", "/404.html")));

write("index.html", `<!DOCTYPE html>
<html lang="fr-CA">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Melkior Clergé</title>
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${settings.site.domain}/">
  <link rel="alternate" hreflang="fr" href="${settings.site.domain}/fr/">
  <link rel="alternate" hreflang="fr-CA" href="${settings.site.domain}/fr/">
  <link rel="alternate" hreflang="en" href="${settings.site.domain}/en/">
  <link rel="alternate" hreflang="en-CA" href="${settings.site.domain}/en/">
  <link rel="alternate" hreflang="x-default" href="${settings.site.domain}/">
  <link rel="icon" href="/favicon.svg">
  <link rel="stylesheet" href="/styles.css">
  <script>
    (function () {
      var locale = navigator.languages && navigator.languages.length ? navigator.languages[0] : navigator.language || "";
      var target = /^en(\\b|-)/i.test(locale) ? "/en/" : "/fr/";
      window.location.replace(target);
    })();
  </script>
</head>
<body class="language-fallback">
  <main class="container section text-center">
    <p class="eyebrow">Melkior Clergé</p>
    <h1 class="text-4xl font-bold mb-4">Choisissez votre langue</h1>
    <p class="text-light mb-8">Choose your language</p>
    <div class="flex justify-center gap-4 flex-wrap">
      <a class="btn btn-primary" href="/fr/">Français</a>
      <a class="btn btn-outline" href="/en/">English</a>
    </div>
  </main>
</body>
</html>
`);
write("sitemap.xml", generateSitemap(settings));
write("robots.txt", `# Search and indexing crawlers are welcome.
User-agent: OAI-SearchBot
Allow: /

User-agent: Googlebot
Allow: /

User-agent: bingbot
Allow: /

User-agent: Applebot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Claude-SearchBot
Allow: /

# AI training crawlers are not permitted.
User-agent: GPTBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: Google-CloudVertexBot
Disallow: /

User-agent: Applebot-Extended
Disallow: /

User-agent: Bytespider
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: Amazonbot
Disallow: /

User-agent: meta-externalagent
Disallow: /

User-agent: FacebookBot
Disallow: /

User-agent: *
Content-Signal: search=yes,ai-train=no
Allow: /
Disallow: /admin/

Sitemap: ${settings.site.domain}/sitemap.xml
`);
await minifyHtmlInlineAssets();
console.log("Build complete.");

import { execFileSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  LOCALES,
  alternateLocale,
  canonicalUrl,
  equivalentPath,
  pagePath,
} from "./lib/i18n.mjs";
import { processMarkdown, render } from "./lib/render.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
const read = (path) => readFileSync(join(ROOT, path), "utf-8");

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

function write(path, content) {
  const abs = join(ROOT, path);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content, "utf-8");
  console.log("Generated:", path);
}

function themeStyle(theme) {
  return Object.entries(theme || {})
    .map(([key, value]) => `      --color-${key.replace(/_/g, "-")}: ${value};`)
    .join(" ");
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

function pageDate(generatedPath) {
  const relatedFiles = ["content/settings.json", "template-legal.html", generatedPath];
  const dirty = gitOutput(["status", "--porcelain", "--", ...relatedFiles]);
  if (dirty) return new Date();

  const isoDate = gitOutput(["log", "-1", "--format=%cI", "--", generatedPath]);
  const date = isoDate ? new Date(isoDate) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function formatPageUpdated(locale, fallback, generatedPath) {
  const match = fallback.match(/^([^:]+)(\s*:\s*)/);
  const prefix = match ? match[1].trim() : locale.startsWith("en") ? "Last updated" : "Dernière mise à jour";
  const separator = locale.startsWith("fr") ? " : " : ": ";
  const formattedDate = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(pageDate(generatedPath));

  return `${prefix}${separator}${formattedDate}`;
}

function prepareLocaleData(settings, locale, page = "home") {
  const current = LOCALES[locale];
  const otherLocale = alternateLocale(locale);
  const other = LOCALES[otherLocale];
  const localized = settings.locales[locale];
  const path = pagePath(locale, page);
  const altPath = equivalentPath(path, otherLocale);
  const domain = settings.site.domain;

  return {
    ...localized,
    site: settings.site,
    shared: settings.shared,
    theme: settings.theme,
    theme_style: themeStyle(settings.theme),
    turnstile_sitekey: process.env.TURNSTILE_SITE_KEY || "1x00000000000000000000AA",
    locale,
    locale_slug: current.slug,
    html_lang: current.htmlLang,
    page_path: path,
    canonical_url: canonicalUrl(domain, path),
    alternate_fr: canonicalUrl(domain, pagePath("fr-CA", page)),
    alternate_en: canonicalUrl(domain, pagePath("en-CA", page)),
    x_default: canonicalUrl(domain, "/"),
    language_switch: {
      href: altPath,
      label: current.switchLabel,
      code: other.slug.toUpperCase(),
      locale: otherLocale,
    },
    privacy_path: current.privacyPath,
    legal_path: current.legalPath,
    admin_path: "/admin/",
    nav_about_href: `${current.homePath}#about`,
    nav_services_href: `${current.homePath}#services`,
    nav_guide_href: `${current.homePath}#guide`,
    nav_calculator_href: `${current.homePath}#calculator`,
    nav_testimonials_href: `${current.homePath}#testimonials`,
    nav_media_href: `${current.homePath}#media`,
    nav_contact_href: `${current.homePath}#contact`,
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

loadLocalEnv();

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

for (const locale of settings.site.locales) {
  const homeData = prepareLocaleData(settings, locale, "home");
  write(`${LOCALES[locale].slug}/index.html`, render(template, homeData));

  const privacyPath = `${LOCALES[locale].privacyPath.slice(1)}index.html`;
  const privacyData = {
    ...prepareLocaleData(settings, locale, "privacy"),
    page_title: homeData.privacy_page.title,
    page_updated: formatPageUpdated(locale, homeData.privacy_page.updated, privacyPath),
    page_body: homeData.privacy_page.body,
  };
  write(privacyPath, render(legalTemplate, privacyData));

  const legalPath = `${LOCALES[locale].legalPath.slice(1)}index.html`;
  const legalData = {
    ...prepareLocaleData(settings, locale, "legal"),
    page_title: homeData.legal_page.title,
    page_updated: formatPageUpdated(locale, homeData.legal_page.updated, legalPath),
    page_body: homeData.legal_page.body,
  };
  write(legalPath, render(legalTemplate, legalData));
}

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
write("robots.txt", `User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: ${settings.site.domain}/sitemap.xml\n`);
console.log("Build complete.");

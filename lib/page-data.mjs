import {
  DEFAULT_LOCALE,
  LOCALES,
  alternateLocale,
  canonicalUrl,
  equivalentPath,
  normalizeLocale,
  pagePath,
} from "./i18n.mjs";
import { normalizeInstagramEmbed, trustedHtml } from "./render.mjs";

const RESPONSIVE_IMAGE_WIDTHS = Object.freeze([480, 960, 1440, 1920, 2560, 3840]);
const RESPONSIVE_BACKGROUND_WIDTHS = Object.freeze([960, 1440, 1920, 2560, 3840]);
const SOCIAL_IMAGE_WIDTH = "1200";
const SOCIAL_IMAGE_HEIGHT = "630";
const THEME_COLOR_KEYS = Object.freeze([
  "primary",
  "primary_dark",
  "secondary",
  "secondary_light",
  "secondary_bright",
  "accent",
  "accent_dark",
  "brand_blue",
  "brand_teal",
  "section_green",
  "error",
  "text",
  "text_light",
  "bg",
  "bg_light",
  "border",
  "white",
]);

function hexToRgb(value) {
  const match = String(value || "").trim().match(/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/);
  if (!match) return "";
  const hex = match[1].length <= 4
    ? match[1].slice(0, 3).split("").map((char) => `${char}${char}`).join("")
    : match[1].slice(0, 6);
  const number = Number.parseInt(hex, 16);
  return `${(number >> 16) & 255}, ${(number >> 8) & 255}, ${number & 255}`;
}

function themeStyle(theme) {
  return THEME_COLOR_KEYS
    .filter((key) => typeof theme?.[key] === "string" && hexToRgb(theme[key]))
    .flatMap((key) => {
      const value = theme[key];
      const name = key.replace(/_/g, "-");
      return [
        `      --color-${name}: ${value};`,
        `      --color-${name}-rgb: ${hexToRgb(value)};`,
      ];
    })
    .join("\n");
}

function responsiveVariantParts(src, allowedWidths = RESPONSIVE_IMAGE_WIDTHS) {
  const path = String(src || "").trim().split(/[?#]/)[0];
  if (!path.startsWith("/assets/images/")) return null;
  const match = path.match(/^(.*)-(\d+)w\.webp$/i);
  if (!match) return null;
  const maxWidth = Number.parseInt(match[2], 10);
  if (!Number.isFinite(maxWidth) || maxWidth <= 0) return null;
  const widths = allowedWidths.filter((width) => width <= maxWidth);
  if (!widths.includes(maxWidth)) widths.push(maxWidth);
  return { prefix: match[1], widths: [...new Set(widths)].sort((a, b) => a - b) };
}

function responsiveImageSet(src, sizes, allowedWidths = RESPONSIVE_IMAGE_WIDTHS) {
  const parts = responsiveVariantParts(src, allowedWidths);
  if (!parts) return { srcset: "", sizes: "" };
  const srcset = parts.widths.map((width) => `${parts.prefix}-${width}w.webp ${width}w`).join(", ");
  return { srcset, sizes };
}

function absoluteImageUrl(domain, src) {
  const value = String(src || "").trim();
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return `${domain}${value}`;
  return value;
}

function socialImageType(src) {
  const path = String(src || "").trim().split(/[?#]/)[0].toLowerCase();
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  return "";
}

function openGraphLocale(htmlLang) {
  return String(htmlLang || "").replace("-", "_");
}

function uniqueValues(values) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function parseOfficeAddress(address) {
  const [streetAddress = "", addressLocality = "", addressRegion = "", postalCode = ""] = String(address || "")
    .split(",")
    .map((part) => part.trim());

  return {
    "@type": "PostalAddress",
    streetAddress,
    addressLocality,
    addressRegion,
    postalCode,
    addressCountry: "CA",
  };
}

function structuredDataJson(data) {
  const origin = String(data.site?.domain || "").replace(/\/+$/, "");
  const businessId = `${origin}/#melkior-clerge`;
  const websiteId = `${origin}/#website`;
  const pageId = `${data.canonical_url}#webpage`;
  const imageId = `${data.seo?.og_image}#primaryimage`;
  const sameAs = uniqueValues([
    data.shared?.profile_url,
    data.shared?.social?.facebook,
    data.shared?.social?.instagram,
    data.shared?.social?.linkedin,
    data.shared?.social?.tiktok,
  ]).filter((url) => /^https?:\/\//i.test(url));

  const graph = [
    {
      "@type": "WebSite",
      "@id": websiteId,
      url: `${origin}/`,
      name: data.seo?.site_name,
      inLanguage: ["fr-CA", "en-CA"],
      publisher: { "@id": businessId },
    },
    {
      "@type": "ImageObject",
      "@id": imageId,
      url: data.seo?.og_image,
      width: Number(data.seo?.og_image_width) || undefined,
      height: Number(data.seo?.og_image_height) || undefined,
      caption: data.seo?.og_image_alt,
    },
    {
      "@type": ["FinancialService", "ProfessionalService"],
      "@id": businessId,
      name: data.header?.site_name,
      description: data.seo?.description,
      url: `${origin}/${data.locale_slug || ""}${data.locale_slug ? "/" : ""}`,
      image: { "@id": imageId },
      telephone: data.shared?.phone,
      email: data.shared?.email,
      address: parseOfficeAddress(data.shared?.office_address),
      areaServed: data.shared?.regions,
      sameAs,
    },
    {
      "@type": "WebPage",
      "@id": pageId,
      url: data.canonical_url,
      name: data.seo?.title,
      description: data.seo?.description,
      inLanguage: data.html_lang,
      isPartOf: { "@id": websiteId },
      about: { "@id": businessId },
      primaryImageOfPage: { "@id": imageId },
    },
  ];

  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }, null, 2)
    .replace(/</g, "\\u003c");
}

export function withStructuredData(data) {
  const json = structuredDataJson(data);
  return {
    ...data,
    structured_data_json: json,
    structured_data: trustedHtml(json),
  };
}

function withResponsiveImages(images) {
  const heroBackground = responsiveImageSet(images.hero_background, "100vw", RESPONSIVE_BACKGROUND_WIDTHS);
  const hero = responsiveImageSet(images.hero, "(min-width: 1024px) 31rem, 65vw");
  const portrait = responsiveImageSet(images.portrait, "(min-width: 1024px) 40vw, 100vw");

  return {
    ...images,
    hero_background_srcset: heroBackground.srcset || "",
    hero_background_sizes: heroBackground.sizes || "",
    hero_srcset: hero.srcset || "",
    hero_sizes: hero.sizes || "",
    portrait_srcset: portrait.srcset || "",
    portrait_sizes: portrait.sizes || "",
  };
}

function fallbackNavItems(nav) {
  return [
    { href: "#services", label: nav?.services },
    { href: "#guide", label: nav?.guide },
    { href: "#about", label: nav?.about },
    { href: "#testimonials", label: nav?.testimonials },
    { href: "#media", label: nav?.media },
    { href: "#calculator", label: nav?.calculator },
  ].filter((item) => item.label);
}

function normalizeNavHref(href, homePath) {
  const value = String(href || "").trim();
  if (!value) return homePath;
  if (value.startsWith("#")) return `${homePath}${value}`;
  return value;
}

function normalizeNav(nav, homePath) {
  const configuredItems = Array.isArray(nav?.items) && nav.items.length ? nav.items : fallbackNavItems(nav);
  const items = configuredItems
    .map((item) => ({
      ...item,
      href: normalizeNavHref(item.href, homePath),
      label: String(item.label || "").trim(),
    }))
    .filter((item) => item.label);
  const calculatorItem = items.find((item) => /#calculator$/.test(item.href));

  return {
    ...nav,
    items,
    calculator_label: calculatorItem?.label || nav?.calculator || "Calculator",
  };
}

function avatarLabelFromName(name) {
  const words = String(name || "").match(/[\p{L}\p{N}]+/gu) || [];
  if (words.length >= 2) return [words[0], words[1]].map((word) => Array.from(word)[0]).join("").toLocaleUpperCase();
  if (words.length === 1) return Array.from(words[0]).slice(0, 2).join("").toLocaleUpperCase();
  return "";
}

function normalizeTestimonials(testimonials) {
  return {
    ...testimonials,
    items: (testimonials?.items || []).map((item) => {
      const image = String(item.image || "").trim();
      return {
        ...item,
        image,
        image_alt: String(item.image_alt || item.name || "").trim(),
        avatar_label: image ? "" : avatarLabelFromName(item.name),
      };
    }),
  };
}

/**
 * Build the complete render data object for one locale/page combination.
 *
 * @param {Record<string, unknown>} settings - Processed site settings.
 * @param {string} locale - Requested locale.
 * @param {"home"|"privacy"|"legal"|"not_found"|"404"} [page] - Page identifier.
 * @param {{turnstileSiteKey?: string, pageRobots?: string}} [options] - Per-render overrides.
 * @returns {Record<string, unknown>} Template-ready page data.
 */
export function prepareLocaleData(settings, locale, page = "home", options = {}) {
  const normalizedLocale = normalizeLocale(locale, DEFAULT_LOCALE);
  const current = LOCALES[normalizedLocale];
  const otherLocale = alternateLocale(normalizedLocale);
  const other = LOCALES[otherLocale];
  const localized = settings.locales[normalizedLocale] || settings.locales[DEFAULT_LOCALE];
  const logoLocale = normalizedLocale === "fr-CA" ? "fr" : "en";
  const domain = settings.site.domain;
  const images = withResponsiveImages({
    ...settings.shared.images,
    multi_prets_logo:
      settings.shared.images?.[`multi_prets_logo_dark_${logoLocale}`] || settings.shared.images?.multi_prets_logo,
    multi_prets_logo_plain:
      settings.shared.images?.[`multi_prets_logo_light_${logoLocale}`] || settings.shared.images?.multi_prets_logo_plain,
  });
  const seo = {
    ...localized.seo,
    og_image: absoluteImageUrl(domain, localized.seo?.og_image || images.og || images.hero),
    og_image_alt: [localized.header?.site_name, localized.header?.credential].filter(Boolean).join(", ") || "Melkior Clerge",
    og_image_width: SOCIAL_IMAGE_WIDTH,
    og_image_height: SOCIAL_IMAGE_HEIGHT,
    og_locale: openGraphLocale(current.htmlLang),
    og_locale_alternate: openGraphLocale(other.htmlLang),
    site_name: localized.header?.site_name || "Melkior Clerge",
  };
  seo.og_image_type = socialImageType(seo.og_image);
  const shared = {
    ...settings.shared,
    regions: localized.regions || settings.shared.regions,
    profile_url: settings.shared.profile_urls?.[normalizedLocale] || settings.shared.profile_url,
    images,
  };
  const instagramEmbed = normalizeInstagramEmbed(shared);
  const media = {
    ...localized.media,
    instagram_embed_url: instagramEmbed.url,
    instagram_embed_title: instagramEmbed.title,
  };
  const path = pagePath(normalizedLocale, page);
  const altPath = equivalentPath(path, otherLocale);
  const nav = normalizeNav(localized.nav, current.homePath);
  const testimonials = normalizeTestimonials(localized.testimonials);

  return withStructuredData({
    ...localized,
    nav,
    testimonials,
    seo,
    media,
    site: settings.site,
    shared,
    theme: settings.theme,
    theme_style: trustedHtml(themeStyle(settings.theme)),
    turnstile_sitekey: options.turnstileSiteKey || "",
    page_robots: options.pageRobots || "index, follow",
    locale: normalizedLocale,
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
    nav_contact_href: `${current.homePath}#contact`,
  });
}

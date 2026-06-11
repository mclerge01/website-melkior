import {
  DEFAULT_LOCALE,
  LOCALES,
  alternateLocale,
  canonicalUrl,
  equivalentPath,
  normalizeLocale,
  pagePath,
} from "./i18n.mjs";
import { normalizeInstagramEmbed } from "./render.mjs";

const RESPONSIVE_IMAGE_WIDTHS = Object.freeze([480, 960, 1440, 1920, 2560, 3840]);

function themeStyle(theme) {
  return Object.entries(theme || {})
    .map(([key, value]) => `      --color-${key.replace(/_/g, "-")}: ${value};`)
    .join("\n");
}

function responsiveVariantParts(src) {
  const path = String(src || "").trim().split(/[?#]/)[0];
  if (!path.startsWith("/assets/images/")) return null;
  const match = path.match(/^(.*)-(\d+)w\.webp$/i);
  if (!match) return null;
  const maxWidth = Number.parseInt(match[2], 10);
  if (!Number.isFinite(maxWidth) || maxWidth <= 0) return null;
  const widths = RESPONSIVE_IMAGE_WIDTHS.filter((width) => width <= maxWidth);
  if (!widths.includes(maxWidth)) widths.push(maxWidth);
  return { prefix: match[1], widths: [...new Set(widths)].sort((a, b) => a - b) };
}

function responsiveSrcset(src) {
  const parts = responsiveVariantParts(src);
  if (!parts) return "";
  return parts.widths.map((width) => `${parts.prefix}-${width}w.webp ${width}w`).join(", ");
}

function absoluteImageUrl(domain, src) {
  const value = String(src || "").trim();
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return `${domain}${value}`;
  return value;
}

function withResponsiveImages(images) {
  return {
    ...images,
    hero_background_srcset: responsiveSrcset(images.hero_background),
    hero_background_sizes: "100vw",
    hero_srcset: responsiveSrcset(images.hero),
    hero_sizes: "(min-width: 1024px) 31rem, 65vw",
    portrait_srcset: responsiveSrcset(images.portrait),
    portrait_sizes: "(min-width: 1024px) 40vw, 100vw",
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
  };
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

  return {
    ...localized,
    nav,
    testimonials,
    seo,
    media,
    site: settings.site,
    shared,
    theme: settings.theme,
    theme_style: themeStyle(settings.theme),
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
  };
}

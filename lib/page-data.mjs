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

function themeStyle(theme) {
  return Object.entries(theme || {})
    .map(([key, value]) => `      --color-${key.replace(/_/g, "-")}: ${value};`)
    .join("\n");
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
  const images = {
    ...settings.shared.images,
    multi_prets_logo:
      settings.shared.images?.[`multi_prets_logo_dark_${logoLocale}`] || settings.shared.images?.multi_prets_logo,
    multi_prets_logo_plain:
      settings.shared.images?.[`multi_prets_logo_light_${logoLocale}`] || settings.shared.images?.multi_prets_logo_plain,
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
  const domain = settings.site.domain;

  return {
    ...localized,
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
    nav_about_href: `${current.homePath}#about`,
    nav_services_href: `${current.homePath}#services`,
    nav_guide_href: `${current.homePath}#guide`,
    nav_calculator_href: `${current.homePath}#calculator`,
    nav_testimonials_href: `${current.homePath}#testimonials`,
    nav_media_href: `${current.homePath}#media`,
    nav_contact_href: `${current.homePath}#contact`,
  };
}

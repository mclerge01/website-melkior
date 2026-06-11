export const LOCALES = {
  "fr-CA": {
    slug: "fr",
    htmlLang: "fr-CA",
    label: "Francais",
    switchLabel: "English",
    homePath: "/fr/",
    privacyPath: "/fr/politique-de-confidentialite/",
    legalPath: "/fr/mentions-legales/",
    notFoundPath: "/fr/404.html",
  },
  "en-CA": {
    slug: "en",
    htmlLang: "en-CA",
    label: "English",
    switchLabel: "Francais",
    homePath: "/en/",
    privacyPath: "/en/privacy-policy/",
    legalPath: "/en/legal-notice/",
    notFoundPath: "/en/404.html",
  },
};

export const DEFAULT_LOCALE = "fr-CA";

/**
 * Normalize an input language tag to one of the two supported locales.
 *
 * @param {string} value - Candidate locale or language tag.
 * @param {string} [fallback] - Locale to return when no supported match is found.
 * @returns {"fr-CA"|"en-CA"} Supported locale code.
 */
export function normalizeLocale(value, fallback = DEFAULT_LOCALE) {
  if (!value || typeof value !== "string") return fallback;
  const lower = value.trim().toLowerCase();
  if (lower === "fr-ca" || lower === "fr") return "fr-CA";
  if (lower === "en-ca" || lower === "en") return "en-CA";
  if (lower.startsWith("fr-")) return "fr-CA";
  if (lower.startsWith("en-")) return "en-CA";
  return fallback;
}

/**
 * Convert a supported locale to its URL slug.
 *
 * @param {string} locale - Candidate locale.
 * @returns {"fr"|"en"} URL slug for the normalized locale.
 */
export function localeToSlug(locale) {
  return LOCALES[normalizeLocale(locale)].slug;
}

/**
 * Return the other supported locale.
 *
 * @param {string} locale - Candidate locale.
 * @returns {"fr-CA"|"en-CA"} Alternate locale.
 */
export function alternateLocale(locale) {
  return normalizeLocale(locale) === "fr-CA" ? "en-CA" : "fr-CA";
}

/**
 * Return the canonical path for a localized page.
 *
 * @param {string} locale - Candidate locale.
 * @param {"home"|"privacy"|"legal"|"not_found"|"404"} [page] - Page identifier.
 * @returns {string} Localized path.
 */
export function pagePath(locale, page = "home") {
  const config = LOCALES[normalizeLocale(locale)];
  if (page === "privacy") return config.privacyPath;
  if (page === "legal") return config.legalPath;
  if (page === "not_found" || page === "404") return config.notFoundPath;
  return config.homePath;
}

/**
 * Return the equivalent path in the opposite locale when it exists.
 *
 * @param {string} pathname - Current page path.
 * @param {string} targetLocale - Target locale.
 * @returns {string} Localized equivalent path.
 */
export function equivalentPath(pathname, targetLocale) {
  const target = normalizeLocale(targetLocale);
  const source = target === "fr-CA" ? LOCALES["en-CA"] : LOCALES["fr-CA"];
  const dest = LOCALES[target];

  if (pathname === source.privacyPath || pathname === source.privacyPath.slice(0, -1)) {
    return dest.privacyPath;
  }
  if (pathname === source.legalPath || pathname === source.legalPath.slice(0, -1)) {
    return dest.legalPath;
  }
  if (pathname === source.notFoundPath) {
    return dest.notFoundPath;
  }
  return dest.homePath;
}

/**
 * Pick the best supported locale from an Accept-Language header.
 *
 * @param {string} header - Raw Accept-Language header.
 * @param {string} [fallback] - Locale used when no supported language is present.
 * @returns {"fr-CA"|"en-CA"} Best supported locale.
 */
export function pickLocaleFromAcceptLanguage(header, fallback = DEFAULT_LOCALE) {
  if (!header || typeof header !== "string") return fallback;
  const candidates = header
    .split(",")
    .map((part) => {
      const [tag, qPart] = part.trim().split(";");
      const q = qPart && qPart.includes("=") ? Number(qPart.split("=")[1]) : 1;
      return { tag: tag.trim(), q: Number.isFinite(q) ? q : 0 };
    })
    .filter((item) => item.tag)
    .sort((a, b) => b.q - a.q);

  for (const candidate of candidates) {
    const lower = candidate.tag.toLowerCase();
    if (lower === "fr" || lower.startsWith("fr-")) return "fr-CA";
    if (lower === "en" || lower.startsWith("en-")) return "en-CA";
  }
  return fallback;
}

/**
 * Read a named cookie value from a Cookie header.
 *
 * @param {string} header - Raw Cookie header.
 * @param {string} name - Cookie name.
 * @returns {string} Decoded cookie value, or an empty string.
 */
export function parseCookie(header, name) {
  if (!header) return "";
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    if (trimmed.slice(0, index) === name) {
      return decodeURIComponent(trimmed.slice(index + 1));
    }
  }
  return "";
}

/**
 * Join the configured domain and a canonical path.
 *
 * @param {string} domain - Absolute site origin.
 * @param {string} path - Path beginning with /.
 * @returns {string} Absolute canonical URL.
 */
export function canonicalUrl(domain, path) {
  return `${String(domain || "").replace(/\/+$/, "")}${path}`;
}

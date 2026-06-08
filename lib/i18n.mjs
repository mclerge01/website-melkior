export const LOCALES = {
  "fr-CA": {
    slug: "fr",
    htmlLang: "fr-CA",
    label: "Francais",
    switchLabel: "English",
    homePath: "/fr/",
    privacyPath: "/fr/politique-de-confidentialite/",
    legalPath: "/fr/mentions-legales/",
  },
  "en-CA": {
    slug: "en",
    htmlLang: "en-CA",
    label: "English",
    switchLabel: "Francais",
    homePath: "/en/",
    privacyPath: "/en/privacy-policy/",
    legalPath: "/en/legal-notice/",
  },
};

export const DEFAULT_LOCALE = "fr-CA";

export function normalizeLocale(value, fallback = DEFAULT_LOCALE) {
  if (!value || typeof value !== "string") return fallback;
  const lower = value.trim().toLowerCase();
  if (lower === "fr-ca" || lower === "fr") return "fr-CA";
  if (lower === "en-ca" || lower === "en") return "en-CA";
  if (lower.startsWith("fr-")) return "fr-CA";
  if (lower.startsWith("en-")) return "en-CA";
  return fallback;
}

export function slugToLocale(slug, fallback = DEFAULT_LOCALE) {
  if (slug === "fr") return "fr-CA";
  if (slug === "en") return "en-CA";
  return fallback;
}

export function localeToSlug(locale) {
  return LOCALES[normalizeLocale(locale)].slug;
}

export function alternateLocale(locale) {
  return normalizeLocale(locale) === "fr-CA" ? "en-CA" : "fr-CA";
}

export function pagePath(locale, page = "home") {
  const config = LOCALES[normalizeLocale(locale)];
  if (page === "privacy") return config.privacyPath;
  if (page === "legal") return config.legalPath;
  return config.homePath;
}

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
  return dest.homePath;
}

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

export function canonicalUrl(domain, path) {
  return `${String(domain || "").replace(/\/+$/, "")}${path}`;
}

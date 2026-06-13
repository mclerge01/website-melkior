const DEFAULT_LOCALE_KEY = "fr-CA";

const VIEW_ROUTE_SEGMENTS = Object.freeze({
  content: "contenu",
  colors: "couleurs",
  images: "images",
  seo: "seo",
});

const ROUTE_SEGMENT_VIEWS = Object.freeze(Object.fromEntries(
  Object.entries(VIEW_ROUTE_SEGMENTS).map(([view, segment]) => [segment, view])
));

const LOCALE_ROUTE_SEGMENTS = Object.freeze({
  "fr-CA": "fr",
  "en-CA": "en",
});

const ROUTE_SEGMENT_LOCALES = Object.freeze(Object.fromEntries(
  Object.entries(LOCALE_ROUTE_SEGMENTS).map(([locale, segment]) => [segment, locale])
));

export function adminAnchorIdFromHash(hash) {
  const raw = String(hash || "").replace(/^#/, "");
  if (!raw) return "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function adminAnchorSlug(...parts) {
  return parts
    .filter((part) => part != null && String(part).trim())
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "field";
}

export function adminHrefForState(state, anchorId = "") {
  const hash = anchorId ? `#${encodeURIComponent(anchorId)}` : "";
  return `${adminPathForState(state)}${hash}`;
}

export function adminPathForState(state = {}) {
  const activeView = normalizeViewKey(state.activeView);
  const viewSegment = VIEW_ROUTE_SEGMENTS[activeView];
  if (activeView === "content") {
    return `/admin/${viewSegment}/${localeRouteSegment(state.activeLocale)}`;
  }
  if (activeView === "seo") {
    return `/admin/${viewSegment}/${localeRouteSegment(state.activeSeoLocale || state.activeLocale)}`;
  }
  return `/admin/${viewSegment}`;
}

export function adminRouteFromPathname(pathname, defaults = {}) {
  const segments = String(pathname || "")
    .split("/")
    .filter(Boolean);
  const adminIndex = segments.indexOf("admin");
  const routeSegments = adminIndex >= 0 ? segments.slice(adminIndex + 1) : [];
  const activeView = normalizeViewKey(ROUTE_SEGMENT_VIEWS[routeSegments[0]] || defaults.activeView);
  let activeLocale = normalizeLocaleKey(defaults.activeLocale, DEFAULT_LOCALE_KEY);
  let activeSeoLocale = normalizeLocaleKey(defaults.activeSeoLocale, activeLocale);

  if (activeView === "content") {
    activeLocale = localeKeyFromRouteSegment(routeSegments[1], activeLocale);
  } else if (activeView === "seo") {
    activeSeoLocale = localeKeyFromRouteSegment(routeSegments[1], activeSeoLocale);
  }

  return { activeView, activeLocale, activeSeoLocale };
}

export function localeKeyFromRouteSegment(segment, fallback = DEFAULT_LOCALE_KEY) {
  return ROUTE_SEGMENT_LOCALES[String(segment || "").toLowerCase()] || normalizeLocaleKey(fallback, DEFAULT_LOCALE_KEY);
}

export function localeRouteSegment(localeKey) {
  return LOCALE_ROUTE_SEGMENTS[normalizeLocaleKey(localeKey, DEFAULT_LOCALE_KEY)] || LOCALE_ROUTE_SEGMENTS[DEFAULT_LOCALE_KEY];
}

function normalizeLocaleKey(localeKey, fallback = DEFAULT_LOCALE_KEY) {
  return LOCALE_ROUTE_SEGMENTS[localeKey] ? localeKey : fallback;
}

function normalizeViewKey(viewKey) {
  return VIEW_ROUTE_SEGMENTS[viewKey] ? viewKey : "content";
}

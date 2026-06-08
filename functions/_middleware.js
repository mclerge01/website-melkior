import { DEFAULT_LOCALE, localeToSlug, normalizeLocale, parseCookie, pickLocaleFromAcceptLanguage } from "../lib/i18n.mjs";

export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (url.pathname === "/fr") {
    url.pathname = "/fr/";
    return Response.redirect(url.toString(), 301);
  }
  if (url.pathname === "/en") {
    url.pathname = "/en/";
    return Response.redirect(url.toString(), 301);
  }

  if (url.pathname !== "/") return context.next();

  const cookieLocale = parseCookie(context.request.headers.get("Cookie"), "melkior_locale");
  const locale = cookieLocale
    ? normalizeLocale(cookieLocale, DEFAULT_LOCALE)
    : pickLocaleFromAcceptLanguage(context.request.headers.get("Accept-Language"), DEFAULT_LOCALE);

  url.pathname = `/${localeToSlug(locale)}/`;
  return Response.redirect(url.toString(), 302);
}

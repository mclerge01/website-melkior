import { LOCALES, alternateLocale, canonicalUrl, equivalentPath, pagePath } from "../../lib/i18n.mjs";
import { normalizeInstagramEmbed, processMarkdown, render } from "../../lib/render.mjs";
import { htmlResponse, jsonResponse, requireAdmin } from "../../lib/admin-auth.mjs";

function themeStyle(theme) {
  return Object.entries(theme || {})
    .map(([key, value]) => `      --color-${key.replace(/_/g, "-")}: ${value};`)
    .join("\n");
}

function prepareLocaleData(settings, locale) {
  const current = LOCALES[locale] || LOCALES["fr-CA"];
  const otherLocale = alternateLocale(locale);
  const other = LOCALES[otherLocale];
  const localized = settings.locales[locale];
  const instagramEmbed = normalizeInstagramEmbed(settings.shared);
  const media = {
    ...localized.media,
    instagram_embed_url: instagramEmbed.url,
    instagram_embed_title: instagramEmbed.title,
    use_instagram_api: !instagramEmbed.url,
  };
  const path = current.homePath;

  return {
    ...localized,
    media,
    site: settings.site,
    shared: settings.shared,
    theme: settings.theme,
    theme_style: themeStyle(settings.theme),
    turnstile_sitekey: "1x00000000000000000000AA",
    locale,
    locale_slug: current.slug,
    html_lang: current.htmlLang,
    page_path: path,
    canonical_url: canonicalUrl(settings.site.domain, path),
    alternate_fr: canonicalUrl(settings.site.domain, pagePath("fr-CA")),
    alternate_en: canonicalUrl(settings.site.domain, pagePath("en-CA")),
    x_default: canonicalUrl(settings.site.domain, "/"),
    privacy_path: current.privacyPath,
    legal_path: current.legalPath,
    admin_path: "/admin/",
    language_switch: {
      href: equivalentPath(path, otherLocale),
      label: current.switchLabel,
      code: other.slug.toUpperCase(),
      locale: otherLocale,
    },
    nav_contact_href: `${current.homePath}#contact`,
  };
}

export async function onRequestPost(context) {
  const auth = await requireAdmin(context, { csrf: true });
  if (!auth.ok) return auth.response;

  let data;
  try {
    data = await context.request.json();
  } catch {
    return jsonResponse({ success: false, error: "Invalid JSON body." }, { status: 400, headers: auth.headers });
  }

  const locale = data.locale === "en-CA" ? "en-CA" : "fr-CA";
  if (!data.content || typeof data.content !== "object") {
    return jsonResponse({ success: false, error: "Content object is required." }, { status: 400, headers: auth.headers });
  }

  const templateResponse = await context.env.ASSETS.fetch(new Request(new URL("/template.html", context.request.url)));
  if (!templateResponse.ok) {
    return jsonResponse({ success: false, error: "Unable to load preview template." }, { status: 500, headers: auth.headers });
  }

  const template = await templateResponse.text();
  const settings = processMarkdown(data.content);
  const html = render(template, prepareLocaleData(settings, locale));
  return htmlResponse(html, { headers: auth.headers });
}

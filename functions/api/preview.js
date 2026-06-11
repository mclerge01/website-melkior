import { htmlResponse, jsonResponse, requireAdmin } from "../../lib/admin-auth.mjs";
import { prepareLocaleData } from "../../lib/page-data.mjs";
import { processMarkdown, render } from "../../lib/render.mjs";

const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";

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

  const templateResponse = await context.env.ASSETS.fetch(new Request(new URL("/admin/preview-template.txt", context.request.url)));
  if (!templateResponse.ok) {
    return jsonResponse({ success: false, error: "Unable to load preview template." }, { status: 500, headers: auth.headers });
  }

  const template = await templateResponse.text();
  const settings = processMarkdown(data.content);
  const html = render(template, prepareLocaleData(settings, locale, "home", { turnstileSiteKey: TURNSTILE_TEST_SITE_KEY }));
  return htmlResponse(html, { headers: auth.headers });
}

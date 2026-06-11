import { htmlResponse, jsonResponse, requireAdminJsonBody } from "../../lib/admin-auth.mjs";
import { prepareLocaleData } from "../../lib/page-data.mjs";
import { processMarkdown, render } from "../../lib/render.mjs";

const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";

/**
 * Render an authenticated draft preview without publishing content.
 *
 * @param {{request: Request, env: Record<string, unknown>}} context - Pages/Worker handler context.
 * @returns {Promise<Response>} Rendered preview HTML or JSON error.
 */
export async function onRequestPost(context) {
  const adminRequest = await requireAdminJsonBody(context, { csrf: true });
  if (!adminRequest.ok) return adminRequest.response;
  const { auth, data } = adminRequest;

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

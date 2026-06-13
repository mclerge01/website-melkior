import { adminPublicOrigin, htmlResponse, jsonResponse, requireAdminJsonBody } from "../../../lib/admin-auth.mjs";
import { prepareLocaleData } from "../../../lib/page-data.mjs";
import { processMarkdown, render } from "../../../lib/render.mjs";

const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";

function escapeHtmlAttribute(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function injectPreviewBase(html, baseHref) {
  const base = `<base href="${escapeHtmlAttribute(baseHref)}">`;
  if (/<base\b/i.test(html)) return html.replace(/<base\b[^>]*>/i, base);
  if (/<head(\s[^>]*)?>/i.test(html)) return html.replace(/<head(\s[^>]*)?>/i, (match) => `${match}\n  ${base}`);
  return `<head>\n  ${base}\n</head>${html}`;
}

/**
 * Render an authenticated draft preview without publishing content.
 *
 * @param {{request: Request, env: Record<string, unknown>}} context - Worker route handler context.
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
  const html = injectPreviewBase(
    render(template, prepareLocaleData(settings, locale, "home", { turnstileSiteKey: TURNSTILE_TEST_SITE_KEY })),
    `${adminPublicOrigin(context.env, context.request)}/`,
  );
  return htmlResponse(html, { headers: auth.headers });
}

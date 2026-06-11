import { onRequest as handleMiddleware } from "../functions/_middleware.js";
import { onRequestOptions as contactOptions, onRequestPost as contactPost } from "../functions/api/contact.js";
import { onRequestPost as previewPost } from "../functions/api/preview.js";
import { onRequestGet as authCallbackGet } from "../functions/api/auth/callback.js";
import { onRequestGet as authGithubGet } from "../functions/api/auth/github.js";
import { onRequestPost as authLogoutPost } from "../functions/api/auth/logout.js";
import { onRequestGet as adminContentGet, onRequestPut as adminContentPut } from "../functions/api/admin/content.js";
import { onRequestDelete as adminImageDelete, onRequestPut as adminImagePut } from "../functions/api/admin/image.js";
import { onRequestGet as adminImagesGet } from "../functions/api/admin/images.js";
import { onRequestGet as adminSessionGet } from "../functions/api/admin/session.js";

const API_ROUTES = [
  { path: /^\/api\/contact\/?$/, handlers: { OPTIONS: contactOptions, POST: contactPost } },
  { path: /^\/api\/preview\/?$/, handlers: { POST: previewPost } },
  { path: /^\/api\/auth\/github\/?$/, handlers: { GET: authGithubGet } },
  { path: /^\/api\/auth\/callback\/?$/, handlers: { GET: authCallbackGet } },
  { path: /^\/api\/auth\/logout\/?$/, handlers: { POST: authLogoutPost } },
  { path: /^\/api\/admin\/content\/?$/, handlers: { GET: adminContentGet, PUT: adminContentPut } },
  { path: /^\/api\/admin\/image\/?$/, handlers: { DELETE: adminImageDelete, PUT: adminImagePut } },
  { path: /^\/api\/admin\/images\/?$/, handlers: { GET: adminImagesGet } },
  { path: /^\/api\/admin\/session\/?$/, handlers: { GET: adminSessionGet } },
];

const SUPERFLOW_SCRIPT = '<script id="superflowToolbarScript" data-sf-platform="other-manual" async src="https://cdn.velt.dev/lib/superflow.js?apiKey=OjNo4BCjdWHMOnnygDAd&projectId=1086230342273239"></script>';
const REVIEW_CONTENT_SECURITY_POLICY = "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' https://challenges.cloudflare.com https://static.cloudflareinsights.com https://cdn.jsdelivr.net https://cdn.velt.dev https://*.velt.dev https://*.api.velt.dev https://*.googleapis.com https://apis.google.com https://www.google.com https://*.firebaseio.com wss://*.firebaseio.com wss://*.firebasedatabase.app; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdn.velt.dev; font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net https://cdn.velt.dev; img-src 'self' data: https:; media-src 'self'; frame-src https://challenges.cloudflare.com https://emb.fouita.com https://*.velt.dev https://*.firebaseio.com https://*.firebasedatabase.app https://*.googleapis.com https://www.google.com; connect-src 'self' https://challenges.cloudflare.com https://*.velt.dev https://*.api.velt.dev https://*.googleapis.com https://www.google.com https://*.firebaseio.com wss://*.firebaseio.com wss://*.firebasedatabase.app";

function jsonResponse(body, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { ...init, headers });
}

function pagesContext(request, env, ctx) {
  return {
    request,
    env,
    params: {},
    waitUntil: ctx.waitUntil.bind(ctx),
  };
}

async function handleApiRequest(request, env, ctx) {
  const url = new URL(request.url);
  const route = API_ROUTES.find((candidate) => candidate.path.test(url.pathname));
  if (!route) return jsonResponse({ success: false, error: "Not found" }, { status: 404 });

  const handler = route.handlers[request.method.toUpperCase()];
  if (!handler) {
    return new Response(null, {
      status: 405,
      headers: { Allow: Object.keys(route.handlers).join(", ") },
    });
  }

  const response = await handler(pagesContext(request, env, ctx));
  if (url.pathname.startsWith("/api/auth/") || url.pathname.startsWith("/api/admin/")) {
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "no-store");
    headers.set("X-Robots-Tag", "noindex, nofollow");
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }

  return response;
}

function middlewareContext(request, env, ctx) {
  return {
    ...pagesContext(request, env, ctx),
    next: () => env.ASSETS.fetch(request),
  };
}

function isReviewRequest(request, url) {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  if (!url.searchParams.has("review")) return false;
  const value = url.searchParams.get("review").trim().toLowerCase();
  return value === "" || value === "true" || value === "1";
}

function isHtmlResponse(response) {
  return response.headers.get("Content-Type")?.toLowerCase().includes("text/html");
}

function reviewHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store");
  headers.set("Content-Security-Policy", REVIEW_CONTENT_SECURITY_POLICY);
  headers.set("X-Robots-Tag", "noindex, nofollow");
  headers.delete("Content-Length");
  headers.delete("ETag");
  return headers;
}

async function withReviewToolbar(request, response) {
  if (!response.ok || !isHtmlResponse(response)) return response;

  const headers = reviewHeaders(response);
  if (request.method === "HEAD") {
    return new Response(null, { status: response.status, statusText: response.statusText, headers });
  }

  const html = await response.text();
  const script = `\n  ${SUPERFLOW_SCRIPT}\n`;
  const body = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${script}</body>`) : `${html}${script}`;
  return new Response(body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return handleApiRequest(request, env, ctx);
    }

    const response = await handleMiddleware(middlewareContext(request, env, ctx));
    return isReviewRequest(request, url) ? withReviewToolbar(request, response) : response;
  },
};

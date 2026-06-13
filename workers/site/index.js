import { onRequest as handleMiddleware } from "../../functions/_middleware.js";
import { onRequestOptions as contactOptions, onRequestPost as contactPost } from "../../functions/api/contact.js";
import { onRequestPost as previewPost } from "../../functions/api/preview.js";
import { onRequestGet as authCallbackGet } from "../../functions/api/auth/callback.js";
import { onRequestGet as authGithubGet } from "../../functions/api/auth/github.js";
import { onRequestPost as authLogoutPost } from "../../functions/api/auth/logout.js";
import { onRequestGet as adminContentGet, onRequestPut as adminContentPut } from "../../functions/api/admin/content.js";
import { onRequestDelete as adminImageDelete, onRequestPut as adminImagePut } from "../../functions/api/admin/image.js";
import { onRequestGet as adminImagesGet } from "../../functions/api/admin/images.js";
import { onRequestGet as adminSessionGet } from "../../functions/api/admin/session.js";
import { jsonResponse } from "../../lib/http.mjs";
import {
  ADMIN_CONTENT_SECURITY_POLICY,
  API_CONTENT_SECURITY_POLICY,
  PUBLIC_CONTENT_SECURITY_POLICY,
  SECURITY_HEADERS,
  SVG_CONTENT_SECURITY_POLICY,
} from "../../lib/security-headers.mjs";

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

/**
 * Adapt the Worker runtime inputs to the Pages Function context shape.
 *
 * @param {Request} request - Incoming request.
 * @param {Record<string, unknown>} env - Worker environment.
 * @param {{waitUntil: Function}} ctx - Worker execution context.
 * @returns {{request: Request, env: Record<string, unknown>, params: Record<string, string>, waitUntil: Function}} Pages-like context.
 */
function pagesContext(request, env, ctx) {
  return {
    request,
    env,
    params: {},
    waitUntil: ctx.waitUntil.bind(ctx),
  };
}

/**
 * Route API requests to their Pages Function-compatible handlers.
 *
 * @param {Request} request - Incoming API request.
 * @param {Record<string, unknown>} env - Worker environment.
 * @param {{waitUntil: Function}} ctx - Worker execution context.
 * @returns {Promise<Response>} API response.
 */
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
  if (isPrivateApiPath(url.pathname)) {
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "no-store");
    headers.set("X-Robots-Tag", "noindex, nofollow");
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }

  return response;
}

/**
 * Build the middleware context that serves static assets through env.ASSETS.
 *
 * @param {Request} request - Incoming non-API request.
 * @param {Record<string, unknown>} env - Worker environment.
 * @param {{waitUntil: Function}} ctx - Worker execution context.
 * @returns {Record<string, unknown>} Pages middleware context.
 */
function middlewareContext(request, env, ctx) {
  return {
    ...pagesContext(request, env, ctx),
    next: () => env.ASSETS.fetch(request),
  };
}

/**
 * Check whether an API route must be treated as private and non-cacheable.
 *
 * @param {string} pathname - Request URL path.
 * @returns {boolean} Whether no-store/noindex headers are required.
 */
function isPrivateApiPath(pathname) {
  return pathname.startsWith("/api/auth/") || pathname.startsWith("/api/admin/") || /^\/api\/preview\/?$/.test(pathname);
}

/**
 * Check whether a request targets the admin shell or admin assets.
 *
 * @param {string} pathname - Request URL path.
 * @returns {boolean} Whether admin-only security headers should apply.
 */
function isAdminPath(pathname) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

/**
 * Select the CSP that belongs to a route class.
 *
 * @param {string} pathname - Request URL path.
 * @returns {string} Content-Security-Policy value.
 */
function contentSecurityPolicyForPath(pathname) {
  if (pathname.startsWith("/api/")) return API_CONTENT_SECURITY_POLICY;
  if (isAdminPath(pathname)) return ADMIN_CONTENT_SECURITY_POLICY;
  if (/^\/assets\/images\/[^/]+\.svg$/i.test(pathname)) return SVG_CONTENT_SECURITY_POLICY;
  return PUBLIC_CONTENT_SECURITY_POLICY;
}

/**
 * Add baseline security headers to every Worker-created response.
 *
 * @param {Request} request - Incoming request.
 * @param {Response} response - Worker or asset response.
 * @returns {Response} Response with baseline headers preserved or added.
 */
function withSecurityHeaders(request, response) {
  const headers = new Headers(response.headers);
  const pathname = new URL(request.url).pathname;
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(name)) headers.set(name, value);
  }
  if (!headers.has("Content-Security-Policy")) {
    headers.set("Content-Security-Policy", contentSecurityPolicyForPath(pathname));
  }
  if (isAdminPath(pathname)) {
    headers.set("Cache-Control", "no-store");
    headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  /**
   * Serve API routes and static assets.
   *
   * @param {Request} request - Incoming request.
   * @param {Record<string, unknown>} env - Worker environment.
   * @param {{waitUntil: Function}} ctx - Worker execution context.
   * @returns {Promise<Response>} Worker response.
  */
  async fetch(request, env, ctx) {
    if (new URL(request.url).pathname.startsWith("/api/")) {
      return withSecurityHeaders(request, await handleApiRequest(request, env, ctx));
    }

    const response = await handleMiddleware(middlewareContext(request, env, ctx));
    return withSecurityHeaders(request, response);
  },
};

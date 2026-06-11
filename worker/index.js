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

  return handler(pagesContext(request, env, ctx));
}

function middlewareContext(request, env, ctx) {
  return {
    ...pagesContext(request, env, ctx),
    next: () => env.ASSETS.fetch(request),
  };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return handleApiRequest(request, env, ctx);
    }

    return handleMiddleware(middlewareContext(request, env, ctx));
  },
};

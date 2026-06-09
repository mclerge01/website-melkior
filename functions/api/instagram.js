const GRAPH_HOST = "https://graph.facebook.com";
const DEFAULT_GRAPH_VERSION = "v23.0";
const DEFAULT_LIMIT = 6;
const DEFAULT_CACHE_TTL = 0;

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(),
      ...headers,
    },
  });
}

function clampNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function instagramEmbedUrl(url) {
  const clean = String(url || "").split("?")[0].replace(/\/$/, "");
  const match = clean.match(/^https?:\/\/(?:www\.)?instagram\.com\/(p|reel|tv)\/([^/#?]+)/i);
  return match ? `https://www.instagram.com/${match[1]}/${match[2]}/embed/` : "";
}

function normalizeItem(item) {
  const permalink = typeof item.permalink === "string" ? item.permalink : "";
  const embedUrl = instagramEmbedUrl(permalink);
  if (!permalink || !embedUrl) return null;

  return {
    id: String(item.id || ""),
    caption: typeof item.caption === "string" ? item.caption : "",
    mediaType: typeof item.media_type === "string" ? item.media_type : "",
    mediaProductType: typeof item.media_product_type === "string" ? item.media_product_type : "",
    permalink,
    embedUrl,
    timestamp: typeof item.timestamp === "string" ? item.timestamp : "",
  };
}

function configuredLimit(request, env) {
  const url = new URL(request.url);
  return clampNumber(url.searchParams.get("limit") || env.INSTAGRAM_MEDIA_LIMIT, DEFAULT_LIMIT, 1, 12);
}

function cacheTtl(env) {
  return clampNumber(env.INSTAGRAM_CACHE_TTL, DEFAULT_CACHE_TTL, 0, 86400);
}

async function fetchInstagramMedia(request, env) {
  const accessToken = env.INSTAGRAM_ACCESS_TOKEN;
  const userId = env.INSTAGRAM_USER_ID;
  if (!accessToken || !userId) {
    return jsonResponse({
      success: false,
      items: [],
      code: "not_configured",
      error: "Instagram API is not configured.",
    }, 503, { "Cache-Control": "no-store" });
  }

  const limit = configuredLimit(request, env);
  const version = String(env.INSTAGRAM_GRAPH_VERSION || DEFAULT_GRAPH_VERSION).replace(/[^v0-9.]/g, "") || DEFAULT_GRAPH_VERSION;
  const ttl = cacheTtl(env);
  const cacheUrl = new URL(request.url);
  cacheUrl.searchParams.set("limit", String(limit));
  const cacheKey = new Request(cacheUrl.toString(), { method: "GET" });
  const cache = typeof caches !== "undefined" ? caches.default : null;

  if (cache && ttl > 0) {
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
  }

  const apiUrl = new URL(`${GRAPH_HOST}/${version}/${encodeURIComponent(userId)}/media`);
  apiUrl.searchParams.set("fields", "id,caption,media_type,media_product_type,permalink,timestamp");
  apiUrl.searchParams.set("limit", String(limit));
  apiUrl.searchParams.set("access_token", accessToken);

  const response = await fetch(apiUrl.toString());
  const payload = await response.json();

  if (!response.ok) {
    return jsonResponse({
      success: false,
      items: [],
      code: "api_request_failed",
      error: "Instagram API request failed.",
    }, 502, { "Cache-Control": "no-store" });
  }

  const items = Array.isArray(payload.data) ? payload.data.map(normalizeItem).filter(Boolean) : [];
  const result = jsonResponse({
    success: true,
    items,
  }, 200, { "Cache-Control": ttl > 0 ? `public, max-age=${ttl}` : "no-store" });

  if (cache && ttl > 0) await cache.put(cacheKey, result.clone());
  return result;
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestGet(context) {
  try {
    return await fetchInstagramMedia(context.request, context.env);
  } catch {
    return jsonResponse({
      success: false,
      items: [],
      code: "server_error",
      error: "Unable to load Instagram media.",
    }, 500, { "Cache-Control": "no-store" });
  }
}

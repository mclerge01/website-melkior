import { jsonResponse } from "./http.mjs";

export { htmlResponse, jsonResponse } from "./http.mjs";

const REPO_OWNER = "mclerge01";
const REPO_NAME = "website-melkior";
const REPO_FULL_NAME = `${REPO_OWNER}/${REPO_NAME}`;
const REPO_BRANCH = "main";
const GITHUB_API = "https://api.github.com";

const OAUTH_STATE_COOKIE = "admin_oauth_state";
const OAUTH_VERIFIER_COOKIE = "admin_oauth_verifier";
const SESSION_COOKIE = "admin_session";

const CALLBACK_COOKIE_MAX_AGE = 600;
const SESSION_MAX_AGE = 3600;
const PERMISSION_CACHE_MS = 5 * 60 * 1000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const CONTENT_PATH = "content/settings.json";
export const IMAGES_PATH = "assets/images";

/**
 * Return the public origin that admin auth redirects should use.
 *
 * @param {Record<string, string>} env - Worker environment.
 * @param {Request} request - Incoming request.
 * @returns {string} Origin without a trailing slash.
 */
export function adminPublicOrigin(env, request) {
  const configuredOrigin = String(env?.ADMIN_PUBLIC_ORIGIN || "").trim();
  if (configuredOrigin) return new URL(configuredOrigin).origin;
  return new URL(request.url).origin;
}

/**
 * Build an absolute admin/auth URL against the configured public origin.
 *
 * @param {Record<string, string>} env - Worker environment.
 * @param {Request} request - Incoming request.
 * @param {string} path - Root-relative path.
 * @returns {string} Absolute URL.
 */
export function adminPublicUrl(env, request, path) {
  return new URL(path, `${adminPublicOrigin(env, request)}/`).toString();
}

/**
 * Normalize a hostname or Host header value for localhost checks.
 *
 * @param {string|null} value - URL hostname or Host header value.
 * @returns {string} Lowercase hostname without port or IPv6 brackets.
 */
function normalizedHostname(value) {
  const host = String(value || "").trim().toLowerCase();
  if (!host) return "";
  if (host.startsWith("[")) {
    const end = host.indexOf("]");
    return end === -1 ? host.slice(1) : host.slice(1, end);
  }
  return host.split(":")[0];
}

/**
 * Check whether a hostname points to the local development machine.
 *
 * @param {string|null} value - Hostname or Host header value.
 * @returns {boolean} Whether the host should be treated as local.
 */
function isLocalHostname(value) {
  const hostname = normalizedHostname(value);
  return hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "127.0.0.1" || hostname === "::1";
}

/**
 * Check whether the request is served from the local development origin.
 *
 * @param {Request} request - Incoming request.
 * @returns {boolean} Whether local-only cookie relaxations should apply.
 */
function isLocalRequest(request) {
  const url = new URL(request.url);
  return isLocalHostname(url.hostname) || isLocalHostname(request.headers.get("Host"));
}

/**
 * Decide whether admin cookies should carry the Secure attribute.
 *
 * @param {Record<string, string>} env - Worker environment.
 * @param {Request} request - Incoming request.
 * @returns {boolean} Whether cookies should be HTTPS-only.
 */
function useSecureCookies(env, request) {
  if (String(env?.ADMIN_COOKIE_SECURE || "").toLowerCase() === "false") return false;
  return !isLocalRequest(request);
}

function cookie(name, value, request, options = {}) {
  const parts = [
    `${name}=${value}`,
    `Path=${options.path || "/"}`,
    `Max-Age=${options.maxAge ?? SESSION_MAX_AGE}`,
    "HttpOnly",
    `SameSite=${options.sameSite || "Strict"}`,
  ];
  if (options.secure !== false) parts.push("Secure");
  return parts.join("; ");
}

function clearCookie(name, request, options = {}) {
  return cookie(name, "", request, {
    path: options.path || "/",
    maxAge: 0,
    sameSite: options.sameSite || "Strict",
    secure: options.secure,
  });
}

function parseCookies(request) {
  const header = request.headers.get("Cookie") || "";
  const cookies = new Map();
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    cookies.set(trimmed.slice(0, index), trimmed.slice(index + 1));
  }
  return cookies;
}

function bytesToBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(String(value || "").replace(/\s/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64Url(bytes) {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  return base64ToBytes(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
}

/**
 * Encode UTF-8 text for GitHub's contents API payloads.
 *
 * @param {string} value - Text to encode.
 * @returns {string} Base64 encoded text.
 */
export function textToBase64(value) {
  return bytesToBase64(encoder.encode(value));
}

/**
 * Decode GitHub contents API base64 text.
 *
 * @param {string} value - Base64 encoded text.
 * @returns {string} Decoded UTF-8 text.
 */
export function base64ToText(value) {
  return decoder.decode(base64ToBytes(value));
}

function randomBase64Url(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

async function sha256Base64Url(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return bytesToBase64Url(new Uint8Array(digest));
}

async function sessionKey(env) {
  if (!env.ADMIN_SESSION_SECRET || env.ADMIN_SESSION_SECRET.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET must be at least 32 characters.");
  }
  const material = await crypto.subtle.importKey("raw", encoder.encode(env.ADMIN_SESSION_SECRET), "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: encoder.encode("website-melkior-admin-session-v1"),
      info: encoder.encode("admin-session-cookie"),
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Create a short-lived GitHub OAuth state and PKCE verifier cookie pair.
 *
 * @param {Request} request - Current admin login request.
 * @param {Record<string, string>} env - Worker environment.
 * @returns {Promise<{state: string, verifier: string, challenge: string, cookies: string[]}>} OAuth challenge data and Set-Cookie values.
 */
export async function createOauthChallenge(request, env = {}) {
  const state = randomBase64Url();
  const verifier = randomBase64Url();
  const challenge = await sha256Base64Url(verifier);
  const secure = useSecureCookies(env, request);
  return {
    state,
    verifier,
    challenge,
    cookies: [
      cookie(OAUTH_STATE_COOKIE, state, request, { maxAge: CALLBACK_COOKIE_MAX_AGE, sameSite: "Lax", secure }),
      cookie(OAUTH_VERIFIER_COOKIE, verifier, request, { maxAge: CALLBACK_COOKIE_MAX_AGE, sameSite: "Lax", secure }),
    ],
  };
}

/**
 * Read the OAuth state and PKCE verifier from callback cookies.
 *
 * @param {Request} request - OAuth callback request.
 * @returns {{state: string, verifier: string}} Stored OAuth callback values.
 */
export function readOauthChallenge(request) {
  const cookies = parseCookies(request);
  return {
    state: cookies.get(OAUTH_STATE_COOKIE) || "",
    verifier: cookies.get(OAUTH_VERIFIER_COOKIE) || "",
  };
}

/**
 * Build expired OAuth callback cookies after success or failure.
 *
 * @param {Request} request - Request used to derive secure cookie attributes.
 * @param {Record<string, string>} env - Worker environment.
 * @returns {string[]} Expired OAuth Set-Cookie values.
 */
export function clearOauthCookies(request, env = {}) {
  const secure = useSecureCookies(env, request);
  return [
    clearCookie(OAUTH_STATE_COOKIE, request, { sameSite: "Lax", secure }),
    clearCookie(OAUTH_VERIFIER_COOKIE, request, { sameSite: "Lax", secure }),
  ];
}

/**
 * Seal an authenticated admin session into an encrypted cookie.
 *
 * @param {Record<string, string>} env - Worker environment containing ADMIN_SESSION_SECRET.
 * @param {Request} request - Request used to derive secure cookie attributes.
 * @param {Record<string, unknown>} session - Session payload to seal.
 * @returns {Promise<string>} Set-Cookie header value.
 */
export async function createSessionCookie(env, request, session) {
  const now = Date.now();
  const payload = { ...session, iat: session.iat || now, exp: now + SESSION_MAX_AGE * 1000 };
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const key = await sessionKey(env);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(JSON.stringify(payload)));
  return cookie(SESSION_COOKIE, `v1.${bytesToBase64Url(iv)}.${bytesToBase64Url(new Uint8Array(ciphertext))}`, request, {
    secure: useSecureCookies(env, request),
  });
}

/**
 * Build an expired admin session cookie.
 *
 * @param {Request} request - Request used to derive secure cookie attributes.
 * @param {Record<string, string>} env - Worker environment.
 * @returns {string} Expired session Set-Cookie value.
 */
export function clearSessionCookie(request, env = {}) {
  return clearCookie(SESSION_COOKIE, request, { sameSite: "Strict", secure: useSecureCookies(env, request) });
}

async function readSession(env, request) {
  const sealed = parseCookies(request).get(SESSION_COOKIE);
  if (!sealed) return { ok: false, status: 401, error: "Not authenticated" };
  const parts = sealed.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return { ok: false, status: 401, error: "Invalid session", clear: true };
  try {
    const key = await sessionKey(env);
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64UrlToBytes(parts[1]) },
      key,
      base64UrlToBytes(parts[2])
    );
    const session = JSON.parse(decoder.decode(plaintext));
    if (!session.githubToken || !session.login || !session.csrf || !session.exp) {
      return { ok: false, status: 401, error: "Invalid session", clear: true };
    }
    if (Date.now() > session.exp) return { ok: false, status: 401, error: "Session expired", clear: true };
    return { ok: true, session };
  } catch {
    return { ok: false, status: 401, error: "Invalid session", clear: true };
  }
}

/**
 * Append multiple Set-Cookie values to an existing Headers object.
 *
 * @param {Headers} headers - Headers to mutate.
 * @param {Array<string|undefined|null>} cookies - Cookie header values.
 * @returns {Headers} The same Headers object for chaining.
 */
export function addSetCookies(headers, cookies) {
  for (const value of cookies.filter(Boolean)) headers.append("Set-Cookie", value);
  return headers;
}

/**
 * Read a JSON request body and return the common admin error response on parse failure.
 *
 * @param {{request: Request}} context - Pages/Worker handler context.
 * @param {{headers?: Headers}} auth - Auth result carrying response headers.
 * @returns {Promise<{ok: true, data: unknown}|{ok: false, response: Response}>} Parsed body or failure response.
 */
async function readJsonBody(context, auth) {
  try {
    return { ok: true, data: await context.request.json() };
  } catch {
    return {
      ok: false,
      response: jsonResponse({ success: false, error: "Invalid JSON body." }, { status: 400, headers: auth.headers }),
    };
  }
}

/**
 * Require an admin session and parse a JSON body in one common API-handler step.
 *
 * @param {{env: Record<string, string>, request: Request}} context - Pages/Worker handler context.
 * @param {{csrf?: boolean, freshPermission?: boolean, skipPermissionCheck?: boolean}} [options] - Auth requirements.
 * @returns {Promise<{ok: true, auth: {session: Record<string, unknown>, headers: Headers}, data: unknown}|{ok: false, response: Response}>} Auth and parsed body, or failure response.
 */
export async function requireAdminJsonBody(context, options = {}) {
  const auth = await requireAdmin(context, options);
  if (!auth.ok) return auth;

  const parsedBody = await readJsonBody(context, auth);
  if (!parsedBody.ok) return parsedBody;

  return { ok: true, auth, data: parsedBody.data };
}

/**
 * Convert a failed GitHub API response into the common admin JSON error shape.
 *
 * @param {Response} response - Failed GitHub API response.
 * @param {string} fallback - Error message used when GitHub omits one.
 * @param {Headers} headers - Response headers carrying any refreshed session cookie.
 * @returns {Promise<Response>} JSON error response.
 */
export async function githubErrorResponse(response, fallback, headers) {
  const error = await response.json().catch(() => ({}));
  return jsonResponse(
    { success: false, error: error.message || fallback },
    { status: response.status, headers }
  );
}

function githubHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "website-melkior-admin",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

/**
 * Fetch GitHub's REST API with the admin OAuth token and a bounded timeout.
 *
 * @param {string} token - GitHub OAuth token.
 * @param {string} path - API path beginning with /.
 * @param {RequestInit} [init] - Fetch options.
 * @returns {Promise<Response>} GitHub API response.
 */
export async function githubFetch(token, path, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    return await fetch(`${GITHUB_API}${path}`, {
      ...init,
      headers: { ...githubHeaders(token), ...(init.headers || {}) },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Read the authenticated GitHub user's profile.
 *
 * @param {string} token - GitHub OAuth token.
 * @returns {Promise<Record<string, unknown>>} GitHub user payload.
 */
export async function getGithubUser(token) {
  const response = await githubFetch(token, "/user");
  if (!response.ok) throw new Error("Unable to read GitHub user.");
  const data = await response.json();
  if (!data.login) throw new Error("GitHub user response is missing login.");
  return data;
}

function permissionFromRepository(repository) {
  const permissions = repository?.permissions || {};
  if (permissions.admin === true) return "admin";
  if (permissions.maintain === true) return "maintain";
  if (permissions.push === true) return "write";
  return "";
}

function permissionFromCollaborator(data) {
  if (["admin", "maintain", "write"].includes(data?.permission)) return data.permission;
  const permissions = data?.user?.permissions || {};
  if (permissions.admin === true) return "admin";
  if (permissions.maintain === true) return "maintain";
  if (permissions.push === true) return "write";
  return "";
}

/**
 * Confirm the authenticated GitHub user can write to the configured content repository.
 *
 * @param {string} token - GitHub OAuth token.
 * @param {string} [login] - Login used for collaborator permission fallback.
 * @returns {Promise<{ok: true, permission: string}|{ok: false, status: number, error: string}>} Permission check result.
 */
export async function verifyRepoWriteAccess(token, login = "") {
  let status = 503;
  try {
    const repoResponse = await githubFetch(token, `/repos/${REPO_FULL_NAME}`);
    status = repoResponse.status;
    if (repoResponse.ok) {
      const repo = await repoResponse.json();
      const permission = permissionFromRepository(repo);
      if (permission) return { ok: true, permission };
    }
  } catch (error) {
    console.error("Repository permission lookup failed:", error);
  }

  if (login) {
    try {
      const collaboratorResponse = await githubFetch(
        token,
        `/repos/${REPO_FULL_NAME}/collaborators/${encodeURIComponent(login)}/permission`
      );
      status = collaboratorResponse.status;
      if (collaboratorResponse.ok) {
        const collaborator = await collaboratorResponse.json();
        const permission = permissionFromCollaborator(collaborator);
        if (permission) return { ok: true, permission };
      }
    } catch (error) {
      console.error("Collaborator permission lookup failed:", error);
      return { ok: false, status: 503, error: "Unable to verify repository permission." };
    }
  }

  if (status === 403 || status === 404) {
    return { ok: false, status: 403, error: "GitHub account does not have write access to this repository." };
  }
  return { ok: false, status: 503, error: "Unable to verify repository permission." };
}

function csrfError(context, session) {
  const request = context.request;
  const origin = request.headers.get("Origin");
  const expectedOrigin = new URL(request.url).origin;
  if (origin && origin !== expectedOrigin) return "Request origin is not allowed.";

  const fetchSite = request.headers.get("Sec-Fetch-Site");
  if (fetchSite && fetchSite !== "same-origin") return "Cross-site admin request blocked.";

  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.toLowerCase().includes("application/json")) return "Admin request must use application/json.";

  const token = request.headers.get("X-CSRF-Token") || "";
  if (!token || token !== session.csrf) return "Invalid CSRF token.";
  return "";
}

/**
 * Require a valid admin session, optional CSRF proof, and fresh repository write access.
 *
 * @param {{env: Record<string, string>, request: Request}} context - Pages/Worker handler context.
 * @param {{csrf?: boolean, freshPermission?: boolean, skipPermissionCheck?: boolean}} [options] - Auth requirements.
 * @returns {Promise<{ok: true, session: Record<string, unknown>, headers: Headers}|{ok: false, response: Response}>} Auth result.
 */
export async function requireAdmin(context, options = {}) {
  const sessionResult = await readSession(context.env, context.request);
  if (!sessionResult.ok) {
    const headers = new Headers();
    if (sessionResult.clear) headers.append("Set-Cookie", clearSessionCookie(context.request, context.env));
    return {
      ok: false,
      response: jsonResponse({ authenticated: false, error: sessionResult.error }, { status: sessionResult.status, headers }),
    };
  }

  const session = sessionResult.session;
  if (options.csrf) {
    const error = csrfError(context, session);
    if (error) return { ok: false, response: jsonResponse({ success: false, error }, { status: 403 }) };
  }

  const needsPermissionCheck =
    options.skipPermissionCheck !== true &&
    (options.freshPermission === true ||
      !session.permissionCheckedAt ||
      Date.now() - session.permissionCheckedAt > PERMISSION_CACHE_MS);

  const headers = new Headers();
  if (needsPermissionCheck) {
    const permission = await verifyRepoWriteAccess(session.githubToken, session.login);
    if (!permission.ok) {
      if (permission.status === 403 || permission.status === 404) headers.append("Set-Cookie", clearSessionCookie(context.request, context.env));
      return {
        ok: false,
        response: jsonResponse({ success: false, error: permission.error }, { status: permission.status || 503, headers }),
      };
    }
    session.permission = permission.permission;
    session.permissionCheckedAt = Date.now();
    headers.append("Set-Cookie", await createSessionCookie(context.env, context.request, session));
  }

  return { ok: true, session, headers };
}

/**
 * Create the admin session payload stored inside the encrypted cookie.
 *
 * @param {string} login - GitHub username.
 * @param {string} githubToken - GitHub OAuth token.
 * @param {string} permission - Repository permission label.
 * @returns {Record<string, unknown>} Session payload.
 */
export function createSession(login, githubToken, permission) {
  const now = Date.now();
  return {
    login,
    githubToken,
    permission,
    permissionCheckedAt: now,
    csrf: randomBase64Url(24),
    iat: now,
    exp: now + SESSION_MAX_AGE * 1000,
  };
}

/**
 * Build a GitHub contents API URL path for the configured repository.
 *
 * @param {string} path - Repository-relative content path.
 * @returns {string} GitHub API path.
 */
export function githubContentsUrl(path) {
  return `/repos/${REPO_FULL_NAME}/contents/${path}`;
}

/**
 * Build a GitHub contents API read path pinned to the configured branch.
 *
 * @param {string} path - Repository-relative content path.
 * @returns {string} GitHub API path with ref query.
 */
export function githubContentsQuery(path) {
  return `${githubContentsUrl(path)}?ref=${REPO_BRANCH}`;
}

/**
 * Return the branch the admin panel is allowed to mutate.
 *
 * @returns {string} Repository branch name.
 */
export function githubBranch() {
  return REPO_BRANCH;
}

/**
 * Check whether a GitHub image entry is a supported plain asset filename.
 *
 * @param {string} name - Candidate image filename.
 * @returns {boolean} Whether the filename is allowed.
 */
export function isAllowedImageName(name) {
  return typeof name === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$/.test(name) && /\.(webp|jpe?g|png|svg|ico)$/i.test(name);
}

/**
 * Validate and normalize an admin-managed image filename.
 *
 * @param {string} name - Candidate image filename.
 * @returns {{name: string, extension: string, path: string}} Normalized image metadata.
 */
export function validateImageName(name) {
  if (typeof name !== "string") throw new Error("Image name is required.");
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$/.test(name)) throw new Error("Image name contains invalid characters.");
  if (name.includes("..") || name.includes("/") || name.includes("\\")) throw new Error("Image name must be a plain file name.");
  const dot = name.lastIndexOf(".");
  if (dot <= 0 || dot === name.length - 1) throw new Error("Image extension is required.");
  const extension = name.slice(dot + 1).toLowerCase();
  const allowed = new Set(["webp", "jpg", "jpeg", "png", "svg", "ico"]);
  if (!allowed.has(extension)) throw new Error("Image extension is not allowed.");
  return { name, extension, path: `${IMAGES_PATH}/${name}` };
}

/**
 * Validate an uploaded image's name, size, file signature, and SVG safety.
 *
 * @param {string} name - Candidate image filename.
 * @param {string} contentBase64 - Base64 encoded file content.
 * @returns {{name: string, extension: string, path: string}} Normalized image metadata.
 */
export function validateImageUpload(name, contentBase64) {
  const image = validateImageName(name);
  if (typeof contentBase64 !== "string") throw new Error("Image content is required.");
  const bytes = base64ToBytes(contentBase64);
  if (bytes.byteLength === 0) throw new Error("Image file is empty.");
  if (bytes.byteLength > MAX_IMAGE_BYTES) throw new Error("Image file is too large.");

  if (image.extension === "svg") {
    validateSvg(decoder.decode(bytes));
  } else if (image.extension === "ico") {
    if (bytes[0] !== 0 || bytes[1] !== 0 || bytes[2] !== 1 || bytes[3] !== 0) throw new Error("ICO file is invalid.");
  } else if (image.extension === "png") {
    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (!png.every((value, index) => bytes[index] === value)) throw new Error("PNG file is invalid.");
  } else if (image.extension === "jpg" || image.extension === "jpeg") {
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) throw new Error("JPEG file is invalid.");
  } else if (image.extension === "webp") {
    if (decoder.decode(bytes.slice(0, 4)) !== "RIFF" || decoder.decode(bytes.slice(8, 12)) !== "WEBP") {
      throw new Error("WebP file is invalid.");
    }
  }
  return image;
}

function validateSvg(text) {
  const trimmed = text.trim();
  if (!/^(<\?xml[^>]*>\s*)?<svg[\s>]/i.test(trimmed)) throw new Error("SVG file must start with an svg element.");
  const forbidden = [
    /<!doctype/i,
    /<!entity/i,
    /<script[\s>]/i,
    /<foreignobject[\s>]/i,
    /<iframe[\s>]/i,
    /<object[\s>]/i,
    /<embed[\s>]/i,
    /<link[\s>]/i,
    /<image[\s>]/i,
    /\son[a-z]+\s*=/i,
    /javascript\s*:/i,
    /data\s*:\s*text\/html/i,
    /\b(?:href|xlink:href)\s*=/i,
  ];
  if (forbidden.some((pattern) => pattern.test(text))) throw new Error("SVG file contains unsafe markup.");
}

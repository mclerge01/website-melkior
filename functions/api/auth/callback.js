import {
  addSetCookies,
  adminPublicUrl,
  clearOauthCookies,
  createSession,
  createSessionCookie,
  getGithubUser,
  readOauthChallenge,
  verifyRepoWriteAccess,
} from "../../../lib/admin-auth.mjs";

/**
 * Redirect back to the admin UI with an OAuth error code.
 *
 * @param {{request: Request, env: Record<string, string>}} context - Pages/Worker handler context.
 * @param {string} error - Admin UI error code.
 * @param {string[]} [cookies] - Cookies to clear on the redirect.
 * @returns {Response} Redirect response.
 */
function redirectWithError(context, error, cookies = []) {
  const url = new URL(adminPublicUrl(context.env, context.request, "/admin/"));
  url.searchParams.set("error", error);
  const headers = addSetCookies(new Headers({ Location: url.toString() }), cookies);
  return new Response(null, { status: 302, headers });
}

/**
 * Return a safe, non-secret GitHub OAuth token error summary for logs.
 *
 * @param {Response} response - GitHub token endpoint response.
 * @param {Record<string, unknown>} tokenData - Parsed token response body.
 * @param {string} redirectUri - Redirect URI sent to GitHub.
 * @returns {{status: number, error: string, description: string, redirectUri: string}} Log-safe error details.
 */
function tokenErrorDetails(response, tokenData, redirectUri) {
  return {
    status: response.status,
    error: typeof tokenData.error === "string" ? tokenData.error.slice(0, 80) : "",
    description: typeof tokenData.error_description === "string" ? tokenData.error_description.slice(0, 160) : "",
    redirectUri,
  };
}

/**
 * Map GitHub token endpoint errors to admin UI error codes.
 *
 * @param {Record<string, unknown>} tokenData - Parsed token response body.
 * @returns {string} Admin UI error code.
 */
function tokenErrorCode(tokenData) {
  if (tokenData.error === "redirect_uri_mismatch") return "oauth_redirect_mismatch";
  return tokenData.error === "bad_verification_code" ? "token_code_invalid" : "token_exchange_failed";
}

/**
 * Complete GitHub OAuth, verify repo access, and create an admin session.
 *
 * @param {{request: Request, env: Record<string, string>}} context - Pages/Worker handler context.
 * @returns {Promise<Response>} Redirect back to the admin UI.
 */
export async function onRequestGet(context) {
  const request = context.request;
  const url = new URL(request.url);
  const code = url.searchParams.get("code") || "";
  const returnedState = url.searchParams.get("state") || "";
  const challenge = readOauthChallenge(request);
  const clearCookies = clearOauthCookies(request, context.env);

  if (!code || !returnedState || !challenge.state || returnedState !== challenge.state || !challenge.verifier) {
    return redirectWithError(context, "invalid_state", clearCookies);
  }

  const clientId = context.env.GITHUB_CLIENT_ID;
  const clientSecret = context.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) return redirectWithError(context, "oauth_not_configured", clearCookies);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  let tokenResponse;
  let tokenData = {};
  const redirectUri = adminPublicUrl(context.env, request, "/api/auth/callback");
  try {
    tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        code_verifier: challenge.verifier,
      }),
      signal: controller.signal,
    });
    tokenData = await tokenResponse.json().catch(() => ({}));
  } catch (error) {
    console.error("GitHub token exchange failed:", error);
    return redirectWithError(context, "token_exchange_failed", clearCookies);
  } finally {
    clearTimeout(timeout);
  }

  if (!tokenResponse.ok || typeof tokenData.access_token !== "string" || !tokenData.access_token) {
    console.error("GitHub token exchange rejected:", tokenErrorDetails(tokenResponse, tokenData, redirectUri));
    return redirectWithError(context, tokenErrorCode(tokenData), clearCookies);
  }

  try {
    const user = await getGithubUser(tokenData.access_token);
    const permission = await verifyRepoWriteAccess(tokenData.access_token, user.login);
    if (!permission.ok) return redirectWithError(context, "not_contributor", clearCookies);

    const session = createSession(user.login, tokenData.access_token, permission.permission);
    const sessionCookie = await createSessionCookie(context.env, request, session);
    const headers = addSetCookies(new Headers({ Location: adminPublicUrl(context.env, request, "/admin/") }), [
      ...clearCookies,
      sessionCookie,
    ]);
    return new Response(null, { status: 302, headers });
  } catch (error) {
    console.error("OAuth callback error:", error);
    return redirectWithError(context, "login_failed", clearCookies);
  }
}

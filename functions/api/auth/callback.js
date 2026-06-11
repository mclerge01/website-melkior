import {
  addSetCookies,
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
 * @param {Request} request - OAuth callback request.
 * @param {string} error - Admin UI error code.
 * @param {string[]} [cookies] - Cookies to clear on the redirect.
 * @returns {Response} Redirect response.
 */
function redirectWithError(request, error, cookies = []) {
  const url = new URL("/admin/", request.url);
  url.searchParams.set("error", error);
  const headers = addSetCookies(new Headers({ Location: url.toString() }), cookies);
  return new Response(null, { status: 302, headers });
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
  const clearCookies = clearOauthCookies(request);

  if (!code || !returnedState || !challenge.state || returnedState !== challenge.state || !challenge.verifier) {
    return redirectWithError(request, "invalid_state", clearCookies);
  }

  const clientId = context.env.GITHUB_CLIENT_ID;
  const clientSecret = context.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) return redirectWithError(request, "oauth_not_configured", clearCookies);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  let tokenResponse;
  let tokenData = {};
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
        redirect_uri: new URL("/api/auth/callback", request.url).toString(),
        code_verifier: challenge.verifier,
      }),
      signal: controller.signal,
    });
    tokenData = await tokenResponse.json().catch(() => ({}));
  } catch (error) {
    console.error("GitHub token exchange failed:", error);
    return redirectWithError(request, "token_exchange_failed", clearCookies);
  } finally {
    clearTimeout(timeout);
  }

  if (!tokenResponse.ok || typeof tokenData.access_token !== "string" || !tokenData.access_token) {
    return redirectWithError(request, "token_exchange_failed", clearCookies);
  }

  try {
    const user = await getGithubUser(tokenData.access_token);
    const permission = await verifyRepoWriteAccess(tokenData.access_token, user.login);
    if (!permission.ok) return redirectWithError(request, "not_contributor", clearCookies);

    const session = createSession(user.login, tokenData.access_token, permission.permission);
    const sessionCookie = await createSessionCookie(context.env, request, session);
    const headers = addSetCookies(new Headers({ Location: new URL("/admin/", request.url).toString() }), [
      ...clearCookies,
      sessionCookie,
    ]);
    return new Response(null, { status: 302, headers });
  } catch (error) {
    console.error("OAuth callback error:", error);
    return redirectWithError(request, "login_failed", clearCookies);
  }
}

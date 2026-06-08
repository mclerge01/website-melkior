import {
  addSetCookies,
  clearOauthCookies,
  createSession,
  createSessionCookie,
  getGithubUser,
  readOauthChallenge,
  verifyRepoWriteAccess,
} from "../../../lib/admin-auth.mjs";

function redirectWithError(request, error, cookies = []) {
  const url = new URL("/admin/", request.url);
  url.searchParams.set("error", error);
  const headers = addSetCookies(new Headers({ Location: url.toString() }), cookies);
  return new Response(null, { status: 302, headers });
}

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

  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
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
  });

  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenData.access_token) return redirectWithError(request, "token_exchange_failed", clearCookies);

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

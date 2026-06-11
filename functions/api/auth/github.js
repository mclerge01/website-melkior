import { addSetCookies, createOauthChallenge, jsonResponse } from "../../../lib/admin-auth.mjs";

export async function onRequestGet(context) {
  const clientId = context.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return jsonResponse({ success: false, error: "GITHUB_CLIENT_ID is not configured." }, { status: 500 });
  }

  const challenge = await createOauthChallenge(context.request);
  const redirectUri = new URL("/api/auth/callback", context.request.url).toString();
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", challenge.state);
  url.searchParams.set("code_challenge", challenge.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("scope", "public_repo");

  const headers = addSetCookies(new Headers({ Location: url.toString() }), challenge.cookies);
  return new Response(null, { status: 302, headers });
}

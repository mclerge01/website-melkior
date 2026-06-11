import {
  CONTENT_PATH,
  base64ToText,
  githubBranch,
  githubContentsQuery,
  githubContentsUrl,
  githubErrorResponse,
  githubFetch,
  jsonResponse,
  requireAdmin,
  requireAdminJsonBody,
  textToBase64,
} from "../../../lib/admin-auth.mjs";

/**
 * Return the current editable site content from GitHub.
 *
 * @param {{request: Request, env: Record<string, unknown>}} context - Pages/Worker handler context.
 * @returns {Promise<Response>} JSON content payload.
 */
export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;

  const response = await githubFetch(auth.session.githubToken, githubContentsQuery(CONTENT_PATH));
  if (!response.ok) {
    return jsonResponse({ success: false, error: "Unable to load content." }, { status: response.status, headers: auth.headers });
  }

  const file = await response.json();
  return jsonResponse({ content: JSON.parse(base64ToText(file.content)), sha: file.sha }, { headers: auth.headers });
}

/**
 * Commit updated site content to GitHub after admin and CSRF checks.
 *
 * @param {{request: Request, env: Record<string, unknown>}} context - Pages/Worker handler context.
 * @returns {Promise<Response>} JSON update result.
 */
export async function onRequestPut(context) {
  const adminRequest = await requireAdminJsonBody(context, { csrf: true, freshPermission: true });
  if (!adminRequest.ok) return adminRequest.response;
  const { auth, data } = adminRequest;

  if (!data?.content || typeof data.content !== "object") {
    return jsonResponse({ success: false, error: "Content object is required." }, { status: 400, headers: auth.headers });
  }
  if (!data.sha || typeof data.sha !== "string") {
    return jsonResponse({ success: false, error: "Current content SHA is required." }, { status: 400, headers: auth.headers });
  }

  const response = await githubFetch(auth.session.githubToken, githubContentsUrl(CONTENT_PATH), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "admin: update bilingual content",
      content: textToBase64(`${JSON.stringify(data.content, null, 2)}\n`),
      sha: data.sha,
      branch: githubBranch(),
    }),
  });

  if (!response.ok) {
    return githubErrorResponse(response, "Unable to update content.", auth.headers);
  }

  const result = await response.json();
  return jsonResponse({ success: true, sha: result.content?.sha || "" }, { headers: auth.headers });
}

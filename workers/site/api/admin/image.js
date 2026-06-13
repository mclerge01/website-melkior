import {
  githubBranch,
  githubContentsQuery,
  githubContentsUrl,
  githubErrorResponse,
  githubFetch,
  jsonResponse,
  requireAdmin,
  requireAdminJsonBody,
  validateImageName,
  validateImageUpload,
} from "../../../../lib/admin-auth.mjs";

/**
 * Validate and upload an admin-managed image to GitHub.
 *
 * @param {{request: Request, env: Record<string, unknown>}} context - Worker route handler context.
 * @returns {Promise<Response>} JSON upload result.
 */
export async function onRequestPut(context) {
  const adminRequest = await requireAdminJsonBody(context, { csrf: true, freshPermission: true });
  if (!adminRequest.ok) return adminRequest.response;
  const { auth, data } = adminRequest;

  let image;
  try {
    image = validateImageUpload(data?.name, data?.contentBase64);
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, { status: 400, headers: auth.headers });
  }

  const existingResponse = await githubFetch(auth.session.githubToken, githubContentsQuery(image.path));
  if (!existingResponse.ok && existingResponse.status !== 404) {
    return jsonResponse({ success: false, error: "Unable to check existing image." }, { status: existingResponse.status, headers: auth.headers });
  }
  const existing = existingResponse.ok ? await existingResponse.json() : null;

  const body = {
    message: `admin: upload ${image.name}`,
    content: data.contentBase64,
    branch: githubBranch(),
  };
  if (existing?.sha) body.sha = existing.sha;

  const response = await githubFetch(auth.session.githubToken, githubContentsUrl(image.path), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    return githubErrorResponse(response, "Unable to upload image.", auth.headers);
  }

  const upload = await response.json();
  return jsonResponse({ success: true, path: image.path, sha: upload.content?.sha || "" }, { headers: auth.headers });
}

/**
 * Delete an admin-managed image from GitHub by name and SHA.
 *
 * @param {{request: Request, env: Record<string, unknown>}} context - Worker route handler context.
 * @returns {Promise<Response>} JSON deletion result.
 */
export async function onRequestDelete(context) {
  const adminRequest = await requireAdminJsonBody(context, { csrf: true, freshPermission: true });
  if (!adminRequest.ok) return adminRequest.response;
  const { auth, data } = adminRequest;

  let image;
  try {
    image = validateImageName(data?.name);
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, { status: 400, headers: auth.headers });
  }
  if (!data.sha || typeof data.sha !== "string") {
    return jsonResponse({ success: false, error: "Image SHA is required." }, { status: 400, headers: auth.headers });
  }

  const response = await githubFetch(auth.session.githubToken, githubContentsUrl(image.path), {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `admin: remove ${image.name}`,
      sha: data.sha,
      branch: githubBranch(),
    }),
  });

  if (!response.ok) {
    return githubErrorResponse(response, "Unable to delete image.", auth.headers);
  }

  return jsonResponse({ success: true }, { headers: auth.headers });
}

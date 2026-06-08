import {
  githubBranch,
  githubContentsQuery,
  githubContentsUrl,
  githubFetch,
  jsonResponse,
  requireAdmin,
  validateImageName,
  validateImageUpload,
} from "../../../lib/admin-auth.mjs";

export async function onRequestPut(context) {
  const auth = await requireAdmin(context, { csrf: true, freshPermission: true });
  if (!auth.ok) return auth.response;

  let data;
  try {
    data = await context.request.json();
  } catch {
    return jsonResponse({ success: false, error: "Invalid JSON body." }, { status: 400, headers: auth.headers });
  }

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
    const error = await response.json().catch(() => ({}));
    return jsonResponse({ success: false, error: error.message || "Unable to upload image." }, { status: response.status, headers: auth.headers });
  }

  const result = await response.json();
  return jsonResponse({ success: true, path: image.path, sha: result.content?.sha || "" }, { headers: auth.headers });
}

export async function onRequestDelete(context) {
  const auth = await requireAdmin(context, { csrf: true, freshPermission: true });
  if (!auth.ok) return auth.response;

  let data;
  try {
    data = await context.request.json();
  } catch {
    return jsonResponse({ success: false, error: "Invalid JSON body." }, { status: 400, headers: auth.headers });
  }

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
    const error = await response.json().catch(() => ({}));
    return jsonResponse({ success: false, error: error.message || "Unable to delete image." }, { status: response.status, headers: auth.headers });
  }

  return jsonResponse({ success: true }, { headers: auth.headers });
}

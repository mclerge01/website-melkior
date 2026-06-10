import { IMAGES_PATH, githubContentsQuery, githubFetch, isAllowedImageName, jsonResponse, requireAdmin } from "../../../lib/admin-auth.mjs";

export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;

  const response = await githubFetch(auth.session.githubToken, githubContentsQuery(IMAGES_PATH));
  if (response.status === 404) return jsonResponse({ images: [] }, { headers: auth.headers });
  if (!response.ok) {
    return jsonResponse({ success: false, error: "Unable to list images." }, { status: response.status, headers: auth.headers });
  }

  const items = await response.json();
  const images = Array.isArray(items)
    ? items.filter((item) => item.type === "file" && isAllowedImageName(item.name)).map((item) => ({
        name: item.name,
        path: item.path,
        sha: item.sha,
        size: item.size,
        download_url: item.download_url,
      }))
    : [];
  return jsonResponse({ images }, { headers: auth.headers });
}

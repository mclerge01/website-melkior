import { clearSessionCookie, jsonResponse, requireAdmin } from "../../../lib/admin-auth.mjs";

export async function onRequestPost(context) {
  const auth = await requireAdmin(context, { csrf: true, skipPermissionCheck: true });
  if (!auth.ok) return auth.response;

  return jsonResponse(
    { success: true },
    { headers: { "Set-Cookie": clearSessionCookie(context.request) } }
  );
}

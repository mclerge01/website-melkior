import { clearSessionCookie, jsonResponse, requireAdmin } from "../../../lib/admin-auth.mjs";

/**
 * Clear the authenticated admin session after CSRF validation.
 *
 * @param {{request: Request, env: Record<string, string>}} context - Pages/Worker handler context.
 * @returns {Promise<Response>} JSON logout result.
 */
export async function onRequestPost(context) {
  const auth = await requireAdmin(context, { csrf: true, skipPermissionCheck: true });
  if (!auth.ok) return auth.response;

  return jsonResponse(
    { success: true },
    { headers: { "Set-Cookie": clearSessionCookie(context.request, context.env) } }
  );
}

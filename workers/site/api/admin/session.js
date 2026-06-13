import { jsonResponse, requireAdmin } from "../../../../lib/admin-auth.mjs";

/**
 * Return the current authenticated admin session metadata.
 *
 * @param {{request: Request, env: Record<string, unknown>}} context - Worker route handler context.
 * @returns {Promise<Response>} JSON session payload.
 */
export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;
  return jsonResponse(
    {
      authenticated: true,
      login: auth.session.login,
      permission: auth.session.permission,
      csrfToken: auth.session.csrf,
    },
    { headers: auth.headers }
  );
}

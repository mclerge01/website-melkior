import { jsonResponse, requireAdmin } from "../../../lib/admin-auth.mjs";

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

import { clearSessionCookie, jsonResponse } from "../../../lib/admin-auth.mjs";

export async function onRequestPost(context) {
  return jsonResponse(
    { success: true },
    { headers: { "Set-Cookie": clearSessionCookie(context.request) } }
  );
}

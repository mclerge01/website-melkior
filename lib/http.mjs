/**
 * Return a JSON response with a stable UTF-8 content type.
 *
 * @param {unknown} body - Serializable payload for the response body.
 * @param {ResponseInit|number} [init] - Response init object, or a status code for short call sites.
 * @returns {Response} A JSON response.
 */
export function jsonResponse(body, init = {}) {
  const responseInit = typeof init === "number" ? { status: init } : init;
  const headers = new Headers(responseInit.headers || {});
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { ...responseInit, headers });
}

/**
 * Return an HTML response with a stable UTF-8 content type.
 *
 * @param {string} body - HTML body.
 * @param {ResponseInit} [init] - Response init object.
 * @returns {Response} An HTML response.
 */
export function htmlResponse(body, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "text/html; charset=utf-8");
  return new Response(body, { ...init, headers });
}

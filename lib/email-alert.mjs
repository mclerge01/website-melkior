const WEBHOOK_TIMEOUT_MS = 5000;

/**
 * Extract only the domain portion of an email address for safe logging.
 *
 * @param {string} value - Email address.
 * @returns {string} Domain suffix or an empty string.
 */
export function emailDomain(value) {
  return String(value || "").split("@").pop() || "";
}

/**
 * Convert an unknown thrown value into a concise log-safe error string.
 *
 * @param {unknown} error - Thrown value.
 * @returns {string} Human-readable error summary.
 */
export function errorSummary(error) {
  if (!error) return "Unknown error";
  if (error instanceof Error) return error.message || error.name;
  return String(error);
}

/**
 * Notify an optional HTTPS webhook when the contact email path fails.
 *
 * @param {Record<string, string>} env - Worker environment with optional EMAIL_FAILURE_WEBHOOK_URL.
 * @param {Record<string, unknown>} failure - Structured failure metadata safe for logs/webhooks.
 * @param {string} message - Human-readable alert text.
 * @returns {Promise<void>} Resolves after the webhook attempt or a no-op.
 */
export async function notifyEmailFailure(env, failure, message) {
  const webhookUrl = String(env.EMAIL_FAILURE_WEBHOOK_URL || "").trim();
  if (!webhookUrl) return;

  let url;
  try {
    url = new URL(webhookUrl);
    if (url.protocol !== "https:") throw new Error("Webhook URL must use HTTPS");
  } catch (error) {
    console.error({ event: "email_failure_webhook_invalid", error: errorSummary(error) });
    return;
  }

  const text = message || "Melkior contact email failed. Check Cloudflare Workers Logs for the structured failure event.";
  try {
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        content: text,
        ...failure,
      }),
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });
    if (!response.ok) {
      console.error({ event: "email_failure_webhook_failed", status: response.status });
    }
  } catch (error) {
    console.error({ event: "email_failure_webhook_error", error: errorSummary(error) });
  }
}

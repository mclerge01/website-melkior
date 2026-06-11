const WEBHOOK_TIMEOUT_MS = 5000;

export function emailDomain(value) {
  return String(value || "").split("@").pop() || "";
}

export function errorSummary(error) {
  if (!error) return "Unknown error";
  if (error instanceof Error) return error.message || error.name;
  return String(error);
}

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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
  try {
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        content: text,
        ...failure,
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      console.error({ event: "email_failure_webhook_failed", status: response.status });
    }
  } catch (error) {
    console.error({ event: "email_failure_webhook_error", error: errorSummary(error) });
  } finally {
    clearTimeout(timeout);
  }
}

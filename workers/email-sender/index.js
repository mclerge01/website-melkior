import { EmailMessage } from "cloudflare:email";
import { emailDomain, errorSummary, notifyEmailFailure } from "../../lib/email-alert.mjs";
import { jsonResponse } from "../../lib/http.mjs";

/**
 * Deliver a raw MIME email through Cloudflare Email Sending and alert on failure.
 *
 * @param {{SEND_EMAIL: {send: Function}} & Record<string, unknown>} env - Email Worker environment.
 * @param {{from: string, to: string, raw: string}} payload - Sender, recipient, and raw MIME message.
 * @returns {Promise<void>} Resolves after Email Sending accepts the message.
 */
async function deliverEmail(env, payload) {
  const { from, to, raw } = payload;
  const metadata = {
    from_domain: emailDomain(from),
    to_domain: emailDomain(to),
    raw_bytes: raw.length,
  };

  try {
    await env.SEND_EMAIL.send(new EmailMessage(from, to, raw));
    console.log({ event: "email_sent", ...metadata });
  } catch (error) {
    const failure = { event: "email_delivery_failed", ...metadata, error: errorSummary(error) };
    console.error(failure);
    await notifyEmailFailure(
      env,
      failure,
      "Melkior contact email failed in the email-sender Worker. Check Cloudflare Workers Logs for event=email_delivery_failed."
    );
    throw error;
  }
}

export default {
  /**
   * Accept email handoffs and schedule delivery in the background.
   *
   * @param {Request} request - Service binding request from the main Worker.
   * @param {Record<string, unknown>} env - Worker environment.
   * @param {{waitUntil?: Function}} ctx - Worker execution context.
   * @returns {Promise<Response>} Immediate acceptance or validation error response.
   */
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ success: false, error: "Invalid payload" }, 400);
    }

    const { from, to, raw } = payload;
    if (typeof from !== "string" || typeof to !== "string" || typeof raw !== "string" || !from || !to || !raw) {
      return jsonResponse({ success: false, error: "Missing email fields" }, 400);
    }

    const delivery = deliverEmail(env, { from, to, raw });
    if (ctx?.waitUntil) {
      ctx.waitUntil(delivery);
    } else {
      await delivery;
    }

    return jsonResponse({ success: true, accepted: true });
  },
};

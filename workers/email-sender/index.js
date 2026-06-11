import { EmailMessage } from "cloudflare:email";
import { emailDomain, errorSummary, notifyEmailFailure } from "../../lib/email-alert.mjs";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

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

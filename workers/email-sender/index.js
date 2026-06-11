import { EmailMessage } from "cloudflare:email";

function emailDomain(value) {
  return String(value || "").split("@").pop() || "";
}

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return new Response(JSON.stringify({ success: false, error: "Invalid payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { from, to, raw } = payload;
    if (!from || !to || !raw) {
      return new Response(JSON.stringify({ success: false, error: "Missing email fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      await env.SEND_EMAIL.send(new EmailMessage(from, to, raw));
      console.log({
        event: "email_sent",
        from_domain: emailDomain(from),
        to_domain: emailDomain(to),
        raw_bytes: raw.length,
      });
    } catch (error) {
      console.error("Email delivery failed:", error);
      return new Response(JSON.stringify({ success: false, error: "Email delivery failed" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  },
};

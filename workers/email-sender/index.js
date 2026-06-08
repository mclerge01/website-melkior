import { EmailMessage } from "cloudflare:email";

export default {
  async fetch(request, env, ctx) {
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

    ctx.waitUntil(
      (async () => {
        try {
          await env.SEND_EMAIL.send(new EmailMessage(from, to, raw));
        } catch (error) {
          console.error("Email delivery failed:", error);
        }
      })()
    );

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  },
};

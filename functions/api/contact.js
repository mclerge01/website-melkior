import { emailDomain, errorSummary, notifyEmailFailure } from "../../lib/email-alert.mjs";
import { jsonResponse } from "../../lib/http.mjs";
import { formatContactPhoneNumber, getValidContactPhoneNumber } from "../../lib/phone.mjs";

const MESSAGES = {
  "fr-CA": {
    invalidBody: "Le corps de la requête est invalide.",
    name: "Le champ nom est requis.",
    email: "Le champ courriel est requis.",
    emailInvalid: "L'adresse courriel est invalide.",
    phone: "Le champ téléphone est requis.",
    phoneInvalid: "Le numéro de téléphone est invalide.",
    subject: "Le champ sujet est requis.",
    message: "Le champ message est requis.",
    turnstile: "La vérification Turnstile est requise.",
    turnstileFailed: "La vérification Turnstile a échoué. Veuillez réessayer.",
    config: "La configuration courriel du serveur est manquante.",
    internal: "Une erreur interne est survenue. Veuillez réessayer plus tard.",
    success: "Votre message a bien été envoyé.",
    emailTitle: "Nouveau message via le formulaire de contact",
    received: "Reçu le",
  },
  "en-CA": {
    invalidBody: "The request body is invalid.",
    name: "Name is required.",
    email: "Email is required.",
    emailInvalid: "Email address is invalid.",
    phone: "Phone number is required.",
    phoneInvalid: "Phone number is invalid.",
    subject: "Subject is required.",
    message: "Message is required.",
    turnstile: "Turnstile verification is required.",
    turnstileFailed: "Turnstile verification failed. Please try again.",
    config: "Server email configuration is missing.",
    internal: "An internal error occurred. Please try again later.",
    success: "Your message has been sent.",
    emailTitle: "New message from the contact form",
    received: "Received on",
  },
};

function normalizeLocale(locale) {
  return locale === "en-CA" ? "en-CA" : "fr-CA";
}

function sanitize(value, maxLength = 2000, preserveLines = false) {
  if (typeof value !== "string") return "";
  const withoutTags = value.replace(/<[^>]*>/g, "");
  const normalized = preserveLines
    ? withoutTags.replace(/\r\n?/g, "\n").replace(/[^\S\n]+/g, " ")
    : withoutTags.replace(/\s+/g, " ");
  return normalized.trim().slice(0, maxLength);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isLocalDevelopmentRequest(request) {
  const hostname = new URL(request.url).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function errorResponse(error, status = 400) {
  return jsonResponse({ success: false, error }, status);
}

function base64Utf8(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/**
 * Hand off the prepared MIME message to the email Worker service binding.
 *
 * @param {{env: Record<string, unknown>}} context - Pages/Worker handler context.
 * @param {{from: string, to: string, raw: string}} payload - Email sender, recipient, and raw MIME body.
 * @param {Record<string, unknown>} metadata - Log-safe contact form metadata.
 * @returns {Promise<void>} Resolves when the email Worker accepts the handoff.
 */
async function dispatchContactEmail(context, payload, metadata) {
  try {
    const response = await context.env.EMAIL_WORKER.fetch("https://email-worker/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`Email worker rejected message with status ${response.status}`);
    console.log({ event: "contact_email_handoff", ...metadata });
  } catch (error) {
    const failure = {
      event: "contact_email_handoff_failed",
      from_domain: emailDomain(payload.from),
      to_domain: emailDomain(payload.to),
      raw_bytes: payload.raw.length,
      error: errorSummary(error),
      ...metadata,
    };
    console.error(failure);
    await notifyEmailFailure(
      context.env,
      failure,
      "Melkior contact email handoff or forwarding failed. Check Cloudflare Workers Logs for event=contact_email_handoff_failed."
    );
    throw error;
  }
}

/**
 * Build the raw multipart MIME message sent through Cloudflare Email Sending.
 *
 * @param {{from: string, to: string, replyTo: string, subject: string, body: string}} message - Email fields.
 * @returns {string} Raw RFC 5322/MIME message.
 */
function createMimeMessage({ from, to, replyTo, subject, body }) {
  const boundary = `----=_Melkior_${Date.now().toString(36)}`;
  const headers = [
    `From: Formulaire Melkior <${from}>`,
    `To: ${to}`,
    replyTo ? `Reply-To: ${replyTo}` : "",
    `Subject: =?UTF-8?B?${base64Utf8(subject)}?=`,
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ].filter(Boolean).join("\r\n");

  const html = body
    .split("\n")
    .map((line) => {
      const safe = line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      if (!safe) return "<br>";
      if (safe.startsWith("---")) return "<hr>";
      if (safe.startsWith("  ")) return `<p style="margin:0 0 6px 16px">${safe.trim()}</p>`;
      return `<p style="margin:0 0 8px 0"><strong>${safe}</strong></p>`;
    })
    .join("\n");

  const plainPart = [
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    body,
  ].join("\r\n");

  const htmlPart = [
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;color:#181818">${html}</body></html>`,
  ].join("\r\n");

  return [headers, "", plainPart, htmlPart, `--${boundary}--`].join("\r\n");
}

/**
 * Respond to CORS/preflight probes for the contact endpoint.
 *
 * @returns {Response} Empty OPTIONS response.
 */
export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { Allow: "POST, OPTIONS" } });
}

/**
 * Validate a contact submission, verify Turnstile, and queue email handoff.
 *
 * @param {{request: Request, env: Record<string, unknown>, waitUntil?: Function}} context - Pages/Worker handler context.
 * @returns {Promise<Response>} JSON contact form result.
 */
export async function onRequestPost(context) {
  let data;
  try {
    data = await context.request.json();
  } catch {
    return errorResponse(MESSAGES["fr-CA"].invalidBody);
  }

  const locale = normalizeLocale(sanitize(data.locale, 10));
  const msg = MESSAGES[locale];

  if (data.bot_field) return jsonResponse({ success: true, message: msg.success });

  const name = sanitize(data.name, 120);
  const email = sanitize(data.email, 254).toLowerCase();
  const phone = sanitize(data.phone || "", 40);
  const subject = sanitize(data.subject, 120);
  const referral = sanitize(data.referral || "", 120);
  const message = sanitize(data.message, 5000, true);
  const turnstileToken = sanitize(data["cf-turnstile-response"] || data.turnstileToken || "", 2048);

  if (!name) return errorResponse(msg.name);
  if (!email) return errorResponse(msg.email);
  if (!isValidEmail(email)) return errorResponse(msg.emailInvalid);
  if (!phone) return errorResponse(msg.phone);
  if (!getValidContactPhoneNumber(phone)) return errorResponse(msg.phoneInvalid);
  if (!subject) return errorResponse(msg.subject);
  if (!message) return errorResponse(msg.message);
  if (!turnstileToken) return errorResponse(msg.turnstile, 403);
  const formattedPhone = formatContactPhoneNumber(phone);

  if (!context.env.TURNSTILE_SECRET) return errorResponse(msg.config, 500);

  let turnstileData;
  try {
    const turnstileRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: context.env.TURNSTILE_SECRET,
        response: turnstileToken,
        remoteip: context.request.headers.get("CF-Connecting-IP"),
      }),
    });
    if (!turnstileRes.ok) return errorResponse(msg.turnstileFailed, 403);
    turnstileData = await turnstileRes.json();
  } catch (error) {
    console.error("Turnstile verification error:", error);
    return errorResponse(msg.internal, 500);
  }
  if (!turnstileData.success) return errorResponse(msg.turnstileFailed, 403);

  const fromEmail = context.env.CONTACT_EMAIL;
  const toEmail = context.env.CONTACT_DESTINATION;
  if (!fromEmail || !toEmail) return errorResponse(msg.config, 500);

  const timestamp = new Date().toLocaleString(locale === "fr-CA" ? "fr-CA" : "en-CA", {
    timeZone: "America/Toronto",
    dateStyle: "full",
    timeStyle: "short",
  });

  const body = [
    msg.emailTitle,
    "----------------------------------------------",
    "",
    `  Locale : ${locale}`,
    `  Nom / Name : ${name}`,
    `  Email : ${email}`,
    `  Téléphone / Phone : ${formattedPhone}`,
    `  Sujet / Subject : ${subject}`,
    referral ? `  Source : ${referral}` : null,
    "",
    "----------------------------------------------",
    "Message :",
    "",
    `  ${message}`,
    "",
    "----------------------------------------------",
    `${msg.received} ${timestamp}`,
  ].filter(Boolean).join("\n");

  const raw = createMimeMessage({
    from: fromEmail,
    to: toEmail,
    replyTo: email,
    subject: `${msg.emailTitle} - ${name}`,
    body,
  });

  try {
    if (context.env.EMAIL_WORKER) {
      const handoff = dispatchContactEmail(
        context,
        { from: fromEmail, to: toEmail, raw },
        {
          locale,
          subject,
          referral: referral || "not_provided",
          message_length: message.length,
        }
      );
      if (context.waitUntil) {
        context.waitUntil(handoff);
      } else {
        await handoff;
      }
    } else if (isLocalDevelopmentRequest(context.request)) {
      console.log("Contact form dev mode:", {
        locale,
        subject,
        referral: referral || "not_provided",
        hasPhone: Boolean(formattedPhone),
        emailDomain: email.includes("@") ? email.split("@").pop() : "",
        messageLength: message.length,
      });
    } else {
      return errorResponse(msg.config, 500);
    }
  } catch (error) {
    console.error("Contact email error:", error);
    return errorResponse(msg.internal, 500);
  }

  return jsonResponse({ success: true, message: msg.success });
}

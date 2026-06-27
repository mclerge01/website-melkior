import { EmailMessage } from "cloudflare:email";
import { CONTACT_FORM_FROM_EMAIL } from "../../../lib/email-config.mjs";
import { recordContactFormFailure } from "../../../lib/contact-health.mjs";
import { emailDomain, errorSummary, notifyEmailFailure } from "../../../lib/email-alert.mjs";
import { jsonResponse } from "../../../lib/http.mjs";
import { createMultipartEmail } from "../../../lib/mime-email.mjs";
import { formatContactPhoneNumber, getValidContactPhoneNumber } from "../../../lib/phone.mjs";

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

function contactLogMetadata({ locale, subject, referral, message }) {
  return {
    locale,
    subject_length: subject.length,
    referral_provided: Boolean(referral),
    message_length: message.length,
  };
}

function trackContactFormFailure(context, failure) {
  context.waitUntil(recordContactFormFailure(context.env, failure));
}

/**
 * Send the prepared MIME message through Cloudflare Email Sending.
 *
 * @param {{env: Record<string, unknown>}} context - Worker handler context.
 * @param {{from: string, to: string, raw: string}} payload - Email sender, recipient, and raw MIME body.
 * @param {Record<string, unknown>} metadata - Log-safe contact form metadata.
 * @returns {Promise<void>} Resolves after Email Sending accepts the message.
 */
async function deliverContactEmail(context, payload, metadata) {
  const deliveryMetadata = {
    from_domain: emailDomain(payload.from),
    to_domain: emailDomain(payload.to),
    raw_bytes: payload.raw.length,
    ...metadata,
  };

  try {
    await context.env.SEND_EMAIL.send(new EmailMessage(payload.from, payload.to, payload.raw));
    console.log({ event: "contact_email_sent", ...deliveryMetadata });
  } catch (error) {
    const failure = {
      event: "contact_email_delivery_failed",
      reason: "email_send_failed",
      error: errorSummary(error),
      ...deliveryMetadata,
    };
    console.error(failure);
    await recordContactFormFailure(context.env, failure);
    await notifyEmailFailure(
      context.env,
      failure,
      "Melkior contact email failed. Check Cloudflare Workers Logs for event=contact_email_delivery_failed."
    );
    throw error;
  }
}

function contactHtmlFromBody(body) {
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

  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;color:#181818">${html}</body></html>`;
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
 * @param {{request: Request, env: Record<string, unknown>, waitUntil: Function}} context - Worker route handler context.
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

  if (!context.env.TURNSTILE_SECRET) {
    trackContactFormFailure(context, {
      event: "contact_form_unavailable",
      reason: "missing_turnstile_secret",
      locale,
    });
    return errorResponse(msg.config, 500);
  }

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
    if (!turnstileRes.ok) {
      trackContactFormFailure(context, {
        event: "contact_form_unavailable",
        reason: "turnstile_http_error",
        error: `Turnstile HTTP ${turnstileRes.status}`,
        locale,
      });
      return errorResponse(msg.turnstileFailed, 403);
    }
    turnstileData = await turnstileRes.json();
  } catch (error) {
    console.error("Turnstile verification error:", error);
    trackContactFormFailure(context, {
      event: "contact_form_unavailable",
      reason: "turnstile_request_failed",
      error: errorSummary(error),
      locale,
    });
    return errorResponse(msg.internal, 500);
  }
  if (!turnstileData.success) return errorResponse(msg.turnstileFailed, 403);

  const fromEmail = CONTACT_FORM_FROM_EMAIL;
  const toEmail = context.env.CONTACT_DESTINATION;
  if (!toEmail) {
    trackContactFormFailure(context, {
      event: "contact_form_unavailable",
      reason: "missing_contact_destination",
      locale,
    });
    return errorResponse(msg.config, 500);
  }

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

  const raw = createMultipartEmail({
    from: fromEmail,
    to: toEmail,
    fromName: "Formulaire Melkior",
    replyTo: email,
    subject: `${msg.emailTitle} - ${name}`,
    text: body,
    html: contactHtmlFromBody(body),
    xMailer: "Melkior Contact Form",
  });

  try {
    if (context.env.SEND_EMAIL) {
      context.waitUntil(
        deliverContactEmail(
          context,
          { from: fromEmail, to: toEmail, raw },
          contactLogMetadata({ locale, subject, referral, message })
        )
      );
    } else if (isLocalDevelopmentRequest(context.request)) {
      console.log("Contact form dev mode:", {
        locale,
        subjectLength: subject.length,
        referralProvided: Boolean(referral),
        hasPhone: Boolean(formattedPhone),
        emailDomain: email.includes("@") ? email.split("@").pop() : "",
        messageLength: message.length,
      });
    } else {
      trackContactFormFailure(context, {
        event: "contact_form_unavailable",
        reason: "missing_send_email_binding",
        locale,
      });
      return errorResponse(msg.config, 500);
    }
  } catch (error) {
    console.error("Contact email error:", error);
    return errorResponse(msg.internal, 500);
  }

  return jsonResponse({ success: true, message: msg.success });
}

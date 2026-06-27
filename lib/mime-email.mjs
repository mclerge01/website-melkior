import { emailDomain } from "./email-alert.mjs";

function base64Utf8(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function createMessageId(from) {
  const domain = emailDomain(from) || "melkiorclerge.ca";
  const unique = crypto.randomUUID();
  return `<${String(unique).replace(/[^a-z0-9.-]/gi, "")}@${domain}>`;
}

export function createMultipartEmail({ from, to, fromName = "Melkior Clerge", replyTo, subject, text, html, xMailer = "Melkior Website" }) {
  const boundary = `----=_Melkior_${Date.now().toString(36)}`;
  const headers = [
    `From: ${fromName} <${from}>`,
    `To: ${to}`,
    replyTo ? `Reply-To: ${replyTo}` : "",
    `Subject: =?UTF-8?B?${base64Utf8(subject)}?=`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: ${createMessageId(from)}`,
    `X-Mailer: ${xMailer}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ].filter(Boolean).join("\r\n");

  const plainPart = [
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    text,
  ].join("\r\n");

  const htmlPart = [
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    html,
  ].join("\r\n");

  return [headers, "", plainPart, htmlPart, `--${boundary}--`].join("\r\n");
}

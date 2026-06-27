import { EmailMessage } from "cloudflare:email";
import { CONTACT_FORM_FROM_EMAIL } from "./email-config.mjs";
import { getContactFormFailureHealth } from "./contact-health.mjs";
import { emailDomain, errorSummary, notifyEmailFailure } from "./email-alert.mjs";
import { createMultipartEmail } from "./mime-email.mjs";

const GRAPHQL_ENDPOINT = "https://api.cloudflare.com/client/v4/graphql";
const HEALTH_CHECK_WINDOW_DAYS = 7;
const EMAIL_SERVICE_HEALTH_QUERY = `
query EmailServiceWeeklyHealthCheck($zoneTag: string!, $start: Date!, $end: Date!) {
  viewer {
    zones(filter: { zoneTag: $zoneTag }) {
      sendingByStatus: emailSendingAdaptiveGroups(
        filter: { date_geq: $start, date_leq: $end }
        limit: 10000
        orderBy: [date_ASC]
      ) {
        count
        dimensions {
          date
          status
        }
      }
      sendingDeliveryFailures: emailSendingAdaptiveGroups(
        filter: { date_geq: $start, date_leq: $end, status: "deliveryFailed" }
        limit: 10000
        orderBy: [date_ASC]
      ) {
        count
        dimensions {
          date
          errorCause
          sendingDomain
        }
      }
      routingByStatus: emailRoutingAdaptiveGroups(
        filter: { date_geq: $start, date_leq: $end }
        limit: 10000
        orderBy: [date_ASC]
      ) {
        count
        dimensions {
          date
          status
        }
      }
      routingRejectedAuth: emailRoutingAdaptiveGroups(
        filter: { date_geq: $start, date_leq: $end, status: "rejected" }
        limit: 10000
        orderBy: [date_ASC]
      ) {
        count
        dimensions {
          date
          spf
          dkim
          dmarc
        }
      }
    }
  }
}`;

const SENDING_PROBLEM_LABELS = {
  deliveryFailed: "Courriels du site qui n'ont pas pu être livrés à la boîte de réception",
  rejected: "Courriels du site refusés par Cloudflare avant l'envoi",
  failed: "Courriels du site qui ont échoué à cause de la configuration courriel",
};

const ROUTING_PROBLEM_LABELS = {
  rejected: "Courriels transférés bloqués par les vérifications de sécurité",
  dropped: "Courriels transférés ignorés par une règle Cloudflare",
  deliveryFailed: "Courriels transférés qui n'ont pas pu être livrés à la boîte de réception",
  error: "Courriels transférés touchés par une erreur Cloudflare",
};

const CONTACT_FORM_REASON_LABELS = {
  email_send_failed: "Le site a tenté d'envoyer un message du formulaire, mais l'envoi a échoué",
  missing_contact_destination: "La boîte de réception privée n'est pas configurée",
  missing_send_email_binding: "L'envoi de courriel Cloudflare n'est pas connecté au site",
  missing_turnstile_secret: "Le réglage anti-spam du formulaire est manquant",
  turnstile_http_error: "La vérification anti-spam de Cloudflare a retourné une erreur",
  turnstile_request_failed: "Le site n'a pas pu joindre la vérification anti-spam de Cloudflare",
};

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function healthCheckWindow(scheduledTime) {
  const end = new Date(Number.isFinite(scheduledTime) ? scheduledTime : Date.now());
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - (HEALTH_CHECK_WINDOW_DAYS - 1));
  return {
    start: isoDate(start),
    end: isoDate(end),
  };
}

function healthCheckRecipient(env) {
  return String(env.EMAIL_HEALTH_CHECK_RECIPIENT || env.CONTACT_DESTINATION || "").trim();
}

function hasAnalyticsConfig(env) {
  return Boolean(String(env.CLOUDFLARE_ZONE_ID || "").trim() && String(env.CLOUDFLARE_ANALYTICS_TOKEN || "").trim());
}

async function queryEmailAnalytics(env, window) {
  const analyticsToken = String(env.CLOUDFLARE_ANALYTICS_TOKEN || "").trim();
  const zoneTag = String(env.CLOUDFLARE_ZONE_ID || "").trim();
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${analyticsToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: EMAIL_SERVICE_HEALTH_QUERY,
      variables: {
        zoneTag,
        start: window.start,
        end: window.end,
      },
    }),
  });

  if (!response.ok) throw new Error(`Cloudflare GraphQL returned HTTP ${response.status}`);

  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).filter(Boolean).join("; ") || "Cloudflare GraphQL query failed");
  }

  const zone = payload.data?.viewer?.zones?.[0];
  if (!zone) throw new Error("Cloudflare GraphQL returned no zone analytics data");
  return zone;
}

function statusTotals(rows = []) {
  return rows.reduce((totals, row) => {
    const status = row.dimensions?.status || "unknown";
    totals[status] = (totals[status] || 0) + Number(row.count || 0);
    return totals;
  }, {});
}

function totalFor(totals, statuses) {
  return statuses.reduce((sum, status) => sum + Number(totals[status] || 0), 0);
}

function failureCauses(rows = []) {
  const causes = rows.reduce((totals, row) => {
    const dimensions = row.dimensions || {};
    const cause = dimensions.errorCause || "unknown";
    const domain = dimensions.sendingDomain || "unknown-domain";
    const key = `${cause} (${domain})`;
    totals[key] = (totals[key] || 0) + Number(row.count || 0);
    return totals;
  }, {});
  return Object.entries(causes)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8);
}

function isAuthFailure(value) {
  return ["fail", "failed", "permerror", "temperror"].includes(String(value || "").toLowerCase());
}

function authFailureTotals(rows = []) {
  return rows.reduce((totals, row) => {
    const dimensions = row.dimensions || {};
    const count = Number(row.count || 0);
    if (isAuthFailure(dimensions.dmarc)) totals.dmarc += count;
    if (isAuthFailure(dimensions.spf)) totals.spf += count;
    if (isAuthFailure(dimensions.dkim)) totals.dkim += count;
    return totals;
  }, { dmarc: 0, spf: 0, dkim: 0 });
}

function formatProblemLines(totals, labels, emptyLine) {
  const lines = Object.entries(labels)
    .map(([status, label]) => [label, Number(totals[status] || 0)])
    .filter(([, count]) => count > 0)
    .map(([label, count]) => `- ${label}: ${count}`);
  return lines.length ? lines.join("\n") : emptyLine;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function htmlList(lines) {
  return `<ul>${lines.map((line) => `<li>${escapeHtml(line.replace(/^- /, ""))}</li>`).join("")}</ul>`;
}

function contactFormProblemCount(contactHealth) {
  if (!contactHealth.configured || contactHealth.error) return 1;
  return contactHealth.failures.length;
}

function contactFormFailureSummary(contactHealth) {
  if (!contactHealth.configured) {
    return "- La surveillance des erreurs du formulaire n'est pas complètement connectée.";
  }
  if (contactHealth.error) {
    return "- Les erreurs du formulaire n'ont pas pu être lues.";
  }
  if (!contactHealth.failures.length) {
    return "- Erreurs du formulaire sur le site : 0";
  }

  const byReason = contactHealth.failures.reduce((totals, failure) => {
    const reason = failure.reason || failure.event || "unknown";
    totals[reason] = (totals[reason] || 0) + 1;
    return totals;
  }, {});
  const lines = [
    `- Erreurs du formulaire sur le site : ${contactHealth.failures.length}`,
    ...Object.entries(byReason)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 8)
      .map(([reason, count]) => `- ${CONTACT_FORM_REASON_LABELS[reason] || reason.replace(/_/g, " ")}: ${count}`),
  ];
  if (contactHealth.truncated) lines.push("- Il y a eu plus d'erreurs que ce courriel peut afficher.");
  return lines.join("\n");
}

function buildHealthCheckAlert(window, analytics, contactHealth) {
  const sendingTotals = statusTotals(analytics.sendingByStatus);
  const routingTotals = statusTotals(analytics.routingByStatus);
  const causes = failureCauses(analytics.sendingDeliveryFailures);
  const auth = authFailureTotals(analytics.routingRejectedAuth);
  const outboundProblems = totalFor(sendingTotals, ["deliveryFailed", "rejected", "failed"]);
  const inboundProblems = totalFor(routingTotals, ["rejected", "dropped", "deliveryFailed", "error"]);
  const contactProblems = contactFormProblemCount(contactHealth);

  const sendingLines = formatProblemLines(sendingTotals, SENDING_PROBLEM_LABELS, "- Problèmes de livraison des courriels du site : 0");
  const routingLines = formatProblemLines(routingTotals, ROUTING_PROBLEM_LABELS, "- Problèmes de courriels transférés : 0");
  const contactLines = contactFormFailureSummary(contactHealth);
  const authProblems = auth.dmarc + auth.spf + auth.dkim;
  const authLines = authProblems
    ? `- Certains courriels transférés ont été bloqués parce que l'expéditeur n'a pas passé les vérifications de sécurité : ${authProblems}`
    : "- Blocages liés aux vérifications de sécurité des courriels transférés : 0";
  const causeLines = causes.length
    ? causes.map(([cause, count]) => `- Détail technique pour le développeur : ${cause} : ${count}`).join("\n")
    : "- Détails techniques pour le développeur : aucun signalé.";
  const subjectParts = [];
  if (outboundProblems) subjectParts.push(`${outboundProblems} livraison`);
  if (inboundProblems) subjectParts.push(`${inboundProblems} transfert`);
  if (contactProblems) subjectParts.push(`${contactProblems} formulaire`);
  const totalProblems = outboundProblems + inboundProblems + contactProblems;
  const subject = subjectParts.length
    ? `Alerte courriel du site : ${subjectParts.join(" / ")} problème${totalProblems === 1 ? "" : "s"}`
    : "Alerte courriel du site : aucun problème détecté";

  const text = [
    "Alerte courriel du site",
    `Période : ${window.start} au ${window.end} (dates UTC)`,
    "",
    "Résumé",
    `- Erreurs du formulaire sur le site : ${contactProblems}`,
    `- Problèmes de livraison des courriels du site : ${outboundProblems}`,
    `- Problèmes de courriels transférés : ${inboundProblems}`,
    "",
    "Formulaire de contact",
    contactLines,
    "",
    "Courriels du site",
    sendingLines,
    "",
    "Courriels transférés",
    routingLines,
    "",
    "Vérifications de sécurité courriel",
    authLines,
    "",
    "Détails supplémentaires pour le développeur",
    causeLines,
    "",
    "Quoi faire",
    "- Si vous voyez ce courriel, transférez-le à votre développeur web.",
    "- Ce courriel ne contient pas le nom, l'adresse courriel, le sujet ou le message des visiteurs.",
    "- Cloudflare ne peut pas savoir si un courriel livré est arrivé dans la boîte de réception ou dans le dossier spam.",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html>
  <body style="font-family:Arial,sans-serif;color:#181818;line-height:1.45">
    <h1 style="font-size:20px;margin:0 0 8px">Alerte courriel du site</h1>
    <p style="margin:0 0 16px"><strong>Période :</strong> ${escapeHtml(window.start)} au ${escapeHtml(window.end)} (dates UTC)</p>
    <h2 style="font-size:16px;margin:18px 0 8px">Résumé</h2>
    ${htmlList([
      `- Erreurs du formulaire sur le site : ${contactProblems}`,
      `- Problèmes de livraison des courriels du site : ${outboundProblems}`,
      `- Problèmes de courriels transférés : ${inboundProblems}`,
    ])}
    <h2 style="font-size:16px;margin:18px 0 8px">Formulaire de contact</h2>
    ${htmlList(contactLines.split("\n"))}
    <h2 style="font-size:16px;margin:18px 0 8px">Courriels du site</h2>
    ${htmlList(sendingLines.split("\n"))}
    <h2 style="font-size:16px;margin:18px 0 8px">Courriels transférés</h2>
    ${htmlList(routingLines.split("\n"))}
    <h2 style="font-size:16px;margin:18px 0 8px">Vérifications de sécurité courriel</h2>
    ${htmlList(authLines.split("\n"))}
    <h2 style="font-size:16px;margin:18px 0 8px">Détails supplémentaires pour le développeur</h2>
    ${htmlList(causeLines.split("\n"))}
    <p style="font-size:13px;color:#555;margin-top:18px">Si vous voyez ce courriel, transférez-le à votre développeur web. Il ne contient pas le nom, l'adresse courriel, le sujet ou le message des visiteurs.</p>
  </body>
</html>`;

  return {
    subject,
    text,
    html,
    outboundProblems,
    inboundProblems,
    contactProblems,
    shouldSend: Boolean(outboundProblems || inboundProblems || contactProblems),
  };
}

function buildConfigurationAlert(window, contactHealth) {
  const contactLines = contactFormFailureSummary(contactHealth);
  const text = [
    "Alerte courriel du site",
    `Période : ${window.start} au ${window.end} (dates UTC)`,
    "",
    "Ce qui s'est passé",
    "- La surveillance des courriels du site n'est pas encore complètement configurée.",
    "- Tant que ce n'est pas corrigé, la vérification hebdomadaire ne peut pas voir tous les problèmes de livraison.",
    "",
    "Formulaire de contact",
    contactLines,
    "",
    "Quoi faire",
    "- Transférez ce courriel à votre développeur web.",
  ].join("\n");
  const html = `<!DOCTYPE html>
<html>
  <body style="font-family:Arial,sans-serif;color:#181818;line-height:1.45">
    <h1 style="font-size:20px;margin:0 0 8px">Alerte courriel du site</h1>
    <p><strong>Période :</strong> ${escapeHtml(window.start)} au ${escapeHtml(window.end)} (dates UTC)</p>
    <p>La surveillance des courriels du site n'est pas encore complètement configurée. Tant que ce n'est pas corrigé, la vérification hebdomadaire ne peut pas voir tous les problèmes de livraison.</p>
    <h2 style="font-size:16px;margin:18px 0 8px">Formulaire de contact</h2>
    ${htmlList(contactLines.split("\n"))}
    <p>Transférez ce courriel à votre développeur web.</p>
  </body>
</html>`;
  return {
    subject: "Alerte courriel du site : surveillance incomplète",
    text,
    html,
    outboundProblems: 0,
    inboundProblems: 0,
    contactProblems: contactFormProblemCount(contactHealth),
    shouldSend: true,
  };
}

function buildFailureAlert(window, error, contactHealth) {
  const summary = errorSummary(error).slice(0, 500);
  const contactLines = contactFormFailureSummary(contactHealth);
  const text = [
    "Alerte courriel du site",
    `Période : ${window.start} au ${window.end} (dates UTC)`,
    "",
    "Ce qui s'est passé",
    "- La vérification hebdomadaire des courriels du site n'a pas pu s'exécuter correctement.",
    `- Détail technique pour le développeur : ${summary}`,
    "",
    "Formulaire de contact",
    contactLines,
    "",
    "Quoi faire",
    "- Transférez ce courriel à votre développeur web.",
  ].join("\n");
  const html = `<!DOCTYPE html>
<html>
  <body style="font-family:Arial,sans-serif;color:#181818;line-height:1.45">
    <h1 style="font-size:20px;margin:0 0 8px">Alerte courriel du site</h1>
    <p><strong>Période :</strong> ${escapeHtml(window.start)} au ${escapeHtml(window.end)} (dates UTC)</p>
    <p>La vérification hebdomadaire des courriels du site n'a pas pu s'exécuter correctement.</p>
    <p style="font-size:13px;color:#555"><strong>Détail technique pour le développeur :</strong> ${escapeHtml(summary)}</p>
    <h2 style="font-size:16px;margin:18px 0 8px">Formulaire de contact</h2>
    ${htmlList(contactLines.split("\n"))}
    <p>Transférez ce courriel à votre développeur web.</p>
  </body>
</html>`;
  return {
    subject: "Alerte courriel du site : la surveillance n'a pas pu s'exécuter",
    text,
    html,
    outboundProblems: 0,
    inboundProblems: 0,
    contactProblems: contactFormProblemCount(contactHealth),
    shouldSend: true,
  };
}

async function sendHealthCheckAlert(env, recipient, alert) {
  const raw = createMultipartEmail({
    from: CONTACT_FORM_FROM_EMAIL,
    to: recipient,
    fromName: "Surveillance courriel Melkior",
    subject: alert.subject,
    text: alert.text,
    html: alert.html,
    xMailer: "Melkior Email Monitor",
  });
  await env.SEND_EMAIL.send(new EmailMessage(CONTACT_FORM_FROM_EMAIL, recipient, raw));
}

export async function sendWeeklyEmailHealthCheck(env, scheduledTime) {
  const recipient = healthCheckRecipient(env);
  const window = healthCheckWindow(scheduledTime);
  const contactHealth = await getContactFormFailureHealth(env, window);
  if (!env.SEND_EMAIL || !recipient) {
    console.error({
      event: "weekly_email_health_check_skipped",
      reason: "missing_email_binding_or_recipient",
      has_send_email: Boolean(env.SEND_EMAIL),
      has_recipient: Boolean(recipient),
    });
    return;
  }

  let alert;
  try {
    alert = hasAnalyticsConfig(env)
      ? buildHealthCheckAlert(window, await queryEmailAnalytics(env, window), contactHealth)
      : buildConfigurationAlert(window, contactHealth);
  } catch (error) {
    console.error({ event: "weekly_email_health_check_query_failed", error: errorSummary(error) });
    alert = buildFailureAlert(window, error, contactHealth);
  }

  if (!alert.shouldSend) {
    console.log({
      event: "weekly_email_health_check_ok",
      window_start: window.start,
      window_end: window.end,
      outbound_issues: alert.outboundProblems,
      inbound_issues: alert.inboundProblems,
      contact_form_issues: alert.contactProblems,
    });
    return;
  }

  try {
    await sendHealthCheckAlert(env, recipient, alert);
    console.log({
      event: "weekly_email_health_check_alert_sent",
      to_domain: emailDomain(recipient),
      window_start: window.start,
      window_end: window.end,
      outbound_issues: alert.outboundProblems,
      inbound_issues: alert.inboundProblems,
      contact_form_issues: alert.contactProblems,
    });
  } catch (error) {
    const failure = {
      event: "weekly_email_health_check_alert_delivery_failed",
      error: errorSummary(error),
      to_domain: emailDomain(recipient),
      window_start: window.start,
      window_end: window.end,
    };
    console.error(failure);
    await notifyEmailFailure(
      env,
      failure,
      "Melkior weekly email health-check alert failed to send. Check Cloudflare Workers Logs for event=weekly_email_health_check_alert_delivery_failed."
    );
    throw error;
  }
}

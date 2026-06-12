const CONTACT_FAILURE_PREFIX = "contact-form-failure:";
const CONTACT_FAILURE_RETENTION_SECONDS = 45 * 24 * 60 * 60;
const MAX_CONTACT_FAILURES_PER_CHECK = 200;

function dateRange(start, end) {
  const dates = [];
  const current = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (current <= last) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

function redactEmailAddresses(value) {
  return String(value || "").replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]");
}

function safeString(value, maxLength = 240) {
  return redactEmailAddresses(value).replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function logSafeFailure(failure = {}) {
  return {
    event: safeString(failure.event || "contact_form_failure", 80),
    reason: safeString(failure.reason || failure.event || "unknown", 120),
    error: safeString(failure.error || "", 500),
    from_domain: safeString(failure.from_domain || "", 120),
    to_domain: safeString(failure.to_domain || "", 120),
    locale: safeString(failure.locale || "", 16),
    raw_bytes: safeNumber(failure.raw_bytes),
    subject_length: safeNumber(failure.subject_length),
    message_length: safeNumber(failure.message_length),
    referral_provided: Boolean(failure.referral_provided),
  };
}

export async function recordContactFormFailure(env, failure) {
  if (!env.CONTACT_HEALTH) {
    console.error({ event: "contact_form_failure_tracking_unavailable", reason: "missing_contact_health_kv" });
    return;
  }

  const occurredAt = new Date().toISOString();
  const record = {
    occurred_at: occurredAt,
    ...logSafeFailure(failure),
  };
  const key = `${CONTACT_FAILURE_PREFIX}${occurredAt.slice(0, 10)}:${crypto.randomUUID()}`;

  try {
    await env.CONTACT_HEALTH.put(key, JSON.stringify(record), { expirationTtl: CONTACT_FAILURE_RETENTION_SECONDS });
  } catch (error) {
    console.error({
      event: "contact_form_failure_tracking_failed",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function listContactFailureKeys(kv, prefix) {
  const keys = [];
  let cursor;
  do {
    const page = await kv.list({ prefix, limit: 1000, cursor });
    keys.push(...page.keys.map((key) => key.name));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor && keys.length < MAX_CONTACT_FAILURES_PER_CHECK);
  return keys.slice(0, MAX_CONTACT_FAILURES_PER_CHECK);
}

async function readContactFailures(kv, keys) {
  const failures = [];
  for (let index = 0; index < keys.length; index += 100) {
    const batch = keys.slice(index, index + 100);
    const values = await kv.get(batch);
    for (const key of batch) {
      const value = values.get(key);
      if (!value) continue;
      try {
        failures.push(JSON.parse(value));
      } catch {
        // Ignore malformed records so one bad value cannot hide the rest.
      }
    }
  }
  return failures;
}

export async function getContactFormFailureHealth(env, window) {
  if (!env.CONTACT_HEALTH) {
    return {
      configured: false,
      error: "CONTACT_HEALTH KV binding is missing.",
      failures: [],
    };
  }

  try {
    const keys = [];
    for (const date of dateRange(window.start, window.end)) {
      keys.push(...await listContactFailureKeys(env.CONTACT_HEALTH, `${CONTACT_FAILURE_PREFIX}${date}:`));
      if (keys.length >= MAX_CONTACT_FAILURES_PER_CHECK) break;
    }

    const failures = (await readContactFailures(env.CONTACT_HEALTH, keys.slice(0, MAX_CONTACT_FAILURES_PER_CHECK)))
      .sort((a, b) => String(b.occurred_at || "").localeCompare(String(a.occurred_at || "")));

    return {
      configured: true,
      error: "",
      failures,
      truncated: keys.length >= MAX_CONTACT_FAILURES_PER_CHECK,
    };
  } catch (error) {
    return {
      configured: true,
      error: error instanceof Error ? error.message : String(error),
      failures: [],
    };
  }
}

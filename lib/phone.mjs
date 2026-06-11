import parsePhoneNumber from "libphonenumber-js/max";

const DEFAULT_NATIONAL_COUNTRIES = ["CA", "US"];
const STRICT_PARSE_OPTIONS = { extract: false };

function normalizePhoneInput(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u00a0\u202f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseValidPhoneNumber(value, options = STRICT_PARSE_OPTIONS) {
  try {
    const phoneNumber = parsePhoneNumber(value, options);
    return phoneNumber?.isValid() ? phoneNumber : null;
  } catch {
    return null;
  }
}

function parseWithoutLeadingPlus(value) {
  if (value.startsWith("+")) return null;
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  return parseValidPhoneNumber(`+${digits}`);
}

function parseNationalNumber(value) {
  for (const country of DEFAULT_NATIONAL_COUNTRIES) {
    const phoneNumber = parseValidPhoneNumber(value, { defaultCountry: country, extract: false });
    if (phoneNumber) return { phoneNumber, format: "national" };
  }
  return null;
}

function parseContactPhoneNumber(value) {
  const normalized = normalizePhoneInput(value);
  if (!normalized) return null;

  const exactPhoneNumber = parseValidPhoneNumber(normalized);
  if (exactPhoneNumber) return { phoneNumber: exactPhoneNumber, format: "international" };

  const nationalPhoneNumber = parseNationalNumber(normalized);
  if (nationalPhoneNumber) return nationalPhoneNumber;

  const internationalPhoneNumber = parseWithoutLeadingPlus(normalized);
  if (internationalPhoneNumber) return { phoneNumber: internationalPhoneNumber, format: "international" };

  return null;
}

export function getValidContactPhoneNumber(value) {
  return parseContactPhoneNumber(value)?.phoneNumber || null;
}

export function formatContactPhoneNumber(value) {
  const parsed = parseContactPhoneNumber(value);
  if (!parsed) return normalizePhoneInput(value);
  return parsed.format === "national"
    ? parsed.phoneNumber.formatNational()
    : parsed.phoneNumber.formatInternational();
}

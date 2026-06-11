import assert from "node:assert/strict";
import test from "node:test";
import { formatContactPhoneNumber, isValidContactPhoneNumber } from "../lib/phone.mjs";
import { onRequestPost } from "../functions/api/contact.js";

const validPhoneNumbers = [
  "+1 514 836 6736",
  "514 836 6736",
  "+1 650 253 0000",
  "16502530000",
  "+33 6 12 34 56 78",
  "33 1 23 45 67 89",
  "+44 20 7946 0958",
  "442079460958",
  "+81 90-1234-5678",
  "819012345678",
  "+91 98765 43210",
  "919876543210",
  "+65 8123 4567",
];

const invalidPhoneNumbers = [
  "",
  "1",
  "12",
  "123456",
  "06 12 34 56 78",
  "abcdefg",
  "514-CALL-NOW",
  "++1 514 836 6736",
  "+999 123 456 7890",
];

function validContactPayload(overrides = {}) {
  return {
    locale: "en-CA",
    name: "Test User",
    email: "test@example.com",
    phone: "+1 514 836 6736",
    subject: "Mortgage",
    message: "Please contact me about a mortgage.",
    turnstileToken: "not-needed-for-phone-validation",
    ...overrides,
  };
}

test("accepts complete phone numbers across supported international formats", () => {
  for (const phone of validPhoneNumbers) {
    assert.equal(isValidContactPhoneNumber(phone), true, phone);
  }
});

test("rejects short or malformed phone numbers", () => {
  for (const phone of invalidPhoneNumbers) {
    assert.equal(isValidContactPhoneNumber(phone), false, phone);
  }
});

test("formats valid phone numbers according to their parsed numbering shape", () => {
  assert.equal(formatContactPhoneNumber("5148366736"), "(514) 836-6736");
  assert.equal(formatContactPhoneNumber("15148366736"), "+1 514 836 6736");
  assert.equal(formatContactPhoneNumber("+15148366736"), "+1 514 836 6736");
  assert.equal(formatContactPhoneNumber("33123456789"), "+33 1 23 45 67 89");
  assert.equal(formatContactPhoneNumber("+33612345678"), "+33 6 12 34 56 78");
  assert.equal(formatContactPhoneNumber("819012345678"), "+81 90 1234 5678");
  assert.equal(formatContactPhoneNumber("1"), "1");
});

test("contact API rejects invalid phone numbers before Turnstile verification", async () => {
  const response = await onRequestPost({
    request: new Request("https://example.test/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validContactPayload({ phone: "1" })),
    }),
    env: {},
  });

  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.success, false);
  assert.match(body.error, /phone|telephone/i);
});

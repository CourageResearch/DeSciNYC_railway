import assert from "node:assert/strict";
import test from "node:test";
import { detectBot } from "../lib/botProtection.ts";

function validBotData(overrides = {}) {
  return {
    honeypot: "",
    honeypot2: "",
    honeypot3: "",
    timestamp: 10_000,
    formStartTime: 0,
    userAgent: "Mozilla/5.0",
    referrer: "https://www.desci.nyc/",
    screenResolution: "1440x900",
    timezone: "America/New_York",
    language: "en-US",
    ...overrides,
  };
}

test("all honeypot fields are enforced", () => {
  for (const field of ["honeypot", "honeypot2", "honeypot3"]) {
    const result = detectBot(validBotData({ [field]: "filled" }));
    assert.equal(result.isBot, true);
    assert.equal(result.reasons.includes("Honeypot field filled"), true);
  }
});

test("valid repeated payloads are not rate limited by bot detection", () => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    assert.deepEqual(detectBot(validBotData()), {
      isBot: false,
      reasons: [],
    });
  }
});

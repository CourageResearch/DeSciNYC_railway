import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("public form routes call email helpers without fetching this app", async () => {
  const [speakerRoute, subscribeRoute] = await Promise.all([
    readFile("app/api/suggest-speaker/route.ts", "utf8"),
    readFile("app/api/subscribe/route.ts", "utf8"),
  ]);

  assert.equal(speakerRoute.includes("/api/send-email"), false);
  assert.equal(subscribeRoute.includes("/api/send-email"), false);
  assert.equal(speakerRoute.includes("sendSpeakerSuggestionEmails"), true);
  assert.equal(subscribeRoute.includes("sendSubscriptionEmails"), true);
});

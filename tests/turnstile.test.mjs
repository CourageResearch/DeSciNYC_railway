import assert from "node:assert/strict";
import test from "node:test";
import { verifyTurnstileToken } from "../lib/turnstile.ts";

const config = {
  token: "test-token",
  secretKey: "test-secret",
  allowedHostnames: ["desci.nyc", "www.desci.nyc"],
  expectedAction: "suggest_speaker",
};

function verified(overrides = {}) {
  return Response.json({
    success: true,
    hostname: "desci.nyc",
    action: "suggest_speaker",
    ...overrides,
  });
}

test("accepts a verified token for this site and action, keeping the secret in the request body", async () => {
  let calls = 0;
  const result = await verifyTurnstileToken({
    ...config,
    fetchImpl: async (url, options) => {
      calls++;
      assert.equal(url, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
      assert.equal(options.method, "POST");
      assert.equal(options.body.get("secret"), config.secretKey);
      assert.equal(options.body.get("response"), config.token);
      assert.equal(options.cache, "no-store");
      assert.ok(options.signal instanceof AbortSignal);
      return verified();
    },
  });
  assert.deepEqual(result, { success: true });
  assert.equal(calls, 1);
});

test("accepts the explicitly allowed www hostname", async () => {
  assert.deepEqual(await verifyTurnstileToken({
    ...config,
    fetchImpl: async () => verified({ hostname: "www.desci.nyc" }),
  }), { success: true });
});

test("rejects absent, malformed, empty, and oversized tokens without a network request", async () => {
  for (const token of [undefined, null, "", "   ", 123, {}, "x".repeat(2049)]) {
    const result = await verifyTurnstileToken({
      ...config,
      token,
      fetchImpl: async () => { throw new Error("Must not contact Cloudflare"); },
    });
    assert.equal(result.success, false);
    assert.equal(result.status, 400);
  }
});

test("missing configuration fails closed", async () => {
  for (const overrides of [{ secretKey: undefined }, { secretKey: " " }, { allowedHostnames: [] }]) {
    let calls = 0;
    const result = await verifyTurnstileToken({
      ...config,
      ...overrides,
      fetchImpl: async () => { calls++; return verified(); },
    });
    assert.equal(result.success, false);
    assert.equal(result.status, 503);
    assert.equal(calls, 0);
  }
});

test("rejects failed, expired, and already redeemed tokens", async () => {
  for (const code of ["invalid-input-response", "timeout-or-duplicate"]) {
    const result = await verifyTurnstileToken({
      ...config,
      fetchImpl: async () => verified({ success: false, "error-codes": [code] }),
    });
    assert.equal(result.success, false);
    assert.equal(result.status, 400);
  }
});

test("rejects valid tokens belonging to another hostname or action", async () => {
  for (const overrides of [
    { hostname: "attacker.example" },
    { hostname: "desci.nyc.attacker.example" },
    { hostname: "subdomain.desci.nyc" },
    { hostname: undefined },
    { action: "contact_form" },
    { action: undefined },
  ]) {
    const result = await verifyTurnstileToken({
      ...config,
      fetchImpl: async () => verified(overrides),
    });
    assert.equal(result.success, false);
    assert.equal(result.status, 400);
  }
});

test("provider HTTP failures and malformed responses never pass verification", async () => {
  for (const response of [
    new Response("unavailable", { status: 503 }),
    new Response("not JSON", { status: 200 }),
    Response.json(null),
    Response.json({}),
    verified({ success: "true" }),
  ]) {
    const result = await verifyTurnstileToken({ ...config, fetchImpl: async () => response });
    assert.equal(result.success, false);
    assert.equal(result.status, 503);
  }
});

test("network errors and timeouts return a retryable error without exposing secrets", async () => {
  for (const error of [new Error(config.secretKey), new DOMException("timeout", "TimeoutError")]) {
    const result = await verifyTurnstileToken({
      ...config,
      fetchImpl: async () => { throw error; },
    });
    assert.equal(result.success, false);
    assert.equal(result.status, 503);
    assert.equal(JSON.stringify(result).includes(config.secretKey), false);
  }
});

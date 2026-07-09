import assert from "node:assert/strict";
import test from "node:test";
import {
  createSubmissionRateLimiter,
  runRateLimitedAction,
} from "../lib/submission-rate-limiter.ts";

test("submission quotas are isolated by form", () => {
  const limiter = createSubmissionRateLimiter();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    assert.equal(limiter.reserve("suggest-speaker", "client").allowed, true);
  }

  assert.equal(limiter.reserve("suggest-speaker", "client").allowed, false);
  assert.equal(limiter.reserve("contact", "client").allowed, true);
});

test("a failed action releases its exact reservation", async () => {
  const limiter = createSubmissionRateLimiter({ limit: 1 });

  await assert.rejects(
    runRateLimitedAction({
      limiter,
      scope: "suggest-speaker",
      clientId: "client",
      action: async () => {
        throw new Error("delivery failed");
      },
    }),
    /delivery failed/
  );

  assert.equal(limiter.reserve("suggest-speaker", "client").allowed, true);
});

test("a rejected retry does not extend the lockout window", () => {
  let currentTime = 0;
  const limiter = createSubmissionRateLimiter({
    limit: 1,
    windowMs: 10_000,
    now: () => currentTime,
  });

  assert.equal(limiter.reserve("contact", "client").allowed, true);

  currentTime = 5_000;
  const rejected = limiter.reserve("contact", "client");
  assert.deepEqual(rejected, {
    allowed: false,
    retryAfterSeconds: 5,
  });

  currentTime = 10_000;
  assert.equal(limiter.reserve("contact", "client").allowed, true);
});

test("reservations are atomic before asynchronous work starts", async () => {
  const limiter = createSubmissionRateLimiter({ limit: 3 });
  let releaseActions;
  const holdAction = new Promise((resolve) => {
    releaseActions = resolve;
  });

  const actions = Array.from({ length: 3 }, () =>
    runRateLimitedAction({
      limiter,
      scope: "contact",
      clientId: "client",
      action: () => holdAction,
    })
  );

  const rejected = await runRateLimitedAction({
    limiter,
    scope: "contact",
    clientId: "client",
    action: async () => "should not run",
  });

  assert.equal(rejected.allowed, false);
  releaseActions("sent");
  const completed = await Promise.all(actions);
  assert.equal(completed.every((result) => result.allowed), true);
});

test("expired client buckets are swept from memory", () => {
  let currentTime = 0;
  const limiter = createSubmissionRateLimiter({
    windowMs: 10_000,
    now: () => currentTime,
  });

  limiter.reserve("contact", "first-client");
  assert.equal(limiter.getBucketCount(), 1);

  currentTime = 10_000;
  limiter.reserve("contact", "second-client");
  assert.equal(limiter.getBucketCount(), 1);
});

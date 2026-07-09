import "server-only";

import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import {
  createSubmissionRateLimiter,
  runRateLimitedAction,
  type RateLimitedActionResult,
  type SubmissionScope,
} from "@/lib/submission-rate-limiter";

const publicFormRateLimiter = createSubmissionRateLimiter();

function getClientAddress(req: NextRequest) {
  const forwardedFor = req.headers
    .get("x-forwarded-for")
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return (
    forwardedFor?.at(-1) ||
    req.headers.get("x-real-ip") ||
    "unknown-address"
  );
}

function getClientId(req: NextRequest) {
  return createHash("sha256").update(getClientAddress(req)).digest("hex");
}

export function runPublicFormAction<T>(
  req: NextRequest,
  scope: SubmissionScope,
  action: () => Promise<T>
): Promise<RateLimitedActionResult<T>> {
  return runRateLimitedAction({
    limiter: publicFormRateLimiter,
    scope,
    clientId: getClientId(req),
    action,
  });
}

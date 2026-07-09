export type SubmissionScope = "contact" | "suggest-speaker";

type Clock = () => number;

type SubmissionEntry = {
  id: number;
  createdAt: number;
};

export type SubmissionReservation =
  | {
      allowed: false;
      retryAfterSeconds: number;
    }
  | {
      allowed: true;
      release: () => void;
    };

export type SubmissionRateLimiter = {
  reserve: (
    scope: SubmissionScope,
    clientId: string
  ) => SubmissionReservation;
  getBucketCount: () => number;
};

type CreateSubmissionRateLimiterOptions = {
  limit?: number;
  windowMs?: number;
  now?: Clock;
};

export function createSubmissionRateLimiter({
  limit = 3,
  windowMs = 60 * 60 * 1000,
  now = Date.now,
}: CreateSubmissionRateLimiterOptions = {}): SubmissionRateLimiter {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("Submission rate limit must be a positive integer");
  }

  if (!Number.isFinite(windowMs) || windowMs <= 0) {
    throw new Error("Submission rate-limit window must be positive");
  }

  const buckets = new Map<string, SubmissionEntry[]>();
  let nextEntryId = 1;
  let nextSweepAt = Number.NEGATIVE_INFINITY;

  function sweepExpiredBuckets(currentTime: number) {
    if (currentTime < nextSweepAt) {
      return;
    }

    const cutoff = currentTime - windowMs;
    for (const [bucketKey, entries] of buckets) {
      const recentEntries = entries.filter(
        (entry) => entry.createdAt > cutoff
      );

      if (recentEntries.length === 0) {
        buckets.delete(bucketKey);
      } else if (recentEntries.length !== entries.length) {
        buckets.set(bucketKey, recentEntries);
      }
    }

    nextSweepAt = currentTime + Math.min(windowMs, 60_000);
  }

  return {
    reserve(scope, clientId) {
      const currentTime = now();
      sweepExpiredBuckets(currentTime);
      const bucketKey = `${scope}:${clientId}`;
      const cutoff = currentTime - windowMs;
      const recentEntries = (buckets.get(bucketKey) || []).filter(
        (entry) => entry.createdAt > cutoff
      );

      if (recentEntries.length >= limit) {
        buckets.set(bucketKey, recentEntries);
        const retryAfterMs =
          recentEntries[0].createdAt + windowMs - currentTime;

        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
        };
      }

      const entry: SubmissionEntry = {
        id: nextEntryId,
        createdAt: currentTime,
      };
      nextEntryId += 1;
      recentEntries.push(entry);
      buckets.set(bucketKey, recentEntries);

      let released = false;

      return {
        allowed: true,
        release() {
          if (released) {
            return;
          }

          released = true;
          const remainingEntries = (buckets.get(bucketKey) || []).filter(
            (candidate) => candidate.id !== entry.id
          );

          if (remainingEntries.length === 0) {
            buckets.delete(bucketKey);
          } else {
            buckets.set(bucketKey, remainingEntries);
          }
        },
      };
    },
    getBucketCount() {
      return buckets.size;
    },
  };
}

export type RateLimitedActionResult<T> =
  | {
      allowed: false;
      retryAfterSeconds: number;
    }
  | {
      allowed: true;
      value: T;
    };

type RunRateLimitedActionOptions<T> = {
  limiter: SubmissionRateLimiter;
  scope: SubmissionScope;
  clientId: string;
  action: () => Promise<T>;
};

export async function runRateLimitedAction<T>({
  limiter,
  scope,
  clientId,
  action,
}: RunRateLimitedActionOptions<T>): Promise<RateLimitedActionResult<T>> {
  const reservation = limiter.reserve(scope, clientId);

  if (!reservation.allowed) {
    return reservation;
  }

  try {
    return {
      allowed: true,
      value: await action(),
    };
  } catch (error) {
    reservation.release();
    throw error;
  }
}

export type RateLimitResult =
  | {
      allowed: true;
      remaining: number;
    }
  | {
      allowed: false;
      remaining: 0;
      retryAfterSeconds: number;
    };

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;
export function checkRateLimit(request: Request): RateLimitResult {
  const now = Date.now();
  const bucket = consumeRateLimitBucket({
    key: hashIp(getRequestIp(request)),
    now,
    windowMs: WINDOW_MS,
    maxRequests: MAX_REQUESTS,
  });

  if (bucket.count > MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  return {
    allowed: true,
    remaining: MAX_REQUESTS - bucket.count,
  };
}

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    "x-ratelimit-limit": String(MAX_REQUESTS),
    "x-ratelimit-remaining": String(result.remaining),
    ...(result.allowed
      ? {}
      : {
          "retry-after": String(result.retryAfterSeconds),
        }),
  };
}

function getRequestIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}
import { createHash } from "node:crypto";
import { consumeRateLimitBucket } from "./db";

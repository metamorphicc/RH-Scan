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
const buckets = new Map<
  string,
  {
    count: number;
    resetAt: number;
  }
>();

export function checkRateLimit(request: Request): RateLimitResult {
  const ip = getRequestIp(request);
  const now = Date.now();
  const bucket = buckets.get(ip);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(ip, {
      count: 1,
      resetAt: now + WINDOW_MS,
    });

    return {
      allowed: true,
      remaining: MAX_REQUESTS - 1,
    };
  }

  if (bucket.count >= MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;

  return {
    allowed: true,
    remaining: MAX_REQUESTS - bucket.count,
  };
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


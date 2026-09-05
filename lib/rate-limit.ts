/**
 * In-memory sliding window rate limiter.
 * Structured cleanly so Redis / Redis-cluster can be plugged in when scaling horizontally.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up expired buckets periodically (every 5 minutes)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    rateLimitStore.forEach((record, key) => {
      const validTimestamps = record.timestamps.filter((ts) => now - ts < 60000);
      if (validTimestamps.length === 0) {
        rateLimitStore.delete(key);
      } else {
        record.timestamps = validTimestamps;
      }
    });
  }, 5 * 60 * 1000);
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
}

/**
 * Check if an action by a key (e.g. `ip:login`, `user:bid:auction123`) is within limits.
 *
 * @param key Unique identifier for the rate-limit bucket
 * @param limit Maximum allowed events in windowMs
 * @param windowMs Time window in milliseconds (default: 60,000ms = 1 minute)
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs = 60000
): RateLimitResult {
  const now = Date.now();
  const record = rateLimitStore.get(key) || { timestamps: [] };

  // Filter out timestamps outside window
  const recentTimestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (recentTimestamps.length >= limit) {
    const oldestTimestamp = recentTimestamps[0];
    const resetMs = Math.max(0, oldestTimestamp + windowMs - now);
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetMs,
    };
  }

  // Record current request
  recentTimestamps.push(now);
  rateLimitStore.set(key, { timestamps: recentTimestamps });

  return {
    allowed: true,
    limit,
    remaining: limit - recentTimestamps.length,
    resetMs: windowMs,
  };
}

/**
 * Extract client IP helper from standard request headers
 */
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}

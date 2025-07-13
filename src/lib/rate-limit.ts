import { NextRequest } from "next/server";
import { getRedisClient } from "./redis/redis-client";

// Rate limit configurations
export const RATE_LIMITS = {
  // URL creation (most restrictive)
  createUrl: {
    anonymous: { requests: 5, window: 0.5 * 60 * 1000 }, // 5 per 30 seconds
    authenticated: { requests: 20, window: 0.5 * 60 * 1000 }, // 20 per 30 seconds
  },
  // URL redirects (most permissive)
  redirect: {
    anonymous: { requests: 100, window: 0.5 * 60 * 1000 }, // 100 per 30 seconds
    authenticated: { requests: 200, window: 0.5 * 60 * 1000 }, // 200 per 30 seconds
  },
  // Analytics views
  analytics: {
    anonymous: { requests: 0, window: 0.5 * 60 * 1000 }, // No access for anonymous
    authenticated: { requests: 50, window: 0.5 * 60 * 1000 }, // 50 per 30 seconds
  },
  // Authentication attempts
  auth: {
    anonymous: { requests: 10, window: 0.5 * 60 * 1000 }, // 10 per 30 seconds
    authenticated: { requests: 10, window: 0.5 * 60 * 1000 }, // 10 per 30 seconds
  },
  // General API
  api: {
    anonymous: { requests: 30, window: 0.5 * 60 * 1000 }, // 30 per 30 seconds
    authenticated: { requests: 100, window: 0.5 * 60 * 1000 }, // 100 per 30 seconds
  },
} as const;

export function getRateLimitType(
  pathname: string,
  method: string
): keyof typeof RATE_LIMITS | null {
  // Skip rate limiting for system assets and loading page
  if (
    pathname === "/loading" ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon")
  ) {
    return null;
  }

  // URL creation
  if (pathname === "/api/urls" && method === "POST") {
    return "createUrl";
  }

  // URL redirects (short URLs like /abc123)
  if (/^\/[a-z0-9]{6}$/.test(pathname) && method === "GET") {
    return "redirect";
  }

  // Analytics
  if (
    pathname.startsWith("/dashboard/analytics") ||
    pathname.startsWith("/api/analytics")
  ) {
    return "analytics";
  }

  // Authentication
  if (
    pathname.startsWith("/api/auth") ||
    pathname === "/login" ||
    pathname === "/signup"
  ) {
    return "auth";
  }

  // General API
  if (pathname.startsWith("/api/")) {
    return "api";
  }

  return null;
}

export function getRateLimitKey(
  userId: string | null,
  ip: string,
  type: string
): string {
  // Ensure we have valid strings
  const safeUserId = userId && typeof userId === "string" ? userId : null;
  const safeIp = ip && typeof ip === "string" ? ip : "127.0.0.1";
  const safeType = type && typeof type === "string" ? type : "unknown";

  // Add environment prefix to separate dev/prod keys
  const env = process.env.NODE_ENV === "production" ? "prod" : "dev";
  const identifier = safeUserId ? `user:${safeUserId}` : `ip:${safeIp}`;
  return `${env}:rate_limit:${identifier}:${safeType}`;
}

export function getClientIP(request: NextRequest): string {
  try {
    // Try to get real IP from headers (for deployed environments)
    const forwarded = request.headers.get("x-forwarded-for");
    const realIP = request.headers.get("x-real-ip");
    const cfConnectingIP = request.headers.get("cf-connecting-ip"); // Cloudflare

    if (cfConnectingIP && typeof cfConnectingIP === "string")
      return cfConnectingIP;
    if (realIP && typeof realIP === "string") return realIP;
    if (forwarded && typeof forwarded === "string")
      return forwarded.split(",")[0].trim();

    // Fallback if no IP found
    return "127.0.0.1";
  } catch (error) {
    console.error("Error getting client IP:", error);
    return "127.0.0.1";
  }
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
}

export async function checkRateLimit(
  userId: string | null,
  ip: string,
  type: keyof typeof RATE_LIMITS
): Promise<RateLimitResult> {
  const isAuthenticated = Boolean(userId);
  const config =
    RATE_LIMITS[type][isAuthenticated ? "authenticated" : "anonymous"];

  const key = getRateLimitKey(userId, ip, type);
  const now = Date.now();
  const windowStart = now - config.window;

  try {
    return await checkRateLimitRedis(key, config, now, windowStart);
  } catch (error) {
    console.error("Redis rate limiting failed:", error);
    // Fail open - allow the request if Redis is down
    return {
      allowed: true,
      limit: 1000,
      remaining: 999,
      resetTime: Date.now() + 60000,
    };
  }
}

async function checkRateLimitRedis(
  key: string,
  config: { requests: number; window: number },
  now: number,
  windowStart: number
): Promise<RateLimitResult> {
  const redis = getRedisClient();

  // Use individual Redis commands (Upstash doesn't support pipelines the same way)
  await redis.zremrangebyscore(key, 0, windowStart);
  const currentCount = await redis.zcard(key);

  const allowed = currentCount < config.requests;

  if (allowed) {
    await redis.zadd(key, {
      score: now,
      member: `${now}-${Math.random().toString(36)}`,
    });
    await redis.expire(key, Math.ceil(config.window / 1000));
  }

  return {
    allowed,
    limit: config.requests,
    remaining: Math.max(0, config.requests - currentCount - (allowed ? 1 : 0)),
    resetTime: now + config.window,
  };
}

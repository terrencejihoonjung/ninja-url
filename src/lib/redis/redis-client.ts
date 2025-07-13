import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }

  return redis;
}

// Helper function to generate cache keys
export function getCacheKey(
  type: string,
  urlId: string,
  timePeriod: string
): string {
  return `analytics:${type}:${urlId}:${timePeriod}`;
}

// TTL settings in seconds based on time period
export function getCacheTTL(timePeriod: string): number {
  switch (timePeriod) {
    case "today":
      return 1 * 60; // 1 minute
    case "7days":
      return 10 * 60; // 10 minute
    case "30days":
      return 2 * 60 * 60; // 2 hours
    case "3months":
      return 6 * 60 * 60; // 6 hours
    case "alltime":
      return 12 * 60 * 60; // 12 hours
    default:
      return 10 * 60; // Default to 10 minutes
  }
}

// Cache invalidation utility - call when new visits are recorded
export async function invalidateUrlCache(urlId: string): Promise<void> {
  try {
    const redis = getRedisClient();
    const timePeriods = ["today", "7days", "30days", "3months", "alltime"];
    const cacheTypes = ["summary", "analytics"]; // For future when we cache analytics too

    const keysToDelete: string[] = [];

    for (const type of cacheTypes) {
      for (const period of timePeriods) {
        keysToDelete.push(getCacheKey(type, urlId, period));
      }
    }

    if (keysToDelete.length > 0) {
      await redis.del(...keysToDelete);
      console.log(
        `Invalidated cache for URL ${urlId}: ${keysToDelete.length} keys targeted`
      );
    }
  } catch (error) {
    console.warn("Cache invalidation error:", error);
    // Don't throw - cache invalidation failures shouldn't break the app
  }
}

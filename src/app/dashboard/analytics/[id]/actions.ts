"use server";

import { createClient } from "@/lib/supabase/supabase-server";
import {
  getRedisClient,
  getCacheKey,
  getCacheTTL,
} from "@/lib/redis/redis-client";

// Get url by ID
export async function getUrlById(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not found");
  }

  const { data, error } = await supabase
    .from("url")
    .select("*")
    .eq("id", parseInt(id))
    .eq("user_id", user.id)
    .single();

  if (error) {
    throw new Error("Failed to get url");
  }

  return data;
}

// Get comprehensive analytics data with proper grouping and unique visitor counts
export async function getUrlAnalytics(
  id: string,
  localStartDate: string, // ISO string in user's local time
  localEndDate: string, // ISO string in user's local time
  timePeriod: string, // "today", "7days" etc for cache keys and granularity
  timezone: string // user's timezone for any server-side calculations
) {
  const supabase = await createClient();
  const urlId = parseInt(id);

  // Convert local dates to UTC for database queries
  const startDateUTC = localStartDate
    ? new Date(localStartDate).toISOString()
    : null;
  const endDateUTC = new Date(localEndDate).toISOString();

  // Determine granularity based on time period
  const isHourly = timePeriod === "today";

  // Parse local dates for processing logic
  const localStart = localStartDate ? new Date(localStartDate) : null;
  const localEnd = new Date(localEndDate);

  // Fetch visits data
  const visitsQuery = supabase
    .from("url_metric")
    .select("datetime, visits")
    .eq("url_id", urlId);

  if (startDateUTC) {
    visitsQuery.gte("datetime", startDateUTC);
  }
  visitsQuery.lte("datetime", endDateUTC);

  const { data: visitsData, error: visitsError } = await visitsQuery.order(
    "datetime",
    { ascending: true }
  );

  if (visitsError) {
    throw new Error("Failed to fetch visits data");
  }

  // Fetch unique visitors data
  const uniqueVisitorsQuery = supabase
    .from("unique_visitor")
    .select("first_visit_at")
    .eq("url_id", urlId);

  if (startDateUTC) {
    uniqueVisitorsQuery.gte("first_visit_at", startDateUTC);
  }
  uniqueVisitorsQuery.lte("first_visit_at", endDateUTC);

  const { data: uniqueVisitorsData, error: uniqueVisitorsError } =
    await uniqueVisitorsQuery;

  if (uniqueVisitorsError) {
    throw new Error("Failed to fetch unique visitors data");
  }

  // Process data based on granularity
  if (isHourly) {
    // Hourly processing for "today"
    const hourlyData: Record<
      string,
      { visits: number; unique_visitors: number }
    > = {};

    // Initialize all 24 hours with zero values for the local date
    if (localStart) {
      for (let hour = 0; hour < 24; hour++) {
        const hourKey = `${localStart.getFullYear()}-${String(
          localStart.getMonth() + 1
        ).padStart(2, "0")}-${String(localStart.getDate()).padStart(
          2,
          "0"
        )}T${String(hour).padStart(2, "0")}:00:00`;
        hourlyData[hourKey] = { visits: 0, unique_visitors: 0 };
      }
    }

    // Aggregate visits by hour (convert UTC data back to local timezone for grouping)
    visitsData.forEach((metric) => {
      const metricDate = new Date(metric.datetime); // UTC date from DB
      const localMetricDate = new Date(
        metricDate.toLocaleString("en-US", { timeZone: timezone })
      );

      if (
        localStart &&
        localMetricDate.toDateString() === localStart.toDateString()
      ) {
        const hourKey = `${localStart.getFullYear()}-${String(
          localStart.getMonth() + 1
        ).padStart(2, "0")}-${String(localStart.getDate()).padStart(
          2,
          "0"
        )}T${String(localMetricDate.getHours()).padStart(2, "0")}:00:00`;
        if (hourlyData[hourKey]) {
          hourlyData[hourKey].visits += metric.visits;
        }
      }
    });

    // Count unique visitors by hour
    uniqueVisitorsData.forEach((visitor) => {
      const visitorDate = new Date(visitor.first_visit_at); // UTC date from DB
      const localVisitorDate = new Date(
        visitorDate.toLocaleString("en-US", { timeZone: timezone })
      );

      if (
        localStart &&
        localVisitorDate.toDateString() === localStart.toDateString()
      ) {
        const hourKey = `${localStart.getFullYear()}-${String(
          localStart.getMonth() + 1
        ).padStart(2, "0")}-${String(localStart.getDate()).padStart(
          2,
          "0"
        )}T${String(localVisitorDate.getHours()).padStart(2, "0")}:00:00`;
        if (hourlyData[hourKey]) {
          hourlyData[hourKey].unique_visitors += 1;
        }
      }
    });

    // Convert to chart format
    const chartData = Object.entries(hourlyData)
      .map(([datetime, data]) => ({
        date: datetime,
        visits: data.visits,
        unique_visitors: data.unique_visitors,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return chartData;
  } else {
    // Daily processing for other periods
    const dailyData: Record<
      string,
      { visits: number; unique_visitors: number }
    > = {};

    // Generate all dates in the range (skip for alltime)
    if (localStart) {
      const currentDate = new Date(localStart);
      while (currentDate <= localEnd) {
        const dateKey = currentDate.toISOString().split("T")[0];
        dailyData[dateKey] = { visits: 0, unique_visitors: 0 };
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    // Aggregate visits by date
    visitsData.forEach((metric) => {
      const dateKey = new Date(metric.datetime).toISOString().split("T")[0];
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { visits: 0, unique_visitors: 0 };
      }
      dailyData[dateKey].visits += metric.visits;
    });

    // Count unique visitors by date
    uniqueVisitorsData.forEach((visitor) => {
      const dateKey = new Date(visitor.first_visit_at)
        .toISOString()
        .split("T")[0];
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { visits: 0, unique_visitors: 0 };
      }
      dailyData[dateKey].unique_visitors += 1;
    });

    // Convert to chart format
    const chartData = Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        visits: data.visits,
        unique_visitors: data.unique_visitors,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return chartData;
  }
}

// Get summary statistics with period comparison
export async function getUrlSummaryStats(
  id: string,
  localStartDate: string, // ISO string in user's local time
  localEndDate: string, // ISO string in user's local time
  timePeriod: string, // "today", "7days" etc for cache keys
  _timezone: string // user's timezone (unused in summary stats)
) {
  // Note: timezone is not used in summary stats since we only do database queries
  // but kept for API consistency with getUrlAnalytics
  void _timezone;

  const redis = getRedisClient();
  const cacheKey = getCacheKey("summary", id, timePeriod);

  // Try to get from cache first
  try {
    const cachedData = await redis.get(cacheKey);
    if (cachedData && typeof cachedData === "string") {
      return JSON.parse(cachedData);
    }
  } catch (error) {
    console.warn("Redis cache read error:", error);
    // Continue with database query if cache fails
  }

  const supabase = await createClient();
  const urlId = parseInt(id);

  // Convert local dates to UTC for database queries
  const currentStartDateUTC = localStartDate
    ? new Date(localStartDate).toISOString()
    : null;
  const currentEndDateUTC = new Date(localEndDate).toISOString();

  // Calculate previous period by going back the same duration
  let previousStartDateUTC: string | null = null;
  let previousEndDateUTC: string | null = null;

  if (timePeriod !== "alltime" && localStartDate) {
    const duration =
      new Date(localEndDate).getTime() - new Date(localStartDate).getTime();
    const previousEndDate = new Date(localStartDate); // Previous period ends where current starts
    const previousStartDate = new Date(
      new Date(localStartDate).getTime() - duration
    );

    previousStartDateUTC = previousStartDate.toISOString();
    previousEndDateUTC = previousEndDate.toISOString();
  }

  // Fetch current period data
  const currentVisitsQuery = supabase
    .from("url_metric")
    .select("visits")
    .eq("url_id", urlId);

  if (currentStartDateUTC) {
    currentVisitsQuery.gte("datetime", currentStartDateUTC);
  }
  currentVisitsQuery.lte("datetime", currentEndDateUTC);

  const currentUniqueVisitorsQuery = supabase
    .from("unique_visitor")
    .select("*", { count: "exact", head: true })
    .eq("url_id", urlId);

  if (currentStartDateUTC) {
    currentUniqueVisitorsQuery.gte("first_visit_at", currentStartDateUTC);
  }
  currentUniqueVisitorsQuery.lte("first_visit_at", currentEndDateUTC);

  const currentReturningVisitorsQuery = supabase
    .from("unique_visitor")
    .select("first_visit_at, last_visit_at")
    .eq("url_id", urlId);

  if (currentStartDateUTC) {
    currentReturningVisitorsQuery.gte("first_visit_at", currentStartDateUTC);
  }
  currentReturningVisitorsQuery.lte("first_visit_at", currentEndDateUTC);

  const [
    { data: currentVisitsData, error: currentVisitsError },
    { count: currentUniqueVisitorsCount, error: currentUniqueVisitorsError },
    {
      data: currentReturningVisitorsData,
      error: currentReturningVisitorsError,
    },
  ] = await Promise.all([
    currentVisitsQuery,
    currentUniqueVisitorsQuery,
    currentReturningVisitorsQuery,
  ]);

  // Fetch previous period data (skip for alltime)
  let previousVisitsData: { visits: number }[] = [];
  let previousUniqueVisitorsCount = 0;
  let previousReturningVisitorsData: {
    first_visit_at: string;
    last_visit_at: string;
  }[] = [];
  let previousVisitsError = null;
  let previousUniqueVisitorsError = null;
  let previousReturningVisitorsError = null;

  if (timePeriod !== "alltime" && previousStartDateUTC && previousEndDateUTC) {
    const [
      { data: prevVisitsData, error: prevVisitsError },
      { count: prevUniqueVisitorsCount, error: prevUniqueVisitorsError },
      { data: prevReturningVisitorsData, error: prevReturningVisitorsError },
    ] = await Promise.all([
      // Previous period visits
      supabase
        .from("url_metric")
        .select("visits")
        .eq("url_id", urlId)
        .gte("datetime", previousStartDateUTC)
        .lte("datetime", previousEndDateUTC),

      // Previous period unique visitors
      supabase
        .from("unique_visitor")
        .select("*", { count: "exact", head: true })
        .eq("url_id", urlId)
        .gte("first_visit_at", previousStartDateUTC)
        .lte("first_visit_at", previousEndDateUTC),

      // Previous period returning visitors
      supabase
        .from("unique_visitor")
        .select("first_visit_at, last_visit_at")
        .eq("url_id", urlId)
        .gte("first_visit_at", previousStartDateUTC)
        .lte("first_visit_at", previousEndDateUTC),
    ]);

    previousVisitsData = prevVisitsData || [];
    previousUniqueVisitorsCount = prevUniqueVisitorsCount || 0;
    previousReturningVisitorsData = prevReturningVisitorsData || [];
    previousVisitsError = prevVisitsError;
    previousUniqueVisitorsError = prevUniqueVisitorsError;
    previousReturningVisitorsError = prevReturningVisitorsError;
  }

  // Handle errors
  if (
    currentVisitsError ||
    currentUniqueVisitorsError ||
    currentReturningVisitorsError
  ) {
    throw new Error("Failed to fetch current period data");
  }

  if (
    previousVisitsError ||
    previousUniqueVisitorsError ||
    previousReturningVisitorsError
  ) {
    throw new Error("Failed to fetch previous period data");
  }

  // Calculate current period totals
  const currentTotalVisits =
    currentVisitsData?.reduce((sum, metric) => sum + metric.visits, 0) || 0;
  const currentUniqueVisitors = currentUniqueVisitorsCount || 0;
  const currentReturningVisitors =
    currentReturningVisitorsData?.filter(
      (visitor) => visitor.first_visit_at !== visitor.last_visit_at
    ).length || 0;

  // Calculate previous period totals
  const previousTotalVisits =
    previousVisitsData?.reduce((sum, metric) => sum + metric.visits, 0) || 0;
  const previousUniqueVisitors = previousUniqueVisitorsCount || 0;
  const previousReturningVisitors =
    previousReturningVisitorsData?.filter(
      (visitor) => visitor.first_visit_at !== visitor.last_visit_at
    ).length || 0;

  // Calculate percentage changes (skip for alltime)
  let totalVisitsChange = 0;
  let uniqueVisitorsChange = 0;
  let returningVisitorsChange = 0;

  if (timePeriod !== "alltime") {
    const calculatePercentageChange = (
      current: number,
      previous: number
    ): number => {
      if (previous === 0) {
        return current > 0 ? 100 : 0; // If no previous data, show 100% if current > 0
      }
      return Math.round(((current - previous) / previous) * 100);
    };

    totalVisitsChange = calculatePercentageChange(
      currentTotalVisits,
      previousTotalVisits
    );
    uniqueVisitorsChange = calculatePercentageChange(
      currentUniqueVisitors,
      previousUniqueVisitors
    );
    returningVisitorsChange = calculatePercentageChange(
      currentReturningVisitors,
      previousReturningVisitors
    );
  }

  const summaryStats = {
    totalVisits: currentTotalVisits,
    uniqueVisitors: currentUniqueVisitors,
    returningVisitors: currentReturningVisitors,
    totalVisitsChange,
    uniqueVisitorsChange,
    returningVisitorsChange,
  };

  // Cache the results with appropriate TTL
  try {
    const ttl = getCacheTTL(timePeriod);
    await redis.setex(cacheKey, ttl, JSON.stringify(summaryStats));
  } catch (error) {
    console.warn("Redis cache write error:", error);
    // Continue without caching if Redis fails
  }

  return summaryStats;
}

// Delete url (cascades to metrics)
export async function deleteUrl(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not found");
  }

  const { error } = await supabase
    .from("url")
    .delete()
    .eq("id", parseInt(id))
    .eq("user_id", user.id);

  if (error) {
    throw new Error("Failed to delete url");
  }

  return { success: true };
}

"use server";

import { createClient } from "@/lib/supabase/supabase-server";

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

// Get url metrics (legacy - keeping for compatibility)
export async function getUrlMetrics(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("url_metric")
    .select("*")
    .order("datetime", { ascending: false })
    .eq("url_id", parseInt(id));

  if (error) {
    throw new Error("Failed to get url metrics");
  }

  return data;
}

// Get comprehensive analytics data with proper grouping and unique visitor counts
export async function getUrlAnalytics(id: string, timePeriod: string) {
  const supabase = await createClient();
  const urlId = parseInt(id);

  // Determine date range based on time period
  const now = new Date();
  let startDate: Date | null;
  let isHourly = false;

  switch (timePeriod) {
    case "today":
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      isHourly = true;
      break;
    case "7days":
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "30days":
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "3months":
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 90);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "alltime":
      // For all time, we'll fetch all data (no start date filter)
      startDate = null;
      break;
    default:
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      isHourly = true;
  }

  // Fetch visits data
  const visitsQuery = supabase
    .from("url_metric")
    .select("datetime, visits")
    .eq("url_id", urlId);

  if (startDate) {
    visitsQuery.gte("datetime", startDate.toISOString());
  }

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

  if (startDate) {
    uniqueVisitorsQuery.gte("first_visit_at", startDate.toISOString());
  }

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

    // Initialize all 24 hours with zero values
    for (let hour = 0; hour < 24; hour++) {
      const hourKey = `${now.getFullYear()}-${String(
        now.getMonth() + 1
      ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${String(
        hour
      ).padStart(2, "0")}:00:00`;
      hourlyData[hourKey] = { visits: 0, unique_visitors: 0 };
    }

    // Aggregate visits by hour
    visitsData.forEach((metric) => {
      const metricDate = new Date(metric.datetime);
      if (metricDate.toDateString() === now.toDateString()) {
        const hourKey = `${metricDate.getFullYear()}-${String(
          metricDate.getMonth() + 1
        ).padStart(2, "0")}-${String(metricDate.getDate()).padStart(
          2,
          "0"
        )}T${String(metricDate.getHours()).padStart(2, "0")}:00:00`;
        if (hourlyData[hourKey]) {
          hourlyData[hourKey].visits += metric.visits;
        }
      }
    });

    // Count unique visitors by hour
    uniqueVisitorsData.forEach((visitor) => {
      const visitorDate = new Date(visitor.first_visit_at);
      if (visitorDate.toDateString() === now.toDateString()) {
        const hourKey = `${visitorDate.getFullYear()}-${String(
          visitorDate.getMonth() + 1
        ).padStart(2, "0")}-${String(visitorDate.getDate()).padStart(
          2,
          "0"
        )}T${String(visitorDate.getHours()).padStart(2, "0")}:00:00`;
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
    if (startDate) {
      const currentDate = new Date(startDate);
      while (currentDate <= now) {
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
export async function getUrlSummaryStats(id: string, timePeriod: string) {
  const supabase = await createClient();
  const urlId = parseInt(id);

  // Calculate date ranges for current and previous periods
  const now = new Date();
  let currentStartDate: Date | null;
  let previousStartDate: Date | null;
  let previousEndDate: Date | null;

  switch (timePeriod) {
    case "today":
      // Current: today (00:00 to now)
      currentStartDate = new Date(now);
      currentStartDate.setHours(0, 0, 0, 0);

      // Previous: yesterday (00:00 to 23:59)
      previousEndDate = new Date(currentStartDate);
      previousEndDate.setMilliseconds(-1); // End of yesterday
      previousStartDate = new Date(previousEndDate);
      previousStartDate.setHours(0, 0, 0, 0);
      break;

    case "7days":
      // Current: last 7 days
      currentStartDate = new Date(now);
      currentStartDate.setDate(currentStartDate.getDate() - 7);
      currentStartDate.setHours(0, 0, 0, 0);

      // Previous: 7 days before that (days 8-14 ago)
      previousEndDate = new Date(currentStartDate);
      previousEndDate.setMilliseconds(-1);
      previousStartDate = new Date(previousEndDate);
      previousStartDate.setDate(previousStartDate.getDate() - 6);
      previousStartDate.setHours(0, 0, 0, 0);
      break;

    case "30days":
      // Current: last 30 days
      currentStartDate = new Date(now);
      currentStartDate.setDate(currentStartDate.getDate() - 30);
      currentStartDate.setHours(0, 0, 0, 0);

      // Previous: 30 days before that (days 31-60 ago)
      previousEndDate = new Date(currentStartDate);
      previousEndDate.setMilliseconds(-1);
      previousStartDate = new Date(previousEndDate);
      previousStartDate.setDate(previousStartDate.getDate() - 29);
      previousStartDate.setHours(0, 0, 0, 0);
      break;

    case "3months":
      // Current: last 90 days
      currentStartDate = new Date(now);
      currentStartDate.setDate(currentStartDate.getDate() - 90);
      currentStartDate.setHours(0, 0, 0, 0);

      // Previous: 90 days before that (days 91-180 ago)
      previousEndDate = new Date(currentStartDate);
      previousEndDate.setMilliseconds(-1);
      previousStartDate = new Date(previousEndDate);
      previousStartDate.setDate(previousStartDate.getDate() - 89);
      previousStartDate.setHours(0, 0, 0, 0);
      break;

    case "alltime":
      // For all time, we fetch all data (no comparison needed)
      currentStartDate = null;
      // Set previous dates to null - we won't use them for all time
      previousStartDate = null;
      previousEndDate = null;
      break;

    default:
      // Default to today
      currentStartDate = new Date(now);
      currentStartDate.setHours(0, 0, 0, 0);

      previousEndDate = new Date(currentStartDate);
      previousEndDate.setMilliseconds(-1);
      previousStartDate = new Date(previousEndDate);
      previousStartDate.setHours(0, 0, 0, 0);
  }

  // Fetch current period data
  const currentVisitsQuery = supabase
    .from("url_metric")
    .select("visits")
    .eq("url_id", urlId);

  if (currentStartDate) {
    currentVisitsQuery.gte("datetime", currentStartDate.toISOString());
  }

  const currentUniqueVisitorsQuery = supabase
    .from("unique_visitor")
    .select("*", { count: "exact", head: true })
    .eq("url_id", urlId);

  if (currentStartDate) {
    currentUniqueVisitorsQuery.gte(
      "first_visit_at",
      currentStartDate.toISOString()
    );
  }

  const currentReturningVisitorsQuery = supabase
    .from("unique_visitor")
    .select("first_visit_at, last_visit_at")
    .eq("url_id", urlId);

  if (currentStartDate) {
    currentReturningVisitorsQuery.gte(
      "first_visit_at",
      currentStartDate.toISOString()
    );
  }

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

  if (timePeriod !== "alltime" && previousStartDate && previousEndDate) {
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
        .gte("datetime", previousStartDate.toISOString())
        .lte("datetime", previousEndDate.toISOString()),

      // Previous period unique visitors
      supabase
        .from("unique_visitor")
        .select("*", { count: "exact", head: true })
        .eq("url_id", urlId)
        .gte("first_visit_at", previousStartDate.toISOString())
        .lte("first_visit_at", previousEndDate.toISOString()),

      // Previous period returning visitors
      supabase
        .from("unique_visitor")
        .select("first_visit_at, last_visit_at")
        .eq("url_id", urlId)
        .gte("first_visit_at", previousStartDate.toISOString())
        .lte("first_visit_at", previousEndDate.toISOString()),
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

  return {
    totalVisits: currentTotalVisits,
    uniqueVisitors: currentUniqueVisitors,
    returningVisitors: currentReturningVisitors,
    totalVisitsChange,
    uniqueVisitorsChange,
    returningVisitorsChange,
  };
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

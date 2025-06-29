"use client";

import { useParams, useRouter } from "next/navigation";
import { getUrlAnalytics, getUrlSummaryStats, deleteUrl } from "./actions";
import { Suspense, useEffect, useState } from "react";
import * as React from "react";
import { useUrls } from "@/contexts/url-context";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  Trash2,
  Eye,
  Users,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import Loading from "./loading";
import { ChartAreaInteractive } from "@/components/ui/chart-area-interactive";
import { Card, CardContent } from "@/components/ui/card";

interface ChartDataPoint {
  date: string;
  visits: number;
  unique_visitors: number;
  [key: string]: string | number;
}

interface SummaryStats {
  totalVisits: number;
  uniqueVisitors: number;
  returningVisitors: number;
  totalVisitsChange: number;
  uniqueVisitorsChange: number;
  returningVisitorsChange: number;
}

const timePeriodOptions = [
  { value: "today", label: "Today", days: 1 },
  { value: "7days", label: "Last 7 Days", days: 7 },
  { value: "30days", label: "Last 30 Days", days: 30 },
  { value: "3months", label: "Last 3 Months", days: 90 },
  { value: "alltime", label: "All Time", days: undefined },
];

export default function AnalyticsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { removeUrl, userUrls } = useUrls();
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [summaryStats, setSummaryStats] = useState<SummaryStats>({
    totalVisits: 0,
    uniqueVisitors: 0,
    returningVisitors: 0,
    totalVisitsChange: 0,
    uniqueVisitorsChange: 0,
    returningVisitorsChange: 0,
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("today");

  // Get the current URL from context instead of API call
  const url = userUrls.find((u) => u.id === parseInt(id as string)) || null;

  // Calculate local date ranges based on selected period
  const calculateDateRange = (period: string) => {
    const now = new Date(); // User's local time
    let startDate: Date;
    let endDate: Date;
    let isHourly = false;

    switch (period) {
      case "today":
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0); // Local midnight
        endDate = new Date(now); // Use current time for today
        isHourly = true;
        break;
      case "7days":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0); // Local midnight 7 days ago
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999); // End of today to include full day
        break;
      case "30days":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0); // Local midnight 30 days ago
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999); // End of today to include full day
        break;
      case "3months":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 90);
        startDate.setHours(0, 0, 0, 0); // Local midnight 90 days ago
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999); // End of today to include full day
        break;
      case "alltime":
        // For alltime, let the actions find the earliest valid data point
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        return {
          startDate: null,
          endDate: endDate.toISOString(),
          isHourly: false,
        };
      default:
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now); // Use current time for default
        isHourly = true;
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      isHourly,
    };
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!url) return; // Only fetch data if we have the URL from context

      try {
        const { startDate, endDate } = calculateDateRange(selectedPeriod);
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        // Fetch chart data and summary stats in parallel with new parameters
        const [chartResponse, statsResponse] = await Promise.all([
          getUrlAnalytics(
            id as string,
            startDate, // Pass null for alltime, actions will find earliest valid date
            endDate,
            selectedPeriod,
            timezone
          ),
          getUrlSummaryStats(
            id as string,
            startDate, // Pass null for alltime, actions will find earliest valid date
            endDate,
            selectedPeriod,
            timezone
          ),
        ]);

        setChartData(chartResponse);
        setSummaryStats(statsResponse);
      } catch (error) {
        console.error("Failed to fetch analytics data:", error);
      }
    };
    fetchData();
  }, [id, url, selectedPeriod]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteUrl(id as string);
      // Remove URL from context instead of redirecting
      removeUrl(parseInt(id as string));
      router.push("/dashboard");
    } catch (error) {
      console.error("Failed to delete URL:", error);
    } finally {
      setIsDeleting(false);
      setIsDialogOpen(false);
    }
  };

  const handleGoTo = () => {
    if (url?.long_url) {
      window.open(url.long_url, "_blank");
    }
  };

  return (
    <Suspense fallback={<Loading />}>
      <div className="flex flex-col gap-6 w-full">
        {/* Header Section */}
        <div className="p-4 sm:p-6 border-b border-white/10 bg-white/5 backdrop-blur rounded-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
            <h1 className="text-white text-lg sm:text-xl font-semibold truncate mr-0 sm:mr-4">
              {url?.long_url}
            </h1>
            <div className="flex gap-2 self-end sm:self-auto">
              <Button
                size="icon"
                variant="outline"
                onClick={handleGoTo}
                className="bg-white/10 border-white/20 text-white hover:bg-white/90 hover:text-black h-8 w-8 sm:h-10 sm:w-10"
                title="Go to URL"
              >
                <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="icon"
                    variant="outline"
                    className="bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/90 hover:text-white h-8 w-8 sm:h-10 sm:w-10"
                    title="Delete URL"
                  >
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-black/20 backdrop-blur-xl border border-white/10 shadow-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-white text-xl font-semibold tracking-tight">
                      Delete URL
                    </DialogTitle>
                  </DialogHeader>
                  <div className="py-6">
                    <div className="space-y-4">
                      <p className="text-white/80 leading-relaxed">
                        Are you sure you want to delete this URL? This action
                        cannot be undone and will permanently remove all
                        associated analytics data.
                      </p>
                      <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-4">
                        <p className="text-white/90 text-sm break-all font-mono">
                          {url?.long_url}
                        </p>
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      disabled={isDeleting}
                      className="bg-white/5 border-white/20 text-white hover:text-white hover:bg-white/10 hover:border-white/30 transition-all duration-200"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="bg-red-500/80 hover:bg-red-500 border-red-400/30 shadow-lg shadow-red-500/20 transition-all duration-200"
                    >
                      {isDeleting ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Deleting...
                        </span>
                      ) : (
                        "Delete Forever"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Key Metrics */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Total Visits */}
          <Card className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 hover:border-white/30 transition-all duration-300 group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardContent className="px-4 sm:px-6 py-4 relative z-10">
              <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="p-2 sm:p-3 bg-blue-500/20 rounded-xl">
                  <Eye className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-white/70 text-xs sm:text-sm font-medium uppercase tracking-wide">
                    Total Visits
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-3xl sm:text-4xl font-bold text-white">
                  {summaryStats.totalVisits.toLocaleString()}
                </p>
                {selectedPeriod !== "alltime" && (
                  <div className="flex items-center gap-2">
                    {summaryStats.totalVisitsChange >= 0 ? (
                      <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-400" />
                    ) : (
                      <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-400" />
                    )}
                    <span
                      className={`text-xs sm:text-sm font-medium ${
                        summaryStats.totalVisitsChange >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {summaryStats.totalVisitsChange >= 0 ? "+" : ""}
                      {summaryStats.totalVisitsChange}% from last period
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Unique Visitors */}
          <Card className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 hover:border-white/30 transition-all duration-300 group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardContent className="px-4 sm:px-6 py-4 relative z-10">
              <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="p-2 sm:p-3 bg-purple-500/20 rounded-xl">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-white/70 text-xs sm:text-sm font-medium uppercase tracking-wide">
                    Unique Visitors
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-3xl sm:text-4xl font-bold text-white">
                  {summaryStats.uniqueVisitors.toLocaleString()}
                </p>
                {selectedPeriod !== "alltime" && (
                  <div className="flex items-center gap-2">
                    {summaryStats.uniqueVisitorsChange >= 0 ? (
                      <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-400" />
                    ) : (
                      <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-400" />
                    )}
                    <span
                      className={`text-xs sm:text-sm font-medium ${
                        summaryStats.uniqueVisitorsChange >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {summaryStats.uniqueVisitorsChange >= 0 ? "+" : ""}
                      {summaryStats.uniqueVisitorsChange}% from last period
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Returning Visitors */}
          <Card className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 hover:border-white/30 transition-all duration-300 group overflow-hidden sm:col-span-2 lg:col-span-1">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardContent className="px-4 sm:px-6 py-4 relative z-10">
              <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="p-2 sm:p-3 bg-green-500/20 rounded-xl">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-green-400" />
                </div>
                <div>
                  <p className="text-white/70 text-xs sm:text-sm font-medium uppercase tracking-wide">
                    Returning Visitors
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-3xl sm:text-4xl font-bold text-white">
                  {summaryStats.returningVisitors.toLocaleString()}
                </p>
                {selectedPeriod !== "alltime" && (
                  <div className="flex items-center gap-2">
                    {summaryStats.returningVisitorsChange >= 0 ? (
                      <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-400" />
                    ) : (
                      <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-400" />
                    )}
                    <span
                      className={`text-xs sm:text-sm font-medium ${
                        summaryStats.returningVisitorsChange >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {summaryStats.returningVisitorsChange >= 0 ? "+" : ""}
                      {summaryStats.returningVisitorsChange}% from last period
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Metrics Content */}
        <div className="">
          <ChartAreaInteractive
            ninjaMode={true}
            filterOptions={timePeriodOptions}
            defaultFilter="today"
            title="URL Analytics"
            description="Track visits to your shortened URL over time"
            data={chartData}
            timeGranularity={
              calculateDateRange(selectedPeriod).isHourly ? "hourly" : "daily"
            }
            hideXAxisLabels={selectedPeriod === "alltime"}
            onFilterChange={setSelectedPeriod}
          />
        </div>
      </div>
    </Suspense>
  );
}

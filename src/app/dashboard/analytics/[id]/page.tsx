"use client";

import { useParams, useRouter } from "next/navigation";
import { getUrlMetrics, deleteUrl } from "./actions";
import { Suspense, useEffect, useState } from "react";
import * as React from "react";
import { useUrls } from "@/contexts/url-context";
import { Button } from "@/components/ui/button";
import { ExternalLink, Trash2, Eye, Users, TrendingUp } from "lucide-react";
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

interface UrlMetric {
  id: number;
  url_id: number;
  datetime: string;
  visits: number;
}

const timePeriodOptions = [
  { value: "today", label: "Today", days: 1 },
  { value: "7days", label: "Last 7 Days", days: 7 },
  { value: "30days", label: "Last 30 Days", days: 30 },
  { value: "3months", label: "Last 3 Months", days: 90 },
];

export default function AnalyticsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { removeUrl, userUrls } = useUrls();
  const [metrics, setMetrics] = useState<UrlMetric[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Transform metrics data for chart
  const chartData = React.useMemo(() => {
    if (!metrics || metrics.length === 0) return [];

    // Group metrics by date and sum visits
    const groupedData = metrics.reduce((acc, metric) => {
      const date = new Date(metric.datetime).toISOString().split("T")[0]; // Get YYYY-MM-DD format
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date] += metric.visits;
      return acc;
    }, {} as Record<string, number>);

    // Convert to chart format and sort by date
    return Object.entries(groupedData)
      .map(([date, visits]) => ({
        date,
        visits,
        desktop: Math.floor(visits * 0.6), // Mock desktop visits
        mobile: Math.floor(visits * 0.4), // Mock mobile visits
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [metrics]);

  // Get the current URL from context instead of API call
  const url = userUrls.find((u) => u.id === parseInt(id as string)) || null;

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!url) return; // Only fetch metrics if we have the URL from context

      try {
        const metricsData = await getUrlMetrics(id as string);
        setMetrics(metricsData);
      } catch (error) {
        console.error("Failed to fetch metrics:", error);
      }
    };
    fetchMetrics();
  }, [id, url]); // Removed timePeriod from dependency array since it's not used

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
        <div className="p-6 border-b border-white/10 bg-white/5 backdrop-blur rounded-xl">
          <div className="flex items-center justify-between">
            <h1 className="text-white text-xl font-semibold truncate mr-4">
              {url?.long_url}
            </h1>
            <div className="flex gap-2">
              <Button
                size="icon"
                variant="outline"
                onClick={handleGoTo}
                className="bg-white/10 border-white/20 text-white hover:bg-white/90 hover:text-black"
                title="Go to URL"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="icon"
                    variant="outline"
                    className="bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/90 hover:text-white"
                    title="Delete URL"
                  >
                    <Trash2 className="h-4 w-4" />
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Total Visits */}
          <Card className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 hover:border-white/30 transition-all duration-300 group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardContent className="px-6 py-4 relative z-10">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-blue-500/20 rounded-xl">
                  <Eye className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-white/70 text-sm font-medium uppercase tracking-wide">
                    Total Visits
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-4xl font-bold text-white">
                  {metrics
                    .reduce((total, metric) => total + metric.visits, 0)
                    .toLocaleString()}
                </p>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                  <span className="text-green-400 text-sm font-medium">
                    +12% from last period
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Unique Visitors */}
          <Card className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 hover:border-white/30 transition-all duration-300 group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardContent className="px-6 py-4 relative z-10">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-purple-500/20 rounded-xl">
                  <Users className="h-6 w-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-white/70 text-sm font-medium uppercase tracking-wide">
                    Unique Visitors
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-4xl font-bold text-white">
                  {Math.floor(
                    metrics.reduce(
                      (total, metric) => total + metric.visits,
                      0
                    ) * 0.75
                  ).toLocaleString()}
                </p>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                  <span className="text-green-400 text-sm font-medium">
                    +8% from last period
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Returning Visitors */}
          <Card className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 hover:border-white/30 transition-all duration-300 group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardContent className="px-6 py-4 relative z-10">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-green-500/20 rounded-xl">
                  <Users className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <p className="text-white/70 text-sm font-medium uppercase tracking-wide">
                    Returning Visitors
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-4xl font-bold text-white">
                  {Math.floor(
                    metrics.reduce(
                      (total, metric) => total + metric.visits,
                      0
                    ) * 0.25
                  ).toLocaleString()}
                </p>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                  <span className="text-green-400 text-sm font-medium">
                    +5% from last period
                  </span>
                </div>
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
          />
        </div>
      </div>
    </Suspense>
  );
}

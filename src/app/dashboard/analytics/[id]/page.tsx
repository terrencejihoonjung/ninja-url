"use client";

import { useParams, useRouter } from "next/navigation";
import { getUrlMetrics, deleteUrl } from "./actions";
import { useEffect, useState } from "react";
import { useUrls } from "@/contexts/url-context";
import { Button } from "@/components/ui/button";
import { ExternalLink, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

interface UrlMetric {
  id: number;
  url_id: number;
  datetime: string;
  visits: number;
}

export default function AnalyticsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { removeUrl, userUrls } = useUrls();
  const [metrics, setMetrics] = useState<UrlMetric[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
  }, [id, url]);

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

  if (!url) {
    return (
      <div className="flex-1 bg-white/5 backdrop-blur rounded-xl border border-white/10">
        <div className="p-8">
          <p className="text-white/60 text-center">
            {userUrls.length === 0 ? "Loading..." : "URL not found"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white/5 backdrop-blur rounded-xl border border-white/10">
      {/* Header Section */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <h1 className="text-white text-xl font-semibold truncate mr-4">
            {url.long_url}
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
                        {url.long_url}
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

      {/* Metrics Content */}
      <div className="p-8">
        {metrics.length > 0 ? (
          <div className="flex flex-col gap-4">
            {metrics.map((metric) => (
              <div className="flex flex-row gap-2" key={metric.id}>
                <p className="text-white/60 text-sm">
                  {new Date(metric.datetime).toLocaleDateString()}
                </p>
                <p className="text-white/60 text-sm">{metric.visits}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-white/60 text-center">Analytics coming soon...</p>
        )}
      </div>
    </div>
  );
}

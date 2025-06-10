"use client";

import { useParams } from "next/navigation";
import { getUrlMetrics } from "./actions";
import { useEffect, useState } from "react";

interface UrlMetric {
  id: number;
  url_id: number;
  datetime: string;
  visits: number;
}

export default function AnalyticsPage() {
  const { id } = useParams();
  const [metrics, setMetrics] = useState<UrlMetric[]>([]);

  useEffect(() => {
    const fetchMetrics = async () => {
      const data = await getUrlMetrics(id as string);
      setMetrics(data);
    };
    fetchMetrics();
  }, [id]);
  return (
    <div className="flex-1 bg-white/5 backdrop-blur rounded-xl border border-white/10">
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

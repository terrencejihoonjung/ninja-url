"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const description = "An interactive area chart";

interface FilterOption {
  value: string;
  label: string;
  days?: number; // Optional: number of days to filter
}

interface ChartAreaInteractiveProps {
  ninjaMode?: boolean;
  filterOptions?: FilterOption[];
  defaultFilter?: string;
  title?: string;
  description?: string;
  timeGranularity?: "hourly" | "daily";
  onFilterChange?: (value: string) => void;
  data?: Array<{
    date: string;
    visits: number;
    unique_visitors: number;
    [key: string]: string | number;
  }>;
}

// Default filter options
const defaultFilterOptions: FilterOption[] = [
  { value: "90d", label: "Last 3 months", days: 90 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "7d", label: "Last 7 days", days: 7 },
];

const chartConfig = {
  visits: {
    label: "Visits",
    color: "var(--chart-1)",
  },
  unique_visitors: {
    label: "Unique Visitors",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function ChartAreaInteractive({
  ninjaMode,
  filterOptions = defaultFilterOptions,
  defaultFilter,
  title = "Area Chart - Interactive",
  description = "Showing total visitors for the last 3 months",
  timeGranularity = "daily",
  onFilterChange,
  data: customData,
}: ChartAreaInteractiveProps) {
  // Use the first filter option as default if no default is provided
  const initialFilter = defaultFilter || filterOptions[0]?.value || "90d";
  const [timeRange, setTimeRange] = React.useState(initialFilter);

  // Handle filter changes
  const handleFilterChange = (value: string) => {
    setTimeRange(value);
    onFilterChange?.(value);
  };

  // Use custom data if provided, otherwise use default chart data
  const chartDataSource = React.useMemo(() => customData ?? [], [customData]);

  const filteredData = React.useMemo(() => {
    const selectedFilter = filterOptions.find((f) => f.value === timeRange);
    if (!selectedFilter || !chartDataSource.length) return chartDataSource;

    // If days is specified in the filter option, use it for filtering
    if (selectedFilter.days) {
      const now = new Date();
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - selectedFilter.days);

      return chartDataSource.filter((item) => {
        const itemDate = new Date(item.date);
        return itemDate >= startDate;
      });
    }

    // Default return if no days specified
    return chartDataSource;
  }, [chartDataSource, timeRange, filterOptions]);

  return (
    <Card
      className={cn(
        "pt-0",
        ninjaMode && "bg-white/5 backdrop-blur border-white/10"
      )}
    >
      <CardHeader
        className={cn(
          "flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row",
          ninjaMode && "border-white/10"
        )}
      >
        <div className="grid flex-1 gap-1">
          <CardTitle className={cn(ninjaMode && "text-white")}>
            {title}
          </CardTitle>
          <CardDescription className={cn(ninjaMode && "text-white/60")}>
            {description}
          </CardDescription>
        </div>
        <Select value={timeRange} onValueChange={handleFilterChange}>
          <SelectTrigger
            className={cn(
              "hidden w-[160px] rounded-lg sm:ml-auto sm:flex",
              ninjaMode &&
                "bg-white/10 border-white/20 text-white hover:bg-white/20"
            )}
            aria-label="Select a value"
          >
            <SelectValue
              placeholder={filterOptions[0]?.label || "Select period"}
            />
          </SelectTrigger>
          <SelectContent
            className={cn(
              "rounded-xl",
              ninjaMode && "bg-black/90 backdrop-blur border-white/10"
            )}
          >
            {filterOptions.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className={cn(
                  "rounded-lg",
                  ninjaMode &&
                    "text-white hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white"
                )}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart
            data={filteredData}
            margin={{
              left: -20,
              right: 12,
            }}
          >
            <defs>
              <linearGradient id="fillVisits" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={
                    ninjaMode
                      ? "rgba(140, 200, 255, 0.9)"
                      : "var(--color-visits)"
                  }
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor={
                    ninjaMode
                      ? "rgba(140, 200, 255, 0.1)"
                      : "var(--color-visits)"
                  }
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient
                id="fillUniqueVisitors"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor={
                    ninjaMode
                      ? "rgba(200, 140, 255, 0.7)"
                      : "var(--color-unique_visitors)"
                  }
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor={
                    ninjaMode
                      ? "rgba(200, 140, 255, 0.05)"
                      : "var(--color-unique_visitors)"
                  }
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke={ninjaMode ? "rgba(255, 255, 255, 0.1)" : undefined}
            />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tick={{
                fill: ninjaMode ? "rgba(255, 255, 255, 0.7)" : undefined,
                fontSize: 12,
              }}
              tickFormatter={(value) => {
                const date = new Date(value);
                if (timeGranularity === "hourly") {
                  // Format as "1 AM", "2 PM", etc.
                  return date.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    hour12: true,
                  });
                } else {
                  // Format as "Apr 1", "Apr 2", etc.
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });
                }
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickCount={5}
              tick={{
                fill: ninjaMode ? "rgba(255, 255, 255, 0.7)" : undefined,
                fontSize: 12,
              }}
            />
            <ChartTooltip
              cursor={false}
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) {
                  return null;
                }

                const date = new Date(label);
                const formattedLabel =
                  timeGranularity === "hourly"
                    ? date.toLocaleTimeString("en-US", {
                        hour: "numeric",
                        hour12: true,
                      })
                    : date.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      });

                return (
                  <div
                    className={cn(
                      "rounded-lg border bg-background p-2 shadow-md",
                      ninjaMode &&
                        "bg-black/90 backdrop-blur border-white/10 text-white"
                    )}
                  >
                    <p className="font-medium">{formattedLabel}</p>
                    {payload.map((entry, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-sm">
                          {entry.dataKey}: {entry.value}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              }}
            />
            <Area
              dataKey="visits"
              type="natural"
              fill="url(#fillVisits)"
              fillOpacity={0.4}
              stroke={
                ninjaMode ? "rgba(140, 200, 255, 0.9)" : "var(--color-visits)"
              }
              strokeWidth={2}
            />
            <Area
              dataKey="unique_visitors"
              type="natural"
              fill="url(#fillUniqueVisitors)"
              fillOpacity={0.4}
              stroke={
                ninjaMode
                  ? "rgba(200, 140, 255, 0.7)"
                  : "var(--color-unique_visitors)"
              }
              strokeWidth={2}
            />
            <ChartLegend
              content={
                <ChartLegendContent
                  className={cn(ninjaMode && "text-white/80")}
                />
              }
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

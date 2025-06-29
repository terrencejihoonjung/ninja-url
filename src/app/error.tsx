"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home, RefreshCw, Clock, Shield } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const searchParams = useSearchParams();
  const isRateLimit = searchParams.get("type") === "rate-limit";
  const rateLimitMessage = searchParams.get("message");
  const waitTime = parseInt(searchParams.get("waitTime") || "0");
  const limit = searchParams.get("limit");
  const resetTime = parseInt(searchParams.get("resetTime") || "0");

  const [countdown, setCountdown] = useState(waitTime);
  const [canRetry, setCanRetry] = useState(false);

  useEffect(() => {
    if (!isRateLimit || waitTime <= 0) return;

    const timer = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((resetTime - now) / 1000));
      setCountdown(remaining);

      if (remaining <= 0) {
        setCanRetry(true);
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isRateLimit, waitTime, resetTime]);

  // Rate limit error UI
  if (isRateLimit) {
    return (
      <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="w-full max-w-md text-center space-y-6">
          {/* Rate Limit Icon */}
          <div className="flex justify-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-950">
              <Shield className="size-8 text-orange-600 dark:text-orange-400" />
            </div>
          </div>

          {/* Rate Limit Content */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              Rate Limit Exceeded
            </h1>
            <p className="text-muted-foreground">
              {rateLimitMessage || "Too many requests. Please slow down."}
            </p>
            {limit && (
              <p className="text-sm text-muted-foreground">
                Limit: {limit} requests per time window
              </p>
            )}
          </div>

          {/* Countdown Timer */}
          {countdown > 0 && !canRetry && (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-lg font-mono">
                <Clock className="size-5 text-orange-600 dark:text-orange-400" />
                <span className="text-orange-600 dark:text-orange-400">
                  {countdown}s
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Please wait before trying again
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2 text-sm">
            {canRetry || countdown <= 0 ? (
              <Button
                onClick={() => window.location.reload()}
                className="w-full"
              >
                <RefreshCw className="mr-2 size-4" />
                Try Again
              </Button>
            ) : (
              <Button disabled variant="outline" className="w-full">
                <Clock className="mr-2 size-4" />
                Wait {countdown}s
              </Button>
            )}

            <Button
              variant="ghost"
              asChild
              className="w-full text-muted-foreground hover:text-foreground"
            >
              <Link href="/">
                <Home className="mr-2 size-4" />
                Go Home
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Regular error UI
  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="w-full max-w-md text-center space-y-6">
        {/* Error Icon */}
        <div className="flex justify-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-950">
            <AlertCircle className="size-8 text-red-600 dark:text-red-400" />
          </div>
        </div>

        {/* Error Content */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            {error.message || "Unexpected Error"}
          </h1>
          <p className="text-muted-foreground">
            Something went wrong. This could be due to a network issue,
            temporary server problem, or an unexpected error occurred.
          </p>
        </div>

        {/* Additional Actions */}
        <div className="flex flex-col gap-2 text-sm">
          <Button
            variant="ghost"
            onClick={reset}
            className="w-full text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>

          <Button
            variant="ghost"
            asChild
            className="w-full text-muted-foreground hover:text-foreground"
          >
            <Link href="/">
              <Home className="mr-2 size-4" />
              Go Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

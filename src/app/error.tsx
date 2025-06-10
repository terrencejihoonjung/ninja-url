"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
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

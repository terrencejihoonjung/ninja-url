"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, Home, RefreshCw } from "lucide-react";

export default function ErrorPage() {
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
            Unexpected Error
          </h1>
          <p className="text-muted-foreground">
            Something went wrong. This could be due to a network issue,
            temporary server problem, or an unexpected error occurred.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild className="w-full sm:w-auto">
            <Link href="/login">
              <ArrowLeft className="mr-2 size-4" />
              Back to Login
            </Link>
          </Button>

          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link href="/signup">Create Account</Link>
          </Button>
        </div>

        {/* Additional Actions */}
        <div className="flex flex-col gap-2 text-sm">
          <Button
            variant="ghost"
            onClick={() => window.location.reload()}
            className="w-full text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="mr-2 size-4" />
            Try Again
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

        {/* Help Text */}
        <div className="text-xs text-muted-foreground">
          <p>
            If you continue to experience issues, please try refreshing the page
            or check your internet connection.
          </p>
        </div>
      </div>
    </div>
  );
}

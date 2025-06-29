"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { signOut } from "@/app/dashboard/actions";
import { UrlRow } from "@/components/dashboard/row";
import { RefreshCcwIcon, Trash2 } from "lucide-react";
import { UrlProvider, useUrls } from "@/contexts/url-context";
import { toast } from "sonner";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

// Inner component that uses the URL context
function DashboardContent({ children }: DashboardLayoutProps) {
  const { userUrls, refreshUrls, isRefreshing, user, isLoadingUser } =
    useUrls();

  const [username, setUsername] = useState("");
  const [longUrl, setLongUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [isErrorFading, setIsErrorFading] = useState(false);
  const [isWarningFading, setIsWarningFading] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);

  // Refs to store timeout IDs for cleanup
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
      // Reset animation states on unmount
      setIsErrorFading(false);
      setIsWarningFading(false);
    };
  }, []);

  // Set username when user is available
  useEffect(() => {
    if (user) {
      setUsername(
        user.user_metadata.full_name?.split(" ")[0] ?? user.user_metadata.email
      );
    }
  }, [user]);

  // Pre-fill URL if provided from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const prefilledUrl = urlParams.get("url");
    if (prefilledUrl) {
      setLongUrl(decodeURIComponent(prefilledUrl));
    }
  }, []);

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const setErrorWithTimeout = (message: string) => {
    // Clear existing timeout
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }

    setError(message);
    setIsErrorFading(false); // Ensure we start with fade-in

    // Two-stage timeout: fade-out → clear
    errorTimeoutRef.current = setTimeout(() => {
      setIsErrorFading(true); // Start fade-out animation
      setTimeout(() => {
        setError("");
        setIsErrorFading(false); // Reset for next message
      }, 300); // Wait for animation to complete
    }, 4700); // 4.7s visible + 0.3s fade-out = 5s total
  };

  const setWarningWithTimeout = (message: string) => {
    // Clear existing timeout
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }

    setWarning(message);
    setIsWarningFading(false); // Ensure we start with fade-in

    // Two-stage timeout: fade-out → clear
    warningTimeoutRef.current = setTimeout(() => {
      setIsWarningFading(true); // Start fade-out animation
      setTimeout(() => {
        setWarning("");
        setIsWarningFading(false); // Reset for next message
      }, 300); // Wait for animation to complete
    }, 4700); // 4.7s visible + 0.3s fade-out = 5s total
  };

  const handleClearCache = async () => {
    if (isClearingCache) return;

    setIsClearingCache(true);
    try {
      const response = await axios.post("/cache/clear");

      const data = response.data;

      toast.success(
        `Cache cleared successfully for ${data.clearedUrls} URLs!`,
        {
          position: "top-center",
          duration: 3000,
        }
      );
    } catch (error) {
      console.error("Failed to clear cache:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to clear cache. Please try again.";
      toast.error(errorMessage, {
        position: "top-center",
        duration: 3000,
      });
    } finally {
      setIsClearingCache(false);
    }
  };

  const handleShorten = async (e: React.FormEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setError("");
    setWarning("");

    // Validation
    if (!longUrl.trim()) {
      setErrorWithTimeout("Please enter a URL");
      return;
    }

    if (!isValidUrl(longUrl)) {
      setErrorWithTimeout(
        "Please enter a valid URL (include http:// or https://)"
      );
      return;
    }

    if (userUrls.some((url) => url.long_url === longUrl)) {
      setWarningWithTimeout("This URL has already been shortened");
      return;
    }

    if (
      longUrl.includes(process.env.NEXT_PUBLIC_SITE_URL || "") ||
      longUrl.includes("localhost")
    ) {
      setWarningWithTimeout("A true ninja does not shorten their own URL");
      return;
    }

    setIsLoading(true);
    try {
      await axios.post("/urls", { longUrl });
      refreshUrls();
      setLongUrl(""); // Clear input after successful creation
    } catch (error) {
      console.error(error);
      setErrorWithTimeout("Failed to shorten URL. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingUser) {
    return (
      <div className="relative h-screen bg-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-4"></div>
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-2xl">🥷</span>
            <span className="text-xl font-bold text-white">ninja-url</span>
          </div>
          <p className="text-white/60">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative h-screen bg-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="flex items-center space-x-2 mb-4">
            <span className="text-2xl">🥷</span>
            <span className="text-xl font-bold text-white">ninja-url</span>
          </div>
          <p className="text-white/60 mb-4">Authentication required</p>
          <p className="text-white/40 text-sm">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen bg-foreground w-full overflow-hidden">
      {/* Navbar */}
      <nav className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 sm:px-6 md:px-8 lg:px-12 py-4 bg-black/10 backdrop-blur-sm">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">🥷</span>
          <span className="text-lg sm:text-xl font-bold text-white">
            ninja-url
          </span>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4">
          <span className="text-white text-sm sm:text-base truncate max-w-[120px] sm:max-w-none">
            {username}
          </span>
          <Button
            onClick={handleClearCache}
            disabled={isClearingCache}
            variant="outline"
            size="sm"
            className="bg-white/10 border-white/20 text-white hover:bg-white/90 backdrop-blur-sm text-xs sm:text-sm"
            title="Clear Cache"
          >
            {isClearingCache ? (
              <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                <span className="hidden sm:inline">Clear Cache</span>
                <span className="sm:hidden">Clear</span>
              </>
            )}
          </Button>
          <form action={signOut}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/20 text-white hover:bg-white/90 backdrop-blur-sm text-xs sm:text-sm"
            >
              <span className="hidden sm:inline">Sign Out</span>
              <span className="sm:hidden">Out</span>
            </Button>
          </form>
        </div>
      </nav>

      {/* Main content - Responsive layout */}
      <div className="relative z-0 flex flex-col lg:flex-row h-full bg-foreground pt-16 sm:pt-20 pb-4 px-4 sm:px-6 md:px-8 lg:px-12 gap-4 sm:gap-6 lg:gap-6 overflow-hidden">
        {/* Left Panel - URLs Management */}
        <div className="flex flex-col w-full lg:w-2/5 xl:w-1/3 min-h-0 lg:min-h-full">
          {/* Input and Button Section */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:mb-6 h-auto sm:h-12 flex-shrink-0">
            <Input
              type="url"
              placeholder="Paste your long URL here..."
              value={longUrl}
              onChange={(e) => {
                setLongUrl(e.target.value);
                if (error) {
                  setError("");
                  setIsErrorFading(false); // Reset animation state
                }
              }}
              className="h-12 rounded-xl bg-background border-none text-sm sm:text-base"
            />
            <Button
              onClick={handleShorten}
              type="submit"
              variant="outline"
              disabled={isLoading}
              className="h-12 text-sm sm:text-md rounded-xl w-full sm:w-[120px] flex items-center justify-center"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span>⚔️ Shorten</span>
              )}
            </Button>
          </div>

          {/* Error Message */}
          {(error || isErrorFading) && (
            <div
              className={`mb-4 sm:mb-6 flex-shrink-0 transition-all duration-300 ease-out ${
                isErrorFading
                  ? "opacity-0 -translate-y-2"
                  : "opacity-100 translate-y-0"
              }`}
            >
              <p className="text-red-400 text-sm bg-red-500/10 backdrop-blur rounded-lg p-3 border border-red-500/20">
                {error}
              </p>
            </div>
          )}

          {/* Warning Message */}
          {(warning || isWarningFading) && (
            <div
              className={`mb-4 sm:mb-6 flex-shrink-0 transition-all duration-300 ease-out ${
                isWarningFading
                  ? "opacity-0 -translate-y-2"
                  : "opacity-100 translate-y-0"
              }`}
            >
              <p className="text-yellow-400 text-sm bg-yellow-500/10 backdrop-blur rounded-lg p-3 border border-yellow-500/20">
                {warning}
              </p>
            </div>
          )}

          {/* URLs List */}
          <Card className="flex-1 bg-white/5 backdrop-blur border-white/10 overflow-hidden min-h-0 lg:min-h-[400px]">
            <div className="px-4 sm:px-6 h-full flex flex-col">
              <div className="flex justify-between items-center mb-4 flex-shrink-0 py-4 sm:py-0">
                <h3 className="text-white text-lg sm:text-xl font-semibold">
                  Your Links
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={async () => {
                    try {
                      await refreshUrls();
                    } catch {
                      setError("Failed to refresh URLs. Please try again.");
                    }
                  }}
                  className="text-white/70 hover:bg-white/10 hover:text-white w-8 h-8 sm:w-10 sm:h-10"
                >
                  <RefreshCcwIcon
                    className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                </Button>
              </div>
              <div className="space-y-3 flex-1 overflow-y-auto min-h-0 scrollbar-dark pr-2">
                {userUrls.map((url, index) => (
                  <UrlRow key={`${url.id}-${index}`} url={url} index={index} />
                ))}
                {userUrls.length === 0 && (
                  <div className="text-center py-8 sm:py-12">
                    <p className="text-white/60 text-sm sm:text-base">
                      No URLs created yet. Start by shortening your first link!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Right Panel - Content from children */}
        <div className="flex-1 min-h-0 lg:min-h-full overflow-hidden mt-4 lg:mt-0">
          {children}
        </div>
      </div>
    </div>
  );
}

// Main layout component that provides the URL context
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <UrlProvider>
      <DashboardContent>{children}</DashboardContent>
    </UrlProvider>
  );
}

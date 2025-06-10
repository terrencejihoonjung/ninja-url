"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useState, useEffect } from "react";
import axios from "axios";
import type { User } from "@supabase/supabase-js";
import { signOut } from "@/app/dashboard/actions";
import { fetchUserUrls } from "@/app/dashboard/actions";
import { UrlRow } from "@/components/dashboard/row";
import { RefreshCcwIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/supabase-client";

export interface UserUrl {
  id: number;
  short_url: string;
  long_url: string;
  created_at: string;
  visits?: number; // Optional since it comes from url_metric join
}

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [username, setUsername] = useState("");
  const [longUrl, setLongUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [userUrls, setUserUrls] = useState<UserUrl[]>([]);

  // Get user on mount
  useEffect(() => {
    const getUser = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user && user.id) {
          setUser(user);
          setUsername(
            user.user_metadata.full_name?.split(" ")[0] ??
              user.user_metadata.email
          );

          fetchUserUrls(user.id).then((data) => {
            setUserUrls(data || []);
          });
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setIsLoadingUser(false);
      }
    };
    getUser();
  }, [user?.id]);

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

  const handleShorten = async (e: React.FormEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setError("");
    setWarning("");

    // Validation
    if (!longUrl.trim()) {
      setError("Please enter a URL");
      return;
    }

    if (!isValidUrl(longUrl)) {
      setError("Please enter a valid URL (include http:// or https://)");
      return;
    }

    if (userUrls.some((url) => url.long_url === longUrl)) {
      setWarning("This URL has already been shortened");
      return;
    }

    if (
      longUrl.includes(process.env.NEXT_PUBLIC_SITE_URL || "") ||
      longUrl.includes("localhost")
    ) {
      setWarning("A true ninja does not shorten their own URL");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post("/urls", { longUrl });

      // Add new URL to top of list with animation
      const newUrl: UserUrl = {
        id: Math.random(), // temporary ID, will be replaced when refetched
        short_url: response.data.shortUrl,
        long_url: longUrl,
        visits: 0,
        created_at: new Date().toISOString(),
      };

      setUserUrls((prev) => [newUrl, ...prev]);
      setLongUrl(""); // Clear input after successful creation
    } catch (error) {
      console.error(error);
      setError("Failed to shorten URL. Please try again.");
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
    <div className="relative h-screen bg-foreground">
      {/* Navbar */}
      <nav className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-12 md:px-24 lg:px-12 py-4 bg-black/10 backdrop-blur-sm">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">🥷</span>
          <span className="text-xl font-bold text-white">ninja-url</span>
        </div>

        <div className="flex items-center space-x-4">
          <span className="text-white">{username}</span>
          <form action={signOut}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/20 text-white hover:bg-white/90 backdrop-blur-sm"
            >
              Sign Out
            </Button>
          </form>
        </div>
      </nav>

      {/* Main content - Two panel layout */}
      <div className="relative z-0 flex h-screen bg-foreground pt-16 pb-4 px-12 md:px-24 lg:px-12 gap-6">
        {/* Left Panel - URLs Management */}
        <div className="flex flex-col w-1/3">
          {/* Input and Button Section */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6 h-12">
            <Input
              type="url"
              placeholder="Paste your long URL here..."
              value={longUrl}
              onChange={(e) => {
                setLongUrl(e.target.value);
                if (error) setError("");
              }}
              className="h-full rounded-xl bg-background border-none"
            />
            <Button
              onClick={handleShorten}
              type="submit"
              variant="outline"
              disabled={isLoading}
              className="h-full text-md rounded-xl w-[120px] flex items-center justify-center"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                "⚔️ Shorten"
              )}
            </Button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6">
              <p className="text-red-400 text-sm bg-red-500/10 backdrop-blur rounded-lg p-3 border border-red-500/20">
                {error}
              </p>
            </div>
          )}

          {/* Warning Message */}
          {warning && (
            <div className="mb-6">
              <p className="text-yellow-400 text-sm bg-yellow-500/10 backdrop-blur rounded-lg p-3 border border-yellow-500/20">
                {warning}
              </p>
            </div>
          )}

          {/* URLs List */}
          <Card className="flex-1 bg-white/5 backdrop-blur border-white/10 overflow-hidden">
            <div className="px-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white text-xl font-semibold">Your Links</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={async () => {
                    if (user?.id) {
                      setIsRefreshing(true);
                      try {
                        const urls = await fetchUserUrls(user.id);
                        if (urls) setUserUrls(urls);
                      } catch {
                        setError("Failed to refresh URLs. Please try again.");
                      } finally {
                        setIsRefreshing(false);
                      }
                    }
                  }}
                  className="text-white/70 hover:bg-white/10 hover:text-white"
                >
                  <RefreshCcwIcon
                    className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                </Button>
              </div>
              <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                {userUrls.map((url, index) => (
                  <UrlRow key={`${url.id}-${index}`} url={url} index={index} />
                ))}
                {userUrls.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-white/60">
                      No URLs created yet. Start by shortening your first link!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Right Panel - Content from children */}
        {children}
      </div>

      <style jsx>{`
        @keyframes slideInFromTop {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

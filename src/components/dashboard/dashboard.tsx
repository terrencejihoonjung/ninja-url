"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import axios from "axios";
import type { User } from "@supabase/supabase-js";
import { signOut } from "./actions";

interface UserDashboardProps {
  user: User;
}

export function Dashboard({ user }: UserDashboardProps) {
  const [longUrl, setLongUrl] = useState("");
  const [fullShortUrl, setFullShortUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

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

    // Validation
    if (!longUrl.trim()) {
      setError("Please enter a URL");
      return;
    }

    if (!isValidUrl(longUrl)) {
      setError("Please enter a valid URL (include http:// or https://)");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post("/urls", { longUrl });
      setFullShortUrl(response.data.fullShortUrl);
    } catch (error) {
      console.error(error);
      setError("Failed to shorten URL. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative h-screen bg-foreground">
      {/* Navbar */}
      <nav className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-12 md:px-24 lg:px-36 xl:px-48 py-4 bg-black/10 backdrop-blur-sm">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">🥷</span>
          <span className="text-xl font-bold text-white">ninja-url</span>
        </div>

        <div className="flex items-center space-x-4">
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

      {/* Main content */}
      <div className="relative z-0 flex flex-col items-center justify-center h-screen bg-foreground">
        <div className="text-center space-y-8 max-w-5xl px-12 md:px-24 lg:px-36 xl:px-48 mx-auto">
          {/* Main Title */}
          <h1 className="text-4xl md:text-7xl font-bold text-white leading-tight">
            Welcome back, {user.user_metadata.full_name?.split(" ")[0]}!
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-gray-200 max-w-2xl mx-auto">
            Ready to create some more URLs? Create your next ninja link below.
          </p>

          {/* Input and Button Section */}
          <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto mt-8 h-12">
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
              className="h-full text-lg rounded-xl w-[120px] flex items-center justify-center"
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
            <div className="max-w-2xl mx-auto">
              <p className="text-red-400 text-sm bg-red-500/10 backdrop-blur rounded-lg p-3 border border-red-500/20">
                {error}
              </p>
            </div>
          )}

          {/* Result container */}
          <div className="w-full max-w-2xl mx-auto h-16 flex items-center">
            <div
              className={`flex items-center justify-between w-full p-4 bg-white/10 backdrop-blur rounded-xl transition-all duration-700 ease-out ${
                fullShortUrl
                  ? "opacity-100 transform translate-y-0"
                  : "opacity-0 transform translate-y-4 pointer-events-none"
              }`}
            >
              <span className="text-white text-lg truncate mr-4">
                {fullShortUrl || "Your shortened URL will appear here"}
              </span>
              <Button
                onClick={async () => {
                  if (!fullShortUrl) return;
                  await navigator.clipboard.writeText(fullShortUrl);
                  const btn = document.activeElement as HTMLButtonElement;
                  const icon = btn.querySelector("svg");
                  if (icon) {
                    icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />`;
                    setTimeout(() => {
                      icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />`;
                    }, 1500);
                  }
                }}
                variant="outline"
                className="shrink-0"
                disabled={!fullShortUrl}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
                  />
                </svg>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

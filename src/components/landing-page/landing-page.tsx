"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function LandingPage() {
  const [longUrl, setLongUrl] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleShorten = (e: React.FormEvent<HTMLButtonElement>) => {
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

    // Redirect to login with URL parameter
    const encodedUrl = encodeURIComponent(longUrl);
    router.push(`/login?url=${encodedUrl}`);
  };

  return (
    <div className="relative h-screen">
      {/* Video Background - Fixed position behind content */}
      <video
        className="fixed top-0 left-0 w-full h-full object-cover z-0 pointer-events-none"
        autoPlay
        muted
        loop
      >
        <source src="/video.webm" type="video/webm" />
        Your browser does not support the video tag.
      </video>

      {/* Navbar */}
      <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-12 md:px-24 lg:px-36 xl:px-48 py-4 bg-black/10 backdrop-blur-sm">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">🥷</span>
          <span className="text-xl font-bold text-white">ninja-url</span>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-white/10 border-white/20 text-white hover:bg-white/90 backdrop-blur-sm"
            asChild
          >
            <a
              href="https://github.com/terrencejihoonjung/ninja-url"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <span>GitHub</span>
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="bg-white/10 border-white/20 text-white hover:bg-white/90 backdrop-blur-sm"
          >
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </nav>

      {/* Main content - positioned above video */}
      <div className="relative z-10 flex flex-col items-center justify-center h-screen bg-black/30">
        <div className="text-center space-y-8 max-w-5xl px-12 md:px-24 lg:px-36 xl:px-48 mx-auto">
          {/* Main Title */}
          <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight">
            Long URLs?
            <br />
            <span className="text-orange-400 line-through">Slash</span> Them.
          </h1>

          {/* Subtitle/CTA */}
          <p className="text-xl md:text-2xl text-gray-200 max-w-2xl mx-auto">
            Lightning-fast URL shortening that cuts through the clutter.
            Transform any link into a sleek, shareable ninja URL.
          </p>

          {/* Input and Button Section */}
          <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto mt-8 h-12">
            <Input
              type="url"
              placeholder="Paste your long URL here..."
              value={longUrl}
              onChange={(e) => {
                setLongUrl(e.target.value);
                if (error) setError(""); // Clear error when user types
              }}
              className="h-full rounded-xl bg-background border-none"
            />
            <Button
              onClick={handleShorten}
              type="submit"
              variant="outline"
              className="h-full text-lg rounded-xl w-[120px] flex items-center justify-center"
            >
              ⚔️ Shorten
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
        </div>
      </div>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { UserUrl } from "@/app/dashboard/layout";
import { redirect } from "next/navigation";

// Helper functions
const truncateUrl = (url: string, maxLength: number = 50): string => {
  // Remove protocol
  const cleanUrl = url.replace(/^https?:\/\//, "");
  return cleanUrl.length > maxLength
    ? cleanUrl.substring(0, maxLength) + "..."
    : cleanUrl;
};

const getFullShortUrl = (shortUrl: string): string => {
  return process.env.NODE_ENV === "production"
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/${shortUrl}`
    : `http://localhost:3001/${shortUrl}`;
};

export const UrlRow = ({ url, index }: { url: UserUrl; index: number }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const fullUrl = getFullShortUrl(url.short_url);
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    redirect(`/dashboard/analytics/${url.id}`);
  };

  return (
    <div
      className={`flex items-center justify-between p-4 bg-white/5 backdrop-blur rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-300 ${
        index === 0 ? "animate-in slide-in-from-top-5 fade-in duration-500" : ""
      }`}
      onClick={handleClick}
    >
      <div className="flex-1 min-w-0 mr-4">
        <p
          className="text-white hover:text-orange-400 transition-colors duration-200 text-sm font-medium block truncate"
          title={url.long_url}
        >
          {truncateUrl(url.long_url)}
        </p>
      </div>

      <div className="text-white/70 text-sm mr-4 font-mono">
        {url.visits || 0} visits
      </div>

      <Button
        onClick={handleCopy}
        variant="outline"
        size="sm"
        className="shrink-0 bg-white/10 border-white/20 text-white hover:bg-white/90 hover:text-black transition-all duration-200"
      >
        {copied ? (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        ) : (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        )}
      </Button>
    </div>
  );
};

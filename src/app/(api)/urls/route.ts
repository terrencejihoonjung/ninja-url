import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createShortUrl } from "@/lib/supabase/queries";

// POST /urls -> creates a short URL using a long URL and saves it to the database
export async function POST(request: NextRequest) {
  // Parse the request body
  const { longUrl } = await request.json();

  // Create a hash from the long URL
  const hash = createHash("sha256").update(longUrl).digest("hex");

  // Take first 6 characters and convert to base36 for URL safety
  const shortUrl = parseInt(hash.substring(0, 16), 16)
    .toString(36)
    .substring(0, 6);

  // Save to database
  const { error } = await createShortUrl(shortUrl, longUrl);

  if (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to create short URL" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    shortUrl,
    longUrl,
    fullShortUrl:
      process.env.NODE_ENV === "production"
        ? `${process.env.NEXT_PUBLIC_SITE_URL}/${shortUrl}`
        : `http://localhost:3001/${shortUrl}`,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createShortUrl } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/supabase-server";

// POST /urls -> creates a short URL using a long URL and saves it to the database
export async function POST(request: NextRequest) {
  // Get authenticated user
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  // Parse the request body
  const { longUrl } = await request.json();

  // Create a hash from the long URL + user_id for uniqueness
  const hashInput = longUrl + user.id;
  const hash = createHash("sha256").update(hashInput).digest("hex");

  // Take first 6 characters and convert to base36 for URL safety
  const shortUrl = parseInt(hash.substring(0, 16), 16)
    .toString(36)
    .substring(0, 6);

  // Check if this short_url already exists (globally)
  const { data: existingShortUrl } = await supabase
    .from("url")
    .select("short_url")
    .eq("short_url", shortUrl)
    .single();

  if (existingShortUrl) {
    // This is extremely unlikely with SHA256 + user_id, but handle just in case
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }

  // Save to database with user_id
  const { error } = await createShortUrl(shortUrl, longUrl, user.id);

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
        : `http://localhost:3000/${shortUrl}`,
  });
}

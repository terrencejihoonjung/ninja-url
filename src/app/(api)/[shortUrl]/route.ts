import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/supabase-server";

// GET /{shortUrl} -> redirects to the long URL
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shortUrl: string }> }
) {
  const { shortUrl } = await params;

  // Look up the long URL in the database
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("url")
    .select("long_url, visits")
    .eq("short_url", shortUrl)
    .limit(1) // limits the 1 result
    .maybeSingle(); // returns null or the single result as an object

  if (error || !data) {
    console.error("Retrieving URL error:", error);
    return NextResponse.json({ error: "Short URL not found" }, { status: 404 });
  }

  // Incremenet the visits field
  const { error: updateError } = await supabase
    .from("url")
    .update({ visits: data.visits + 1 })
    .eq("short_url", shortUrl);

  if (updateError) {
    console.error("Updating visits error:", updateError);
    return NextResponse.json(
      { error: "Failed to update visits" },
      { status: 500 }
    );
  }

  // Use NextResponse.redirect with explicit cache control for analytics
  return NextResponse.redirect(data.long_url, {
    status: 307, // Temporary redirect (same as redirect() default)
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

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
  const { data: urlData, error: urlError } = await supabase
    .from("url")
    .select("long_url, id")
    .eq("short_url", shortUrl)
    .limit(1) // limits the 1 result
    .maybeSingle(); // returns null or the single result as an object

  if (urlError || !urlData) {
    console.error("Retrieving URL error:", urlError);
    return NextResponse.json({ error: "Short URL not found" }, { status: 404 });
  }

  // If there's an existing url_metric row belonging to the url_id + hourTimestamp, increment the visits field
  const date = new Date();
  date.setHours(date.getHours(), 0, 0, 0); // Floor to nearest hour by zeroing minutes, seconds and milliseconds
  const hourTimestamp = date.toISOString();

  const { data: existingMetric } = await supabase
    .from("url_metric")
    .select("id, visits")
    .eq("url_id", urlData.id)
    .eq("datetime", hourTimestamp)
    .limit(1)
    .maybeSingle();

  console.log("existingMetric", existingMetric);

  if (existingMetric) {
    const { error: updateError } = await supabase
      .from("url_metric")
      .update({ visits: existingMetric.visits + 1 })
      .eq("id", existingMetric.id);

    if (updateError) {
      console.error("Updating url metric error:", updateError);
      return NextResponse.json(
        { error: "Failed to update url metric" },
        { status: 500 }
      );
    }
  } else {
    const { error: insertError } = await supabase.from("url_metric").insert({
      url_id: urlData.id,
      visits: 1,
      datetime: hourTimestamp,
    });

    if (insertError) {
      console.error("Inserting url metric error:", insertError);
      return NextResponse.json(
        { error: "Failed to insert url metric" },
        { status: 500 }
      );
    }
  }

  // Use NextResponse.redirect with explicit cache control for analytics
  return NextResponse.redirect(urlData.long_url, {
    status: 307, // Temporary redirect (same as redirect() default)
    headers: {
      Expires: "0",
    },
  });
}

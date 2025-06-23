import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/supabase-server";
import { createHash } from "crypto";

const createVisitorFingerprint = (
  ip: string,
  userAgent: string,
  acceptLanguage: string
) => {
  const fingerprint = createHash("sha256").update(
    `${ip}:${userAgent}:${acceptLanguage}`
  );
  return fingerprint.digest("hex");
};

const getClientIP = (request: NextRequest) => {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");

  if (forwarded) {
    const ips = forwarded.split(",").map((ip) => ip.trim());
    return ips[0];
  }

  if (realIP) {
    return realIP;
  }

  return "unknown";
};

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

  // Track unique visitors
  const ip = getClientIP(request);
  const userAgent = request.headers.get("user-agent") || "";
  const acceptLanguage = request.headers.get("accept-language") || "";
  const visitorFingerprint = createVisitorFingerprint(
    ip,
    userAgent,
    acceptLanguage
  );

  // Track unique visitors - check if this fingerprint + url_id combination exists
  const { data: existingUniqueVisitor } = await supabase
    .from("unique_visitor")
    .select("id")
    .eq("fingerprint", visitorFingerprint)
    .eq("url_id", urlData.id)
    .limit(1)
    .maybeSingle();

  if (!existingUniqueVisitor) {
    // New unique visitor for this URL
    const { error: insertError } = await supabase
      .from("unique_visitor")
      .insert({
        fingerprint: visitorFingerprint,
        url_id: urlData.id,
        first_visit_at: new Date().toISOString(),
        last_visit_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("Inserting unique visitor error:", insertError);
      return NextResponse.json(
        { error: "Failed to insert unique visitor" },
        { status: 500 }
      );
    }
  } else {
    // Existing visitor returning - only update last_visit_at
    const { error: updateError } = await supabase
      .from("unique_visitor")
      .update({
        last_visit_at: new Date().toISOString(),
      })
      .eq("id", existingUniqueVisitor.id);

    if (updateError) {
      console.error("Updating unique visitor error:", updateError);
      return NextResponse.json(
        { error: "Failed to update unique visitor" },
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

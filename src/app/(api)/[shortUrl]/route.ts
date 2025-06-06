import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/db/supabase-server";
import { redirect } from "next/navigation";

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
    .select("long_url")
    .eq("short_url", shortUrl)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Short URL not found" }, { status: 404 });
  }

  // Redirect to the long URL
  redirect(data.long_url);
}

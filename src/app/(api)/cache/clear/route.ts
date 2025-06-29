import { createClient } from "@/lib/supabase/supabase-server";
import { invalidateUrlCache } from "@/lib/redis/redis-client";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all URLs for this user
    const { data: urls, error: urlsError } = await supabase
      .from("url")
      .select("id")
      .eq("user_id", user.id);

    if (urlsError) {
      console.error("Failed to fetch user URLs:", urlsError);
      return NextResponse.json(
        { error: "Failed to fetch URLs" },
        { status: 500 }
      );
    }

    if (!urls || urls.length === 0) {
      return NextResponse.json(
        { message: "No URLs to clear cache for" },
        { status: 200 }
      );
    }

    // Clear cache for all user URLs and collect deletion counts
    await Promise.all(urls.map((url) => invalidateUrlCache(url.id.toString())));

    return NextResponse.json({
      message: "Cache cleared successfully",
      clearedUrls: urls.length,
    });
  } catch (error) {
    console.error("Cache clearing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { createClient } from "./supabase-server";

export async function createShortUrl(
  shortUrl: string,
  longUrl: string,
  userId: string
) {
  const supabase = await createClient();
  return supabase.from("url").insert({
    short_url: shortUrl,
    long_url: longUrl,
    user_id: userId,
  });
}

export async function getUrlByShortCode(shortUrl: string) {
  const supabase = await createClient();
  return supabase
    .from("url")
    .select("long_url")
    .eq("short_url", shortUrl)
    .single();
}

export async function getUserUrls(userId: string) {
  const supabase = await createClient();

  // Join with url_metric to get visits data
  const { data: urls, error } = await supabase
    .from("url")
    .select(
      `
      id,
      short_url,
      long_url,
      created_at,
      url_metric (
        visits
      )
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  console.log("urls", urls);

  if (error) {
    return { data: null, error };
  }

  // Transform the data to aggregate visits
  const urlsWithVisits = urls?.map((url) => ({
    id: url.id,
    short_url: url.short_url,
    long_url: url.long_url,
    created_at: url.created_at,
    visits:
      url.url_metric?.reduce(
        (total, metric) => total + (metric.visits || 0),
        0
      ) || 0,
  }));

  return { data: urlsWithVisits, error: null };
}

import { createClient } from "./supabase-server";

export async function createShortUrl(shortUrl: string, longUrl: string) {
  const supabase = await createClient();
  return supabase
    .from("url")
    .insert({ short_url: shortUrl, long_url: longUrl });
}

export async function getUrlByShortCode(shortUrl: string) {
  const supabase = await createClient();
  return supabase
    .from("url")
    .select("long_url")
    .eq("short_url", shortUrl)
    .single();
}

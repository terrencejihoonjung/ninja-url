"use server";

import { createClient } from "@/lib/supabase/supabase-server";

// Get url metrics
export async function getUrlMetrics(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("url_metric")
    .select("*")
    .order("datetime", { ascending: false })
    .eq("url_id", parseInt(id));

  if (error) {
    throw new Error("Failed to get url metrics");
  }

  return data;
}

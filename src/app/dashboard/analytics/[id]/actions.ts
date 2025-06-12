"use server";

import { createClient } from "@/lib/supabase/supabase-server";

// Get url by ID
export async function getUrlById(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not found");
  }

  const { data, error } = await supabase
    .from("url")
    .select("*")
    .eq("id", parseInt(id))
    .eq("user_id", user.id)
    .single();

  if (error) {
    throw new Error("Failed to get url");
  }

  return data;
}

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

// Delete url (cascades to metrics)
export async function deleteUrl(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not found");
  }

  const { error } = await supabase
    .from("url")
    .delete()
    .eq("id", parseInt(id))
    .eq("user_id", user.id);

  if (error) {
    throw new Error("Failed to delete url");
  }

  return { success: true };
}

"use server";

import { getUserUrls } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/supabase-server";

export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (!error) {
    throw new Error("Failed to sign out");
  }
}

export async function fetchUserUrls(userId: string) {
  try {
    const { data, error } = await getUserUrls(userId);
    console.log("data", data);
    if (error) {
      console.error("Error fetching user URLs:", error);
      return;
    }
    return data || [];
  } catch (error) {
    console.error("Error fetching user URLs:", error);
  }
}

"use server";

import { createClient } from "@/lib/supabase/supabase-server";
import { redirect } from "next/navigation";

export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error(error);
    redirect("/error");
  }

  redirect("/");
}

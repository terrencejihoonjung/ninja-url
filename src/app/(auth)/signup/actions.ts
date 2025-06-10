"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/supabase-server";

export async function signup(
  prevState: { error?: string } | null,
  formData: FormData
) {
  const supabase = await createClient();

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error } = await supabase.auth.signUp(data);

  if (error) {
    if (error.code === "signup_disabled") {
      return { error: "Account registration is currently disabled." };
    }
    if (error.code === "weak_password") {
      return {
        error: "Password is too weak. Please choose a stronger password.",
      };
    }
    if (error.code === "user_already_exists") {
      return { error: "An account with this email already exists." };
    }

    return { error: "An unexpected error occurred. Please try again." };
  }

  // Check for URL parameter from hidden form field
  const prefilledUrl = formData.get("url") as string;

  revalidatePath("/", "layout");

  if (prefilledUrl) {
    redirect(`/?url=${prefilledUrl}`);
  }

  redirect("/");
}

export async function signupWithGoogle() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${
        process.env.NODE_ENV === "production"
          ? process.env.NEXT_PUBLIC_SITE_URL
          : "http://localhost:3001"
      }/auth/callback`,
    },
  });

  if (error) {
    redirect("/error");
  }

  if (data.url) {
    redirect(data.url);
  }
}

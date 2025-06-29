import { NextResponse } from "next/server";
// The client you created from the Server-Side Auth instructions
import { createClient } from "@/lib/supabase/supabase-server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // if "next" is in param, use it as the redirect URL
  let next = searchParams.get("next") ?? "/";
  if (!next.startsWith("/")) {
    // if "next" is not a relative URL, use the default
    next = "/";
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;

      const finalRedirect = `${baseUrl}${next}`;
      console.log("🚀 Final callback redirect:", finalRedirect);
      return NextResponse.redirect(finalRedirect);
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/error`);
}

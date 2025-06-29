import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit, getRateLimitType, getClientIP } from "../rate-limit";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_LOCAL_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_LOCAL_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: DO NOT REMOVE auth.getUser()
  // This refreshes the auth session and ensures cookies are properly set

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Rate limiting check
  const pathname = request.nextUrl.pathname;
  const method = request.method;
  const rateLimitType = getRateLimitType(pathname, method);

  if (rateLimitType) {
    const ip = getClientIP(request);
    const userId = user?.id || null;
    const rateLimitResult = await checkRateLimit(userId, ip, rateLimitType);

    if (!rateLimitResult.allowed) {
      const waitTime = Math.ceil(
        (rateLimitResult.resetTime - Date.now()) / 1000
      );

      // Return 429 for ALL requests - rate limiting is a hard stop
      return new NextResponse(
        JSON.stringify({
          error: "Rate limit exceeded",
          message: `Too many requests. Try again in ${waitTime} seconds.`,
          retryAfter: waitTime,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": rateLimitResult.limit.toString(),
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": rateLimitResult.resetTime.toString(),
            "Retry-After": waitTime.toString(),
          },
        }
      );
    }

    // Add rate limit headers to successful responses
    supabaseResponse.headers.set(
      "X-RateLimit-Limit",
      rateLimitResult.limit.toString()
    );
    supabaseResponse.headers.set(
      "X-RateLimit-Remaining",
      rateLimitResult.remaining.toString()
    );
    supabaseResponse.headers.set(
      "X-RateLimit-Reset",
      rateLimitResult.resetTime.toString()
    );
  }

  if (!user) {
    // Allow public access to these routes
    const isPublicRoute =
      pathname === "/" || // Home page (conditional rendering)
      pathname === "/login" || // Login page
      pathname === "/signup" || // Signup page
      pathname === "/auth/callback" || // OAuth callback route
      /^\/[a-z0-9]{6}$/.test(pathname); // Short URLs (e.g., /abc123)

    if (!isPublicRoute) {
      // no user and accessing protected route, redirect to login
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}

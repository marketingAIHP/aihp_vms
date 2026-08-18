import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && key) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });

    // Refresh an expired Supabase session before protected layouts read it.
    await supabase.auth.getUser();
  }

  const pathname = request.nextUrl.pathname;
  const hasAppSession = request.cookies.has("aihp_vms_session");

  if (!hasAppSession && pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/auth/admin/login", request.url));
  }

  if (!hasAppSession && pathname.startsWith("/site-manager")) {
    return NextResponse.redirect(new URL("/auth/site-manager/login", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/site-manager/:path*",
    "/api/admin/:path*",
    "/api/site-manager/:path*",
    "/api/visits/:path*"
  ],
};

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function supabaseConfigured(): boolean {
  return (
    SUPABASE_URL.startsWith("http") &&
    !SUPABASE_URL.includes("your-project") &&
    !!SUPABASE_ANON_KEY &&
    !SUPABASE_ANON_KEY.includes("your-anon-key")
  );
}

const PROTECTED = ["/officer", "/cm", "/my-complaints"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const needsAuth = PROTECTED.some((p) => pathname.startsWith(p));
  if (!needsAuth) return NextResponse.next();

  // Dev fallback: token lives in localStorage (not cookies) — client RouteGuard
  // handles protection. Let the request through.
  if (!supabaseConfigured()) return NextResponse.next();

  const response = NextResponse.next();
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) =>
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/officer/:path*", "/cm/:path*", "/my-complaints/:path*"],
};

import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServiceRoleClient } from "@/lib/supabase/service";

const PROTECTED_PREFIXES = ["/dashboard", "/admin"];
const ADMIN_PREFIX = "/admin";

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const path = request.nextUrl.pathname;

  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));
  if (!isProtected) return response;

  if (!user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectedFrom", path);
    return NextResponse.redirect(redirectUrl);
  }

  if (path.startsWith(ADMIN_PREFIX)) {
    const supabase = createServiceRoleClient();
    const { data } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (data?.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};

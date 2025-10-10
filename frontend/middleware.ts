import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/auth/callback",
  "/auth/confirm",
  "/api/session/logout",
  "/api/session/set-token",
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname.startsWith(path)) || pathname.startsWith("/api/auth");
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;
  const { pathname } = request.nextUrl;

  const isPublic = isPublicPath(pathname) || pathname.startsWith("/_next") || pathname.startsWith("/static") || pathname === "/favicon.ico";

  if (!token && !isPublic) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    if (pathname !== "/") {
      loginUrl.searchParams.set("redirect", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (token && (pathname === "/login" || pathname === "/register")) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/";
    dashboardUrl.searchParams.delete("redirect");
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/(.*)"],
};

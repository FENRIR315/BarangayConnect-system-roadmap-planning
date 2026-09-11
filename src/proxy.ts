import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, lookupSession } from "@/lib/auth";

const publicPaths = [
  "/login",
  "/reset-password",
  "/verify",
  "/api",
];

const isAdminPath = (pathname: string) => pathname.startsWith("/admin");
const isResidentPath = (pathname: string) => pathname.startsWith("/resident");
const isPublicPath = (pathname: string) =>
  publicPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const sid = request.cookies.get(SESSION_COOKIE)?.value;
  const user = sid ? await lookupSession(sid) : null;
  const { pathname } = request.nextUrl;

  if (!user && !isPublicPath(pathname) && pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = user.role === "resident" ? "/resident/dashboard" : "/admin/dashboard";
    return NextResponse.redirect(url);
  }

  if (user) {
    const isResident = user.role === "resident";

    if (isAdminPath(pathname) && isResident) {
      const url = request.nextUrl.clone();
      url.pathname = "/resident/dashboard";
      return NextResponse.redirect(url);
    }

    if (isResidentPath(pathname) && !isResident) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.jpg$).*)",
  ],
};
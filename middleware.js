import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = () =>
  new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret-change-me");

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("jq_session")?.value;
  let session = null;
  if (token) {
    try {
      session = (await jwtVerify(token, secret())).payload;
    } catch {}
  }

  const PROTECTED = ["/dashboard", "/admin", "/autopilot", "/explore", "/skills", "/companies", "/saved", "/profile", "/onboarding"];
  if (PROTECTED.some((p) => pathname.startsWith(p))) {
    if (!session) return NextResponse.redirect(new URL("/", req.url));
    if (session.status !== "approved")
      return NextResponse.redirect(new URL("/pending", req.url));
    if (pathname.startsWith("/admin") && session.role !== "admin")
      return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  if (pathname === "/pending" && !session)
    return NextResponse.redirect(new URL("/", req.url));

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/autopilot/:path*", "/explore/:path*", "/skills/:path*", "/companies/:path*", "/saved/:path*", "/profile/:path*", "/onboarding/:path*", "/pending"],
};

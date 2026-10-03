import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { SESSION_COOKIE } from "./lib/constants";

const PUBLIC_PATHS = ["/signin", "/signup"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: SESSION_COOKIE,
  });
  const isMerchant = token?.role === "MERCHANT" && typeof token.merchantId === "number";
  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (isPublic && isMerchant) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  if (pathname === "/" && isMerchant) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  if (!isPublic && !isMerchant) {
    const url = new URL("/signin", req.url);
    if (pathname !== "/") url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
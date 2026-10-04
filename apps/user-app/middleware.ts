export { default } from "next-auth/middleware";
export const config = {
  matcher: ["/dashboard/:path*", "/transfer/:path*", "/transactions/:path*", "/p2p/:path*","/pay/:path*","/pin/:path*"],
};
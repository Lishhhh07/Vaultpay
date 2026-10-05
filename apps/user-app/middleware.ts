import { withAuth } from "next-auth/middleware";

export default withAuth({ pages: { signIn: "/signin" } });

export const config = {
  matcher: ["/dashboard/:path*", "/transfer/:path*", "/transactions/:path*", "/p2p/:path*", "/pay/:path*", "/pin/:path*"],
};
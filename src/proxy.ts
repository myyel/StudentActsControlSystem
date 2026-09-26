import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only (cookie presence). Real authorization runs on the server
// in every page, action and route handler via src/server/auth.
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/giris", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/ogretmen/:path*", "/veli/:path*", "/tahta/:path*"],
};

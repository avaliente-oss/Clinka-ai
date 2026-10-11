import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPublic =
    pathname === "/login" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api");

  if (isPublic) {
    return NextResponse.next();
  }

  if (request.cookies.get("clinika_session")?.value !== "demo") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};

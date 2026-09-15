import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session";
import { ROLE_HOME } from "@/lib/users";
import type { Role } from "@/lib/types";

const ROLE_PREFIX: { prefix: string; role: Role }[] = [
  { prefix: "/mo", role: "MO" },
  { prefix: "/police", role: "POLICE" },
  { prefix: "/fsl", role: "FSL" },
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);

  if (pathname === "/") {
    const dest = session ? ROLE_HOME[session.role] : "/login";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  if (pathname === "/login") {
    if (session) {
      return NextResponse.redirect(new URL(ROLE_HOME[session.role], req.url));
    }
    return NextResponse.next();
  }

  const match = ROLE_PREFIX.find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"));
  if (match) {
    if (!session) {
      const url = new URL("/login", req.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    if (session.role !== match.role) {
      return NextResponse.redirect(new URL("/403", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Guard every route except static assets, images, the manifest and
     * favicon. API routes are intentionally included: /api/custody/append
     * does its own session/role check and returns a JSON 401, but auth
     * endpoints must stay reachable while logged out.
     */
    "/((?!_next/static|_next/image|manifest.json|favicon.ico|icon.svg|sw.js).*)",
  ],
};

import { NextResponse, type NextRequest } from "next/server";

const TEAM_ACCESS_COOKIE = "levela_team_access";

function isProtectedTeamPath(pathname: string) {
  return (
    pathname === "/team" ||
    pathname.startsWith("/team/") ||
    pathname === "/team-sales-dashboard" ||
    pathname.startsWith("/team-sales-dashboard/") ||
    pathname === "/api/team-sales-dashboard" ||
    pathname === "/api/team-sales-goals"
  );
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (!isProtectedTeamPath(pathname)) return NextResponse.next();

  const hasAccess = request.cookies.get(TEAM_ACCESS_COOKIE)?.value === "1";
  if (hasAccess) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Team dashboard access required" }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/team-access";
  url.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/team/:path*", "/team-sales-dashboard/:path*", "/api/team-sales-dashboard", "/api/team-sales-goals"],
};

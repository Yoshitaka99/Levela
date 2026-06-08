import { NextResponse } from "next/server";

const TEAM_ACCESS_COOKIE = "levela_team_access";
const TEAM_PASSPHRASE = "Levela2026";

function normalizeNextPath(value: unknown) {
  const nextPath = typeof value === "string" ? value : "/team";
  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) return "/team";
  if (nextPath.startsWith("/team-access")) return "/team";
  return nextPath;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { passphrase?: string; next?: string };
  const passphrase = body.passphrase?.trim();

  if (passphrase !== TEAM_PASSPHRASE) {
    return NextResponse.json({ ok: false, error: "合い言葉が違います。" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, next: normalizeNextPath(body.next) });
  response.cookies.set(TEAM_ACCESS_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
  });
  return response;
}

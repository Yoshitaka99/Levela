import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, isSkillsGalaxyAdmin } from "../adminAuth";

export const dynamic = "force-dynamic";

const ADMIN_ID = process.env.SKILLS_GALAXY_ADMIN_ID || "Tanaka";
const ADMIN_PASSWORD = process.env.SKILLS_GALAXY_ADMIN_PASSWORD || "Levela2026";

export function GET(request: NextRequest) {
  return NextResponse.json({ authorized: isSkillsGalaxyAdmin(request) });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { id?: string; password?: string }
    | null;
  if (body?.id?.trim() !== ADMIN_ID || body?.password !== ADMIN_PASSWORD) {
    return NextResponse.json(
      { ok: false, error: "IDまたはパスワードが違います" },
      { status: 401 },
    );
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
  });
  return response;
}

export function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}

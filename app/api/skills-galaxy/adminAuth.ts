import type { NextRequest } from "next/server";

export const ADMIN_COOKIE = "levela_skills_galaxy_admin";

export function isSkillsGalaxyAdmin(request: NextRequest): boolean {
  return request.cookies.get(ADMIN_COOKIE)?.value === "1";
}

import type { GalaxyData } from "./types";
import { parseGalaxyData } from "./storage";

export type SyncResult =
  | { status: "ok"; data: GalaxyData | null }
  | { status: "not-configured" }
  | { status: "unauthorized" }
  | { status: "error" };

export async function pullFromCloud(): Promise<SyncResult> {
  try {
    const res = await fetch("/api/skills-galaxy", { cache: "no-store" });
    if (res.status === 503) return { status: "not-configured" };
    if (!res.ok) return { status: "error" };
    const json = (await res.json()) as { data?: unknown };
    return { status: "ok", data: json.data ? parseGalaxyData(json.data) : null };
  } catch {
    return { status: "error" };
  }
}

export async function pushToCloud(data: GalaxyData): Promise<SyncResult> {
  try {
    const res = await fetch("/api/skills-galaxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    });
    if (res.status === 503) return { status: "not-configured" };
    if (res.status === 401) return { status: "unauthorized" };
    if (!res.ok) return { status: "error" };
    return { status: "ok", data };
  } catch {
    return { status: "error" };
  }
}

export async function checkAdmin(): Promise<boolean> {
  try {
    const res = await fetch("/api/skills-galaxy/auth", { cache: "no-store" });
    if (!res.ok) return false;
    const json = (await res.json()) as { authorized?: boolean };
    return json.authorized === true;
  } catch {
    return false;
  }
}

export async function loginAdmin(
  id: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/skills-galaxy/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, password }),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (res.ok && json.ok) return { ok: true };
    return { ok: false, error: json.error ?? "ログインに失敗しました" };
  } catch {
    return { ok: false, error: "通信エラーが発生しました" };
  }
}

export async function logoutAdmin(): Promise<void> {
  try {
    await fetch("/api/skills-galaxy/auth", { method: "DELETE" });
  } catch {
    // ignore
  }
}

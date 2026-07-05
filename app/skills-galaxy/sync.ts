import type { GalaxyData } from "./types";
import { parseGalaxyData } from "./storage";

export type SyncResult =
  | { status: "ok"; data: GalaxyData | null }
  | { status: "not-configured" }
  | { status: "error" };

export const SYNC_KEY_STORAGE = "levela-skills-galaxy-sync-key";

export function loadSyncKey(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(SYNC_KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

export function saveSyncKey(key: string) {
  try {
    if (key) window.localStorage.setItem(SYNC_KEY_STORAGE, key);
    else window.localStorage.removeItem(SYNC_KEY_STORAGE);
  } catch {
    // ignore
  }
}

export async function pullFromCloud(key: string): Promise<SyncResult> {
  try {
    const res = await fetch(`/api/skills-galaxy?key=${encodeURIComponent(key)}`, {
      cache: "no-store",
    });
    if (res.status === 503) return { status: "not-configured" };
    if (!res.ok) return { status: "error" };
    const json = (await res.json()) as { data?: unknown };
    return { status: "ok", data: json.data ? parseGalaxyData(json.data) : null };
  } catch {
    return { status: "error" };
  }
}

export async function pushToCloud(key: string, data: GalaxyData): Promise<SyncResult> {
  try {
    const res = await fetch("/api/skills-galaxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, data }),
    });
    if (res.status === 503) return { status: "not-configured" };
    if (!res.ok) return { status: "error" };
    return { status: "ok", data };
  } catch {
    return { status: "error" };
  }
}

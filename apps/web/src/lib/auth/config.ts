/**
 * Auth configuration helpers.
 *
 * DCOS supports two auth backends:
 *   - Supabase Auth (production) — when real credentials are present.
 *   - Local-JWT dev fallback — hits POST /api/v1/identity/token. Used when
 *     Supabase env vars are absent or still placeholders.
 *
 * This lets the entire UI be built and tested locally now, and go fully live
 * the moment real Supabase keys are pasted into apps/web/.env.local.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const PLACEHOLDER_FRAGMENTS = ["your-project", "your-anon-key", ""];

export function isSupabaseConfigured(): boolean {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false;
  if (PLACEHOLDER_FRAGMENTS.some((f) => f && SUPABASE_URL.includes(f))) return false;
  if (SUPABASE_ANON_KEY.includes("your-anon-key")) return false;
  return SUPABASE_URL.startsWith("http");
}

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const TOKEN_STORAGE_KEY = "dcos_token";
export const USER_STORAGE_KEY = "dcos_user";

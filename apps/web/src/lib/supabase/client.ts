"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "../auth/config";

/**
 * Browser Supabase client. Returns null when Supabase isn't configured,
 * so callers fall back to the local-JWT dev path.
 */
export function getSupabaseBrowserClient() {
  if (!isSupabaseConfigured()) return null;
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

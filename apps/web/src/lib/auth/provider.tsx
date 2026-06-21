"use client";

import * as React from "react";
import { getSupabaseBrowserClient } from "../supabase/client";
import {
  API_BASE,
  TOKEN_STORAGE_KEY,
  USER_STORAGE_KEY,
  isSupabaseConfigured,
} from "./config";
import type { AuthUser, Role } from "./types";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  /** Dev/local login via the FastAPI local-JWT endpoint. */
  loginLocal: (role: Role, identifier: string, name?: string) => Promise<AuthUser>;
  /** Supabase phone-OTP request (citizen). No-op message in dev. */
  requestOtp: (phone: string) => Promise<{ ok: boolean; message: string }>;
  verifyOtp: (phone: string, code: string) => Promise<AuthUser>;
  /** Supabase email+password (officer/admin). */
  loginPassword: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

/** Demo credentials — bypass real Supabase OTP for hackathon demos. */
export const DEMO_PHONE = "+919999000000";
export const DEMO_OTP = "000000";

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

/** Decode a JWT payload (no verification — display only). */
function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

function userFromClaims(claims: Record<string, unknown>): AuthUser {
  const appMeta = (claims.app_metadata as Record<string, unknown>) ?? {};
  const userMeta = (claims.user_metadata as Record<string, unknown>) ?? {};
  // Role comes from app_metadata (admin-only); 'authenticated' is Supabase's DB role.
  let role = (appMeta.dcos_role ?? claims.role ?? "citizen") as string;
  if (role === "authenticated") role = (appMeta.dcos_role as string) ?? "citizen";
  return {
    id: String(claims.sub ?? "unknown"),
    name: String(userMeta.name ?? appMeta.name ?? claims.name ?? "User"),
    email: claims.email ? String(claims.email) : undefined,
    phone: claims.phone ? String(claims.phone) : undefined,
    role: role as Role,
    department_id: appMeta.department_id ? String(appMeta.department_id) : undefined,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [token, setToken] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Hydrate from storage / Supabase session on mount
  React.useEffect(() => {
    let active = true;
    const supabase = getSupabaseBrowserClient();

    // Mirror the Supabase access token into TOKEN_STORAGE_KEY so apiFetch (which
    // reads that key) sends a valid bearer for both auth modes. Kept fresh by
    // onAuthStateChange (covers initial load, login, and token refresh).
    const applySession = (t: string | null) => {
      if (t) {
        localStorage.setItem(TOKEN_STORAGE_KEY, t);
        const claims = decodeJwt(t);
        setToken(t);
        if (claims) setUser(userFromClaims(claims));
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setToken(null);
        setUser(null);
      }
    };

    (async () => {
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        if (active) applySession(data.session?.access_token ?? null);
      } else {
        const t = localStorage.getItem(TOKEN_STORAGE_KEY);
        const u = localStorage.getItem(USER_STORAGE_KEY);
        if (active && t) {
          setToken(t);
          if (u) setUser(JSON.parse(u));
        }
      }
      if (active) setLoading(false);
    })();

    const sub = supabase?.auth.onAuthStateChange((_event, session) => {
      if (active) applySession(session?.access_token ?? null);
    });

    return () => {
      active = false;
      sub?.data.subscription.unsubscribe();
    };
  }, []);

  const persistLocal = (t: string, u: AuthUser) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, t);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
    setToken(t);
    setUser(u);
  };

  const loginLocal = React.useCallback(
    async (role: Role, identifier: string, name?: string): Promise<AuthUser> => {
      const res = await fetch(`${API_BASE}/api/v1/identity/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, name: name ?? identifier }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Login failed (${res.status}): ${body}`);
      }
      const data = await res.json();
      const t: string = data.access_token ?? data.token;
      const claims = decodeJwt(t);
      const u = claims
        ? userFromClaims(claims)
        : {
            id: "local",
            name: name ?? identifier,
            role,
            email: identifier.includes("@") ? identifier : undefined,
            phone: identifier.includes("@") ? undefined : identifier,
          };
      persistLocal(t, u);
      return u;
    },
    []
  );

  const requestOtp = React.useCallback(
    async (phone: string): Promise<{ ok: boolean; message: string }> => {
      // Demo shortcut — skip Supabase SMS entirely for the demo number
      if (phone === DEMO_PHONE || !isSupabaseConfigured()) {
        return { ok: true, message: `Demo: enter ${DEMO_OTP} to sign in as a citizen.` };
      }
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        return { ok: true, message: `Demo: enter ${DEMO_OTP} to sign in.` };
      }
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) return { ok: false, message: error.message };
      return { ok: true, message: "OTP sent to your phone." };
    },
    []
  );

  const verifyOtp = React.useCallback(
    async (phone: string, code: string): Promise<AuthUser> => {
      // Master demo OTP — bypass production's disabled /identity/token endpoint
      if (code === DEMO_OTP) {
        const supabase = getSupabaseBrowserClient();
        if (supabase) {
          // Try Supabase anonymous sign-in → real JWT, works in production
          const { data, error } = await supabase.auth.signInAnonymously();
          if (!error && data.session) {
            const t = data.session.access_token;
            const claims = decodeJwt(t);
            const u: AuthUser = claims
              ? { ...userFromClaims(claims), name: "Demo Citizen", phone, role: "citizen" }
              : { id: "demo", name: "Demo Citizen", phone, role: "citizen" };
            persistLocal(t, u);
            return u;
          }
        }
        // Fallback: client-side session without a token
        // Citizen endpoints (file, track, public-stats) don't require auth
        const u: AuthUser = { id: "demo-citizen", name: "Demo Citizen", phone, role: "citizen" };
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
        setUser(u);
        return u;
      }

      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        // Dev mode — local API token
        return loginLocal("citizen", phone);
      }
      const { data, error } = await supabase.auth.verifyOtp({ phone, token: code, type: "sms" });
      if (error || !data.session) throw new Error(error?.message ?? "OTP verification failed");
      const t = data.session.access_token;
      const claims = decodeJwt(t);
      const u = claims ? userFromClaims(claims) : { id: "u", name: phone, role: "citizen" as Role };
      setToken(t);
      setUser(u);
      return u;
    },
    [loginLocal]
  );

  const loginPassword = React.useCallback(
    async (email: string, password: string): Promise<AuthUser> => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        // Dev fallback: infer role from email, issue local JWT
        const role: Role = email.startsWith("cm")
          ? "cm_cell"
          : email.startsWith("admin")
            ? "dept_admin"
            : "field_officer";
        return loginLocal(role, email);
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.session) throw new Error(error?.message ?? "Login failed");
      const t = data.session.access_token;
      const claims = decodeJwt(t);
      const u = claims
        ? userFromClaims(claims)
        : { id: "u", name: email, email, role: "field_officer" as Role };
      setToken(t);
      setUser(u);
      return u;
    },
    [loginLocal]
  );

  const logout = React.useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) await supabase.auth.signOut();
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value: AuthContextValue = {
    user,
    token,
    loading,
    loginLocal,
    requestOtp,
    verifyOtp,
    loginPassword,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { isSupabaseConfigured };

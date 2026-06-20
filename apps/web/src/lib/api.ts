import { TOKEN_STORAGE_KEY } from "./auth/config";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** Read the local-JWT token from storage (browser only). */
function storedToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { token?: string }
): Promise<T> {
  const { token, ...rest } = init ?? {};
  const bearer = token ?? storedToken();
  const res = await fetch(`${BASE}/api/v1${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      ...(rest.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

/** SWR-friendly fetcher that auto-attaches the stored token. */
export const swrFetcher = <T>(path: string): Promise<T> => apiFetch<T>(path);

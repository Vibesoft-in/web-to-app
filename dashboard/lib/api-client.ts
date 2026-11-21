export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly errors?: Record<string, string[]>,
    public readonly status: number = 400
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const AUTH_TOKEN_KEY = "appifyhub_auth_token";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      if (token.startsWith("demo_token_")) {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        return null;
      }
      return token;
    }
    // Cookie fallback if localStorage was cleared
    if (typeof document !== "undefined" && document.cookie) {
      const match = document.cookie.match(/(?:^|;\s*)(?:auth_token|token|appifyhub_auth_token)=([^;]+)/);
      if (match && match[1]) {
        const cookieToken = decodeURIComponent(match[1]);
        if (cookieToken.startsWith("demo_token_")) {
          return null;
        }
        try {
          localStorage.setItem(AUTH_TOKEN_KEY, cookieToken);
        } catch {}
        return cookieToken;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function setAuthToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    if (token && !token.startsWith("demo_token_")) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      if (typeof document !== "undefined") {
        document.cookie = `auth_token=${encodeURIComponent(token)}; path=/; max-age=604800; SameSite=Lax`;
      }
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      if (typeof document !== "undefined") {
        document.cookie = "auth_token=; path=/; max-age=0; SameSite=Lax";
      }
    }
  } catch {}
}

export function clearAuthToken(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem("appifyhub_temp_store_url");
    localStorage.removeItem("appifyhub_user_avatar");
    localStorage.removeItem("appifyhub_user_store_data");
    localStorage.removeItem("appifyhub_selected_theme");
    localStorage.removeItem("appifyhub_selected_plan_info");
    localStorage.removeItem("appifyhub_selected_plan");
    localStorage.removeItem("appifyhub_selected_plan_id");
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.clear();
    }
    if (typeof document !== "undefined") {
      const cookieNames = [
        "auth_token",
        "auth_user",
        "appifyhub_auth_token",
        "appifyhub_token",
        "token",
      ];
      for (const name of cookieNames) {
        document.cookie = `${name}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
      }
    }
  } catch {}
}

export async function apiClient<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Accept": "application/json",
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  // Attach token from localStorage or cookie if not already passed explicitly
  const token = getAuthToken();
  if (token) {
    if (!headers["Authorization"]) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    headers["X-Auth-Token"] = token;
    headers["X-Token"] = token;
    headers["X-Appify-Token"] = token;
    if (typeof document !== "undefined" && !document.cookie.includes("auth_token=")) {
      try {
        document.cookie = `auth_token=${encodeURIComponent(token)}; path=/; max-age=604800; SameSite=Lax`;
      } catch {}
    }
  }

  const res = await fetch(path, {
    credentials: "include",
    ...options,
    headers,
  });

  const contentType = res.headers.get("content-type");
  let json: any = {};
  if (contentType && contentType.includes("application/json")) {
    json = await res.json();
  } else {
    json = { message: await res.text() };
  }

  if (!res.ok) {
    const error = json.error || json;
    throw new ApiError(
      error.code || "UNKNOWN_ERROR",
      error.message || json.message || "An unexpected error occurred",
      error.errors || json.errors,
      res.status
    );
  }

  return json as T;
}

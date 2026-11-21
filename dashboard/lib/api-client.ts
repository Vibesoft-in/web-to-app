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
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  } catch {}
}

export function clearAuthToken(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
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

  // Attach token from localStorage if not already passed explicitly
  if (!headers["Authorization"]) {
    const token = getAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
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

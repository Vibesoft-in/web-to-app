import { cookies, headers } from "next/headers";

const BACKEND_BASE_URL =
  process.env.BACKEND_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://api.livaan.in"
    : "http://127.0.0.1:8000");

export interface ApiResponse<T = any> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    errors?: Record<string, string[]>;
  };
  status: number;
}

export async function serverFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const headersMap: Record<string, string> = {
    "Accept": "application/json",
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  // If Authorization header is not already passed in options, resolve from incoming request
  if (!headersMap["Authorization"] && !headersMap["authorization"]) {
    let incomingAuth: string | null = null;
    try {
      const reqHeaders = headers();
      incomingAuth = reqHeaders.get("authorization") || reqHeaders.get("Authorization");
    } catch {}

    if (incomingAuth) {
      headersMap["Authorization"] = incomingAuth.startsWith("Bearer ")
        ? incomingAuth
        : `Bearer ${incomingAuth}`;
      const raw = incomingAuth.replace(/^Bearer\s+/i, "").trim();
      if (raw) {
        headersMap["X-Auth-Token"] = raw;
        headersMap["X-Token"] = raw;
        headersMap["X-Appify-Token"] = raw;
        headersMap["Cookie"] = `auth_token=${raw}`;
      }
    } else {
      try {
        const cookieStore = cookies();
        const token =
          cookieStore.get("auth_token")?.value ||
          cookieStore.get("appifyhub_auth_token")?.value ||
          cookieStore.get("token")?.value ||
          cookieStore.get("appifyhub_token")?.value;

        if (token) {
          headersMap["Authorization"] = `Bearer ${token}`;
          headersMap["X-Auth-Token"] = token;
          headersMap["X-Token"] = token;
          headersMap["X-Appify-Token"] = token;
          headersMap["Cookie"] = `auth_token=${token}`;
        }
      } catch {}
    }
  } else {
    const authVal = headersMap["Authorization"] || headersMap["authorization"] || "";
    const raw = authVal.replace(/^Bearer\s+/i, "").trim();
    if (raw) {
      headersMap["X-Auth-Token"] = raw;
      headersMap["X-Token"] = raw;
      headersMap["X-Appify-Token"] = raw;
      headersMap["Cookie"] = `auth_token=${raw}`;
    }
  }

  const url = `${BACKEND_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers: headersMap,
      cache: "no-store",
    });

    const contentType = res.headers.get("content-type");
    let json: any = {};
    if (contentType && contentType.includes("application/json")) {
      json = await res.json();
    } else {
      const text = await res.text();
      json = { message: text };
    }

    if (!res.ok) {
      return {
        error: json.error || {
          code: json.code || "REQUEST_FAILED",
          message: json.message || "Request failed",
          errors: json.errors,
        },
        status: res.status,
      };
    }

    return {
      data: json as T,
      status: res.status,
    };
  } catch (err: any) {
    return {
      error: {
        code: "NETWORK_ERROR",
        message: err.message || "Failed to connect to backend service.",
      },
      status: 503,
    };
  }
}

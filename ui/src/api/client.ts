export const getApiUrl = (): string => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const url = (import.meta as any).env?.VITE_API_URL;
  return typeof url === "string" ? url : "";
};

export const getWsUrl = (): string => {
  const apiBase = getApiUrl();
  let wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  let wsHost = window.location.host;
  let wsPath = "";
  
  if (apiBase && apiBase.startsWith("http")) {
    try {
      const parsed = new URL(apiBase);
      wsProtocol = parsed.protocol === "https:" ? "wss:" : "ws:";
      wsHost = parsed.host;
      wsPath = parsed.pathname === "/" ? "" : parsed.pathname;
    // eslint-disable-next-line no-empty
    } catch {}
  } else if (apiBase && apiBase.startsWith("/")) {
    wsPath = apiBase;
  }
  return `${wsProtocol}//${wsHost}${wsPath}`;
};

const BASE = `${getApiUrl()}/api`;

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers ?? undefined);
  const body = init?.body;
  if (!(body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${BASE}${path}`, {
    headers,
    credentials: "include",
    ...init,
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new ApiError(
      (errorBody as { error?: string } | null)?.error ?? `Request failed: ${res.status}`,
      res.status,
      errorBody,
    );
  }
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  postForm: <T>(path: string, body: FormData) =>
    request<T>(path, { method: "POST", body }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

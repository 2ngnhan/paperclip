export const getApiUrl = (): string => {
  // @ts-expect-error Vite injects env on import.meta
  const url = import.meta.env.VITE_API_URL;
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

export type DevServerHealthStatus = {
  enabled: true;
  restartRequired: boolean;
  reason: "backend_changes" | "pending_migrations" | "backend_changes_and_pending_migrations" | null;
  lastChangedAt: string | null;
  changedPathCount: number;
  changedPathsSample: string[];
  pendingMigrations: string[];
  autoRestartEnabled: boolean;
  activeRunCount: number;
  waitingForIdle: boolean;
  lastRestartAt: string | null;
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

  const isHtml = res.headers.get("content-type")?.includes("text/html");

  if (!res.ok) {
    const errorBody = isHtml ? await res.text().catch(() => null) : await res.json().catch(() => null);
    throw new ApiError(
      typeof errorBody === "object" && errorBody !== null
        ? (errorBody as { error?: string })?.error ?? `Request failed: ${res.status}`
        : `Request failed: ${res.status}`,
      res.status,
      errorBody,
    );
  }
  if (res.status === 204) return undefined as T;

  if (isHtml) {
    const text = await res.text().catch(() => "");
    throw new ApiError(
      "Received HTML response instead of JSON. Ensure VITE_API_URL is configured.",
      res.status,
      text
    );
  }

  const text = await res.text().catch(() => "");
  if (!text) return {} as T;

  try {
    return JSON.parse(text);
  } catch (err) {
    if (text.trim().startsWith("<")) {
      throw new ApiError(
        "Invalid JSON response (suspected HTML payload).",
        res.status,
        text
      );
    }
    throw err;
  }
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

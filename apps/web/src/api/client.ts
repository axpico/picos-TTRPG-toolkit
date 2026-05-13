export interface ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: "include",
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data: unknown = text ? safeJsonParse(text) : undefined;
  if (!res.ok) {
    const envelope = (data as { error?: { code?: string; message?: string; details?: unknown } })?.error;
    const err: ApiError = Object.assign(new Error(envelope?.message ?? res.statusText), {
      status: res.status,
      code: envelope?.code,
      details: envelope?.details,
    });
    throw err;
  }
  return data as T;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function upload<T>(path: string, file: File): Promise<T> {
  const form = new FormData();
  form.append("file", file, file.name);
  const res = await fetch(path, {
    method: "POST",
    credentials: "include",
    body: form,
  });
  const text = await res.text();
  const data: unknown = text ? safeJsonParse(text) : undefined;
  if (!res.ok) {
    const envelope = (data as { error?: { code?: string; message?: string } })?.error;
    const err: ApiError = Object.assign(new Error(envelope?.message ?? res.statusText), {
      status: res.status,
      code: envelope?.code,
    });
    throw err;
  }
  return data as T;
}

export const api = {
  get: <T,>(path: string) => request<T>("GET", path),
  post: <T,>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T,>(path: string, body?: unknown) => request<T>("PUT", path, body),
  patch: <T,>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T = void,>(path: string) => request<T>("DELETE", path),
  upload,
};

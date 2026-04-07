const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface ApiError {
  status: number;
  message: string;
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${BASE_URL}${path}`;

  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    const error: ApiError = {
      status: response.status,
      message: body || response.statusText,
    };
    throw error;
  }

  // 204 No Content — return undefined (used by DELETE endpoints)
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

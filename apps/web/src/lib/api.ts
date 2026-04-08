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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      signal: init?.signal ?? controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw { status: 0, message: "Request timed out" } as ApiError;
    }
    throw { status: 0, message: "Network error — is the API running?" } as ApiError;
  }
  clearTimeout(timeoutId);

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

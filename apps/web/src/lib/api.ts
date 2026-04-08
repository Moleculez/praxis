const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface ApiError {
  status: number;
  message: string;
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { timeout?: number },
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const timeout = init?.timeout ?? 10_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const { timeout: _timeout, ...fetchInit } = init ?? {};
    const response = await fetch(url, {
      ...fetchInit,
      signal: controller.signal,
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
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw { status: 0, message: "Request timed out" } as ApiError;
    }
    if ((err as ApiError).status !== undefined) {
      throw err; // Re-throw ApiError from !response.ok
    }
    throw { status: 0, message: "Network error — is the API running?" } as ApiError;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw err;
    }
    throw new Error("Network request could not reach the local server. Please try again.");
  }

  const text = await response.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}.`);
    }
    throw new Error("Received an unexpected non-JSON response from the server.");
  }

  if (!response.ok) {
    const errObj = parsed as { error?: string } | null;
    throw new Error(errObj?.error || `Request failed with status ${response.status}.`);
  }

  return parsed as T;
}

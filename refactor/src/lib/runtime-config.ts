function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configured) {
    return trimTrailingSlash(configured);
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

export function getLegacyBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_LEGACY_URL?.trim();
  if (configured) {
    return trimTrailingSlash(configured);
  }
  return "http://localhost:8080";
}

/**
 * Utility functions for robust URL normalization and validation.
 */

/**
 * Automatically normalizes a website URL entered by a user:
 * - If protocol is missing, prepends https://
 * - Preserves explicitly entered http:// URLs
 * - Prevents duplicate protocols (e.g. https://https://)
 * - Trims whitespace
 */
export function normalizeWebsiteUrl(input: string): string {
  if (!input) return "";
  let clean = input.trim();
  if (!clean) return "";

  // Strip duplicate protocols like "https://https://" or "http://https://"
  clean = clean.replace(/^(https?:\/\/)+(https?:\/\/)+/i, "$2");

  // If already starts with http:// or https://, preserve it
  if (/^https?:\/\//i.test(clean)) {
    return clean;
  }

  // If starts with leading slashes like "//example.com" or "://example.com"
  clean = clean.replace(/^:?\/\/+/, "");

  // Prepend https:// by default
  return `https://${clean}`;
}

/**
 * Validates domain and hostname structure.
 */
export function isValidUrlStructure(url: string): boolean {
  if (!url) return false;
  try {
    const normalized = normalizeWebsiteUrl(url);
    const parsed = new URL(normalized);
    const host = parsed.hostname.toLowerCase();
    const parts = host.split(".");
    const tld = parts[parts.length - 1];

    return Boolean(
      parts.length >= 2 &&
      tld &&
      tld.length >= 2 &&
      /^[a-z]+$/i.test(tld) &&
      parts.every((p) => p.length > 0)
    );
  } catch {
    return false;
  }
}

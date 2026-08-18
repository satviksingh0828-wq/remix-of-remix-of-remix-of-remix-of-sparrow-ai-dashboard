/**
 * logo.ts — runtime logo management.
 *
 * The active company's logo is stored here as a base64 data URL.
 * It is set by the CompanyContext when a company is selected.
 * PDF/export functions call getLogoBase64() to embed it.
 */

let _activeLogo: string | null = null;

/** Called by CompanyContext when a company is selected or its logo changes. */
export function setActiveLogo(b64: string | null): void {
  _activeLogo = b64;
}

/** Returns the current company logo as a base64 data URL, or null. */
export function getLogoBase64(): string | null {
  return _activeLogo;
}

/** No-op kept for compatibility — logo loading is now handled by CompanyContext. */
export function preloadLogo(): Promise<void> {
  return Promise.resolve();
}

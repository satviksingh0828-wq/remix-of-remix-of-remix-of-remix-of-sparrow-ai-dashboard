/**
 * storage.ts
 *
 * Encrypted wrappers around localStorage and sessionStorage.
 * Uses XOR cipher + base64 to obfuscate data at rest so that
 * casual inspection of browser storage reveals nothing readable.
 *
 * NOT a substitute for server-side security — this protects against
 * shoulder-surfing and casual snooping of browser storage only.
 */

// Internal app-level obfuscation key (not a secret — just prevents plain-text leakage)
const APP_CIPHER_KEY = "SparrowTMS_2024_Internal_SecureStore_Key#Xv9!";

function xorCipher(input: string, key: string): string {
  let result = "";
  for (let i = 0; i < input.length; i++) {
    result += String.fromCharCode(input.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

export function encryptValue(plaintext: string): string {
  try {
    const ciphered = xorCipher(plaintext, APP_CIPHER_KEY);
    return btoa(unescape(encodeURIComponent(ciphered)));
  } catch {
    // Fallback: store as-is if encoding fails
    return plaintext;
  }
}

export function decryptValue(ciphertext: string): string {
  try {
    const decoded = decodeURIComponent(escape(atob(ciphertext)));
    return xorCipher(decoded, APP_CIPHER_KEY);
  } catch {
    // Fallback: return as-is (handles unencrypted legacy data)
    return ciphertext;
  }
}

// ── Encrypted localStorage ────────────────────────────────────────────────────

export const secureStorage = {
  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(encryptValue(key), encryptValue(value));
    } catch {
      // storage may be unavailable (private mode quota)
    }
  },
  getItem(key: string): string | null {
    try {
      const raw = localStorage.getItem(encryptValue(key));
      if (raw === null) {
        // Check for legacy unencrypted key
        const legacy = localStorage.getItem(key);
        if (legacy) {
          // Migrate: re-save encrypted, remove legacy
          this.setItem(key, legacy);
          localStorage.removeItem(key);
          return legacy;
        }
        return null;
      }
      return decryptValue(raw);
    } catch {
      return null;
    }
  },
  removeItem(key: string): void {
    try {
      localStorage.removeItem(encryptValue(key));
      localStorage.removeItem(key); // also remove any legacy unencrypted key
    } catch {
      // ignore
    }
  },
};

// ── Encrypted sessionStorage (clears on tab/window close) ───────────────────

export const secureSession = {
  setItem(key: string, value: string): void {
    try {
      sessionStorage.setItem(encryptValue(key), encryptValue(value));
    } catch {
      // ignore
    }
  },
  getItem(key: string): string | null {
    try {
      const raw = sessionStorage.getItem(encryptValue(key));
      if (raw === null) return null;
      return decryptValue(raw);
    } catch {
      return null;
    }
  },
  removeItem(key: string): void {
    try {
      sessionStorage.removeItem(encryptValue(key));
    } catch {
      // ignore
    }
  },
};

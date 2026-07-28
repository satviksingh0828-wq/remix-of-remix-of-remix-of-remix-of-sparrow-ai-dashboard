/**
 * pow-captcha.ts — Self-contained Proof-of-Work CAPTCHA.
 *
 * No registration. No API keys. No external services. Zero dependencies.
 *
 * How it works:
 *   1. Server generates a random challenge + signs it with SESSION_SECRET (HMAC-SHA256).
 *      No DB storage needed — the signature proves server origin + expiry.
 *   2. Browser finds a nonce where SHA-256(challenge + nonce) starts with `difficulty` hex zeros.
 *   3. Server re-verifies: HMAC valid? Not expired? Hash solution correct?
 *
 * Security:
 *   - Bots must spend real CPU time per login attempt (difficulty 3 → ~4 096 SHA-256 ops avg).
 *   - Challenge expires in 10 minutes so tokens can't be stockpiled.
 *   - HMAC prevents forged challenges.
 */

import { createServerFn } from "@tanstack/react-start";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PowToken = {
  challenge: string; // 16-byte hex random
  nonce: number;     // solution found by browser
  expires: number;   // unix ms timestamp
  sig: string;       // HMAC-SHA256 of "challenge:expires"
};

export type PowChallenge = {
  challenge: string;
  difficulty: number;
  expires: number;
  sig: string;
};

// ── 1. Create challenge (server → browser) ────────────────────────────────────

export const serverCreatePoWChallenge = createServerFn({ method: "POST" })
  .handler(async (): Promise<PowChallenge> => {
    const { randomBytes, createHmac } = await import("crypto");
    const secret = process.env.SESSION_SECRET ?? "dev-fallback-secret";
    const challenge = randomBytes(16).toString("hex");
    const expires = Date.now() + 10 * 60 * 1000; // 10-minute window
    const sig = createHmac("sha256", secret)
      .update(`${challenge}:${expires}`)
      .digest("hex");
    return { challenge, difficulty: 3, expires, sig };
  });

// ── 2. Verify solution (called inline from serverSignIn) ─────────────────────

export function verifyPoWToken(token: PowToken, difficulty = 3): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createHmac, createHash } = require("crypto") as typeof import("crypto");
    const secret = process.env.SESSION_SECRET ?? "dev-fallback-secret";

    // Expired?
    if (Date.now() > token.expires) return false;

    // HMAC valid?
    const expectedSig = createHmac("sha256", secret)
      .update(`${token.challenge}:${token.expires}`)
      .digest("hex");
    if (expectedSig !== token.sig) return false;

    // Hash solution valid?
    const hash = createHash("sha256")
      .update(`${token.challenge}${token.nonce}`)
      .digest("hex");
    return hash.startsWith("0".repeat(difficulty));
  } catch {
    return false;
  }
}

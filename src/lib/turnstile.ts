/**
 * turnstile.ts — Server-side Cloudflare Turnstile token verification.
 *
 * Test secret (no account needed): 1x0000000000000000000000000000000AA
 * Production: set TURNSTILE_SECRET_KEY in Vercel Environment Variables.
 */
import { createServerFn } from "@tanstack/react-start";

const TEST_SECRET = "1x0000000000000000000000000000000AA";

export type TurnstileVerification = { ok: boolean; error?: string };

export async function verifyTurnstileToken(data: { token: string; ip?: string }): Promise<TurnstileVerification> {
  const secret = process.env.TURNSTILE_SECRET_KEY ?? TEST_SECRET;
  const token  = data.token?.trim();

  if (!token) return { ok: false, error: "Missing CAPTCHA token." };

  try {
    const body = new URLSearchParams({
      secret,
      response: token,
      ...(data.ip ? { remoteip: data.ip } : {}),
    });

    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body, headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    if (!res.ok) return { ok: false, error: "Turnstile service unavailable." };

    const json = await res.json() as { success: boolean; "error-codes"?: string[] };
    if (!json.success) {
      const codes = (json["error-codes"] ?? []).join(", ");
      return { ok: false, error: `CAPTCHA failed${codes ? ": " + codes : "."}`  };
    }
    return { ok: true };
  } catch (err) {
    console.error("[Turnstile]", err);
    return { ok: false, error: "Could not verify CAPTCHA." };
  }
}

export const serverVerifyTurnstile = createServerFn({ method: "POST" })
  .validator((input: { token: string; ip?: string }) => input)
  .handler(async ({ data }) => verifyTurnstileToken(data));

/**
 * PowCaptcha — Zero-registration, zero-keys Proof-of-Work CAPTCHA.
 *
 * On mount the component:
 *   1. Fetches a server-signed challenge (no DB, stateless HMAC).
 *   2. Solves SHA-256 PoW in the browser using batched SubtleCrypto calls.
 *   3. Calls onToken({ challenge, nonce, expires, sig }) when done.
 *
 * The server verifies the token inline in serverSignIn — no external service.
 */
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { serverCreatePoWChallenge, type PowToken } from "@/lib/pow-captcha";

type Status = "idle" | "solving" | "done" | "error";

type Props = {
  onToken: (token: PowToken) => void;
  onExpire?: () => void;
  /** Ref to trigger a reset from the parent (e.g. on failed login) */
  resetRef?: React.MutableRefObject<(() => void) | null>;
};

// ── Browser SHA-256 via SubtleCrypto — batched for speed ─────────────────────

const enc = new TextEncoder();

async function hashHex(msg: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(msg));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function solvePow(
  challenge: string,
  difficulty: number,
  signal: AbortSignal,
): Promise<number> {
  const prefix = "0".repeat(difficulty);
  const BATCH = 200; // parallel hashes per tick
  let start = 0;

  while (!signal.aborted) {
    // Run BATCH hashes in parallel
    const indices = Array.from({ length: BATCH }, (_, i) => start + i);
    const results = await Promise.all(
      indices.map(async (nonce) => {
        const hex = await hashHex(`${challenge}${nonce}`);
        return hex.startsWith(prefix) ? nonce : null;
      }),
    );

    const found = results.find((n) => n !== null);
    if (found !== undefined && found !== null) return found;

    start += BATCH;
    // Yield to the browser event loop every batch
    await new Promise<void>((r) => setTimeout(r, 0));
  }
  throw new DOMException("Aborted", "AbortError");
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PowCaptcha({ onToken, onExpire, resetRef }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const abortRef = useRef<AbortController | null>(null);

  async function start() {
    // Cancel any in-progress solve
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setStatus("solving");
    try {
      const ch = await serverCreatePoWChallenge();
      const nonce = await solvePow(ch.challenge, ch.difficulty, ctrl.signal);
      if (ctrl.signal.aborted) return;

      const token: PowToken = {
        challenge: ch.challenge,
        nonce,
        expires: ch.expires,
        sig: ch.sig,
      };
      setStatus("done");
      onToken(token);

      // Auto-expire: re-solve when the token is 9 min old (1 min before server TTL)
      const ttl = ch.expires - Date.now() - 60_000;
      if (ttl > 0) {
        const timer = setTimeout(() => {
          onExpire?.();
          start();
        }, ttl);
        ctrl.signal.addEventListener("abort", () => clearTimeout(timer));
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      console.error("[PowCaptcha]", err);
      setStatus("error");
    }
  }

  useEffect(() => {
    start();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Expose reset to parent
  useEffect(() => {
    if (resetRef) resetRef.current = () => start();
    return () => { if (resetRef) resetRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-12 w-full items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 text-sm">
      {status === "solving" || status === "idle" ? (
        <>
          <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Running security check…</span>
          <span className="ml-auto text-[10px] uppercase tracking-widest text-muted-foreground/60">
            PoW
          </span>
        </>
      ) : status === "done" ? (
        <>
          <CheckCircle2 className="size-4 shrink-0 text-green-500" />
          <span className="text-green-700 dark:text-green-400">Security check passed</span>
          <span className="ml-auto text-[10px] uppercase tracking-widest text-muted-foreground/60">
            PoW
          </span>
        </>
      ) : (
        <>
          <ShieldAlert className="size-4 shrink-0 text-destructive" />
          <span className="text-destructive">Check failed</span>
          <button
            type="button"
            onClick={start}
            className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="size-3" />
            Retry
          </button>
        </>
      )}
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2, Lock, User } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/lib/session";
import { usePasskeyContext } from "@/components/PasskeyGate";
import { PowCaptcha } from "@/components/PowCaptcha";
import type { PowToken } from "@/lib/pow-captcha";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getLockoutRemaining,
  lockoutLabel,
  recordFailedAttempt,
  clearRateLimit,
} from "@/lib/login-rate-limit";
import { logAction } from "@/lib/log-actions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in — Project TMS | Sparrow AI Solutions" },
      { name: "description", content: "Secure operator sign-in for Project TMS." },
      { name: "robots", content: "noindex, nofollow, noarchive" },
    ],
  }),
  component: LoginPage,
});

// ── Login page ─────────────────────────────────────────────────────────────────

function LoginPage() {
  const { signIn, user, ready } = useSession();
  const { credentialId }        = usePasskeyContext();
  const navigate                = useNavigate();

  const [id, setId]             = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // PoW CAPTCHA state
  const [powToken, setPowToken] = useState<PowToken | null>(null);
  const powResetRef             = useRef<(() => void) | null>(null);

  // Honeypot
  const [honeypot, setHoneypot] = useState("");

  // Rate limit countdown
  const [lockedUntilMs, setLockedUntilMs] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (ready && user) navigate({ to: "/home", replace: true });
  }, [ready, user, navigate]);

  useEffect(() => {
    function tick() {
      const remaining = id.trim() ? getLockoutRemaining(id.trim()) : 0;
      setLockedUntilMs(remaining);
      if (remaining <= 0 && countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
        setError(null);
      }
    }
    countdownRef.current = setInterval(tick, 500);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [id]);

  function resetCaptcha() {
    setPowToken(null);
    powResetRef.current?.();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Honeypot
    if (honeypot.trim() !== "") return;

    // PoW check
    if (!powToken) {
      setError("Security check is still running — please wait a moment.");
      return;
    }

    // Rate limit
    const remaining = getLockoutRemaining(id.trim());
    if (remaining > 0) {
      setError(`Too many failed attempts. Try again in ${lockoutLabel(remaining)}.`);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await new Promise((r) => setTimeout(r, 400));
      const outcome = await signIn(id, password, powToken, credentialId ?? undefined);

      if (outcome.ok) {
        clearRateLimit(id.trim());
        logAction("login_success", "login", { entityLabel: id.trim() });
        toast.success("Welcome back");
        navigate({ to: "/home", replace: true });
      } else {
        const lockMs = recordFailedAttempt(id.trim());
        logAction("login_failed", "login", { entityLabel: id.trim(), details: { reason: outcome.reason } });
        // Always refresh PoW after a failed attempt
        resetCaptcha();
        if (lockMs > 0) {
          setError(`Too many failed attempts. Account locked for ${lockoutLabel(lockMs)}.`);
        } else {
          setError(outcome.message);
        }
      }
    } catch (err) {
      void (err instanceof Error ? err.message : String(err));
      setError("Unexpected error — please try again.");
      resetCaptcha();
    } finally {
      setBusy(false);
    }
  }

  const isLocked  = lockedUntilMs > 0;
  const canSubmit = !!powToken && !isLocked && !busy;

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Banner */}
      <aside
        className="relative hidden items-center justify-center overflow-hidden px-12 lg:flex"
        style={{ backgroundImage: "var(--gradient-brand)" }}
      >
        <div className="pointer-events-none absolute -left-24 -top-24 size-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-16 size-[26rem] rounded-full bg-white/10 blur-3xl" />
        <div className="relative animate-fade-up text-center text-primary-foreground">
          <h1 className="text-4xl font-semibold uppercase leading-tight tracking-[0.14em] xl:text-5xl">
            Sparrow AI
            <br />
            Solutions
          </h1>
          <div className="mx-auto my-7 h-px w-24 bg-white/40" />
          <p className="text-lg font-medium uppercase tracking-[0.42em] opacity-90">Project TMS</p>
          <p className="mx-auto mt-8 max-w-sm text-sm leading-relaxed opacity-80">
            Transport management, masters and operations — unified in one clean workspace.
          </p>
        </div>
      </aside>

      {/* Login */}
      <section className="flex items-center justify-center bg-background px-6 py-14">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="mb-9 lg:hidden">
            <p className="text-xl font-semibold uppercase tracking-[0.12em]">Sparrow AI Solutions</p>
            <p className="mt-1 text-xs uppercase tracking-[0.35em] text-muted-foreground">
              Project TMS
            </p>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Enter your operator credentials to continue.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            {/* Honeypot */}
            <div
              style={{ position: "absolute", left: "-9999px", top: "-9999px", opacity: 0, height: 0, overflow: "hidden" }}
              aria-hidden="true"
              tabIndex={-1}
            >
              <label>Leave this field empty</label>
              <input
                type="text"
                name="website"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                autoComplete="off"
                tabIndex={-1}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="loginId">Login ID</Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="loginId"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  placeholder="admin"
                  autoComplete="username"
                  className="h-11 pl-9"
                  required
                  disabled={isLocked || busy}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="h-11 pl-9"
                  required
                  disabled={isLocked || busy}
                />
              </div>
            </div>

            {/* PoW CAPTCHA — no registration, no keys, fully self-contained */}
            <div className="space-y-1.5">
              <Label className="text-sm">Security check</Label>
              <PowCaptcha
                onToken={setPowToken}
                onExpire={() => setPowToken(null)}
                resetRef={powResetRef}
              />
            </div>

            {error ? (
              <p className="animate-fade-in rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {isLocked
                  ? `Account temporarily locked. Try again in ${lockoutLabel(lockedUntilMs)}.`
                  : error}
              </p>
            ) : null}

            <Button type="submit" disabled={!canSubmit} className="h-11 w-full">
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {busy
                ? "Signing in…"
                : isLocked
                  ? `Locked — ${lockoutLabel(lockedUntilMs)}`
                  : "Sign in"}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Access is limited to authorised operators. Contact your administrator for credentials.
          </p>
        </div>
      </section>
    </div>
  );
}

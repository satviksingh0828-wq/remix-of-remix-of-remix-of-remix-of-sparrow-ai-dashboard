import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2, Lock, RefreshCw, User } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/lib/session";
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
      // Prevent this page from being indexed or cached by search engines
      { name: "robots", content: "noindex, nofollow, noarchive" },
    ],
  }),
  component: LoginPage,
});

// ── Simple math CAPTCHA (no API, no registration) ─────────────────────────────

function generateCaptcha() {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  return { a, b, answer: a + b };
}

// ── Login page ─────────────────────────────────────────────────────────────────

function LoginPage() {
  const { signIn, user, ready } = useSession();
  const navigate = useNavigate();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // CAPTCHA state
  const [captcha, setCaptcha] = useState(generateCaptcha);
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaError, setCaptchaError] = useState(false);

  // Honeypot field (bots fill this; humans don't see it)
  const [honeypot, setHoneypot] = useState("");

  // Rate limit countdown
  const [lockedUntilMs, setLockedUntilMs] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (ready && user) navigate({ to: "/home", replace: true });
  }, [ready, user, navigate]);

  // Poll for lockout expiry
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

  function refreshCaptcha() {
    setCaptcha(generateCaptcha());
    setCaptchaInput("");
    setCaptchaError(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Honeypot check — bots fill it, humans leave it blank
    if (honeypot.trim() !== "") return;

    // CAPTCHA check
    const expectedAnswer = captcha.answer;
    const providedAnswer = parseInt(captchaInput.trim(), 10);
    if (isNaN(providedAnswer) || providedAnswer !== expectedAnswer) {
      setCaptchaError(true);
      refreshCaptcha();
      return;
    }
    setCaptchaError(false);

    // Rate limit check
    const remaining = getLockoutRemaining(id.trim());
    if (remaining > 0) {
      setError(`Too many failed attempts. Try again in ${lockoutLabel(remaining)}.`);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await new Promise((r) => setTimeout(r, 650));
      const outcome = await signIn(id, password);
      if (outcome.ok) {
        clearRateLimit(id.trim());
        logAction("login_success", "login", { entityLabel: id.trim() });
        toast.success("Welcome back");
        navigate({ to: "/home", replace: true });
      } else {
        const lockMs = recordFailedAttempt(id.trim());
        logAction("login_failed", "login", { entityLabel: id.trim(), details: { reason: outcome.reason } });
        if (lockMs > 0) {
          setError(
            `Too many failed attempts. Account locked for ${lockoutLabel(lockMs)}.`,
          );
        } else {
          setError(outcome.message);
        }
        refreshCaptcha();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Unexpected error — please try again.`);
      void msg;
      refreshCaptcha();
    } finally {
      setBusy(false);
    }
  }

  const isLocked = lockedUntilMs > 0;

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
            {/* Honeypot — visually hidden, bots fill it */}
            <div style={{ position: "absolute", left: "-9999px", top: "-9999px", opacity: 0, height: 0, overflow: "hidden" }} aria-hidden="true" tabIndex={-1}>
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

            {/* Math CAPTCHA */}
            <div className="space-y-2">
              <Label htmlFor="captcha">
                Security check — What is {captcha.a} + {captcha.b}?
              </Label>
              <div className="flex gap-2">
                <Input
                  id="captcha"
                  type="number"
                  value={captchaInput}
                  onChange={(e) => { setCaptchaInput(e.target.value); setCaptchaError(false); }}
                  placeholder="Answer"
                  className={`h-11 flex-1 ${captchaError ? "border-destructive" : ""}`}
                  required
                  disabled={isLocked || busy}
                  autoComplete="off"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11"
                  onClick={refreshCaptcha}
                  title="New question"
                  disabled={isLocked || busy}
                >
                  <RefreshCw className="size-4" />
                </Button>
              </div>
              {captchaError ? (
                <p className="text-xs text-destructive">Incorrect answer — a new question has been generated.</p>
              ) : null}
            </div>

            {error ? (
              <p className="animate-fade-in rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {isLocked
                  ? `Account temporarily locked. Try again in ${lockoutLabel(lockedUntilMs)}.`
                  : error}
              </p>
            ) : null}

            <Button type="submit" disabled={busy || isLocked} className="h-11 w-full">
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {busy ? "Signing in…" : isLocked ? `Locked — ${lockoutLabel(lockedUntilMs)}` : "Sign in"}
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

/**
 * InactivityChallenge — Pops up a simple math challenge after a long period of
 * inactivity OR when bot-like behaviour is detected (rapid automated clicks).
 * Dismisses immediately on a correct answer. Does not block first load.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { Shield } from "lucide-react";

const INACTIVITY_MS   = 30 * 60 * 1000; // 30 minutes
const BOT_CLICK_LIMIT = 20;              // >20 clicks in 2 s = suspicious
const BOT_WINDOW_MS   = 2_000;

function makeChallenge() {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  return { a, b, answer: String(a + b) };
}

export function InactivityChallenge() {
  const [open, setOpen]       = useState(false);
  const [challenge, setChallenge] = useState(() => makeChallenge());
  const [input, setInput]     = useState("");
  const [shake, setShake]     = useState(false);

  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clicksRef  = useRef<number[]>([]);

  const showChallenge = useCallback(() => {
    setChallenge(makeChallenge());
    setInput("");
    setShake(false);
    setOpen(true);
  }, []);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(showChallenge, INACTIVITY_MS);
  }, [showChallenge]);

  // Track rapid clicks for bot detection
  const onClick = useCallback(() => {
    const now = Date.now();
    clicksRef.current.push(now);
    // Keep only clicks within the detection window
    clicksRef.current = clicksRef.current.filter(t => now - t < BOT_WINDOW_MS);
    if (clicksRef.current.length > BOT_CLICK_LIMIT) {
      clicksRef.current = [];
      showChallenge();
    }
    resetTimer();
  }, [resetTimer, showChallenge]);

  useEffect(() => {
    const events: (keyof DocumentEventMap)[] = ["mousemove", "keydown", "scroll", "touchstart"];

    const handler = () => resetTimer();
    events.forEach(e => document.addEventListener(e, handler, { passive: true }));
    document.addEventListener("click", onClick, { passive: true });

    // Start the timer
    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach(e => document.removeEventListener(e, handler));
      document.removeEventListener("click", onClick);
    };
  }, [resetTimer, onClick]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (input.trim() === challenge.answer) {
      setOpen(false);
      resetTimer();
    } else {
      setShake(true);
      setInput("");
      setChallenge(makeChallenge());
      setTimeout(() => setShake(false), 600);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div
        className={`w-full max-w-xs rounded-2xl border border-border bg-card p-7 shadow-2xl text-center ${shake ? "animate-shake" : ""}`}
        style={shake ? { animation: "shake 0.5s ease" } : {}}
      >
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10">
          <Shield className="size-7 text-primary" />
        </div>
        <h2 className="mt-4 text-lg font-semibold tracking-tight">Verify you're human</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Answer this quick question to continue.
        </p>

        <p className="mt-5 text-3xl font-bold tracking-tight text-foreground">
          {challenge.a} + {challenge.b} = ?
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <input
            type="number"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Your answer"
            autoFocus
            required
            min={0}
            max={18}
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Confirm
          </button>
        </form>

        <p className="mt-4 text-[10px] text-muted-foreground/60 uppercase tracking-widest">
          Powered by Sparrow AI Solutions
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-8px); }
          40%       { transform: translateX(8px); }
          60%       { transform: translateX(-6px); }
          80%       { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}

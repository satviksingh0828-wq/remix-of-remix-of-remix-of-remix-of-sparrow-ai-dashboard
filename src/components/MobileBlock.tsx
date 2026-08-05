/**
 * MobileBlock — Detects mobile / touch-only devices and shows a
 * "desktop only" wall before anything else renders.
 *
 * Detection strategy (either triggers the block):
 *   1. User-agent contains known mobile keywords
 *   2. Window width is narrower than 768 px on first paint
 *      AND the device has touch support (rules out small browser windows on a PC)
 */
import { useEffect, useState, type ReactNode } from "react";
import { MonitorX } from "lucide-react";
import { PoweredBy } from "./PoweredBy";

function isMobileUA(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i.test(
    navigator.userAgent,
  );
}

function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 768 && navigator.maxTouchPoints > 0;
}

export function MobileBlock({ children }: { children: ReactNode }) {
  const [blocked, setBlocked] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setBlocked(isMobileUA() || isMobileViewport());
    setChecked(true);
  }, []);

  // SSR / before check: render nothing to avoid flash
  if (!checked) return null;

  if (blocked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-red-50 dark:bg-red-950">
          <MonitorX className="size-10 text-red-500" />
        </div>

        <h1 className="mt-6 text-2xl font-bold tracking-tight text-foreground">
          Mobile Access Blocked
        </h1>
        <p className="mt-3 max-w-xs text-sm text-muted-foreground">
          This application is designed for desktop use only. Please open it on a
          laptop or desktop computer for the best experience.
        </p>

        <div className="mt-6 rounded-xl border border-border bg-muted/40 px-4 py-3 text-left text-sm text-muted-foreground max-w-xs">
          <span className="font-medium text-foreground">Note: </span>
          Access from a Windows / Mac desktop browser (Chrome or Edge recommended).
        </div>

        <PoweredBy className="mt-10 text-[10px] uppercase tracking-[0.22em] text-muted-foreground/50" />
      </div>
    );
  }

  return <>{children}</>;
}

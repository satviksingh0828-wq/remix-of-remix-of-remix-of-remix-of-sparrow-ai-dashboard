import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { serverSignIn } from "@/lib/user-auth";
import type { SessionUser } from "@/lib/user-auth";
import { secureSession } from "@/lib/storage";
import { setLoggerUser } from "@/lib/log-actions";

export type { SessionUser };

// Session stored in sessionStorage (auto-cleared on window/tab close → auto logout)
const KEY = "tms.session.v2";

export type SignInOutcome =
  | { ok: true }
  | { ok: false; reason: "invalid_credentials" | "server_error"; message: string };

type SessionValue = {
  ready: boolean;
  user: SessionUser | null;
  signIn: (username: string, password: string) => Promise<SignInOutcome>;
  signOut: () => void;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      // Read from encrypted sessionStorage (clears on window close = auto logout)
      const raw = secureSession.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SessionUser;
        setUser(parsed);
        setLoggerUser(parsed);
      }
    } catch {
      // ignore corrupt storage
    }
    // Clean up any legacy localStorage session keys
    try {
      localStorage.removeItem("tms.session.v2");
      localStorage.removeItem("tms.session");
    } catch {
      // ignore
    }
    setReady(true);
  }, []);

  const signIn = useCallback(async (username: string, password: string): Promise<SignInOutcome> => {
    try {
      const result = await serverSignIn({ data: { username, password } });
      if (!result.ok) return result;
      secureSession.setItem(KEY, JSON.stringify(result.user));
      setUser(result.user);
      setLoggerUser(result.user);
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, reason: "server_error", message: `Unexpected error: ${msg}` };
    }
  }, []);

  const signOut = useCallback(() => {
    secureSession.removeItem(KEY);
    // Clear any legacy keys
    try {
      localStorage.removeItem("tms.session.v2");
      localStorage.removeItem("tms.session");
    } catch {
      // ignore
    }
    setUser(null);
    setLoggerUser(null);
  }, []);

  const value = useMemo(
    () => ({ ready, user, signIn, signOut }),
    [ready, user, signIn, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}

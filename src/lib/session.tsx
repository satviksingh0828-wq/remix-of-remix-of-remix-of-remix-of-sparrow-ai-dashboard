import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { serverSignIn } from "@/lib/user-auth";
import type { SessionUser } from "@/lib/user-auth";

export type { SessionUser };

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
      const raw = window.localStorage.getItem(KEY);
      if (raw) setUser(JSON.parse(raw) as SessionUser);
    } catch {
      // ignore corrupt storage
    }
    setReady(true);
  }, []);

  const signIn = useCallback(async (username: string, password: string): Promise<SignInOutcome> => {
    try {
      const result = await serverSignIn({ data: { username, password } });
      if (!result.ok) return result;
      window.localStorage.setItem(KEY, JSON.stringify(result.user));
      setUser(result.user);
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[signIn] server function threw:", msg);
      return { ok: false, reason: "server_error", message: `Unexpected error: ${msg}` };
    }
  }, []);

  const signOut = useCallback(() => {
    window.localStorage.removeItem(KEY);
    window.localStorage.removeItem("tms.session"); // clear legacy key
    setUser(null);
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

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { serverSignIn } from "@/lib/user-auth";
import type { SessionUser } from "@/lib/user-auth";
import type { PowToken } from "@/lib/pow-captcha";
import { secureSession } from "@/lib/storage";
import { setLoggerUser } from "@/lib/log-actions";

export type { SessionUser };

// Session stored in sessionStorage (auto-cleared on window/tab close → auto logout)
const KEY = "tms.session.v2";

export type SignInOutcome =
  | { ok: true }
  | { ok: false; reason: "invalid_credentials" | "server_error" | "device_not_authorized" | "captcha_failed"; message: string };

type SessionValue = {
  ready: boolean;
  user: SessionUser | null;
  signIn: (
    username: string,
    password: string,
    powToken: PowToken,
    credentialId?: string,
  ) => Promise<SignInOutcome>;
  signOut: () => void;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = secureSession.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SessionUser;
        setUser(parsed);
        setLoggerUser(parsed);
      }
    } catch {
      // ignore corrupt storage
    }
    try {
      localStorage.removeItem("tms.session.v2");
      localStorage.removeItem("tms.session");
    } catch {
      // ignore
    }
    setReady(true);
  }, []);

  const signIn = useCallback(async (
    username: string,
    password: string,
    powToken: PowToken,
    credentialId?: string,
  ): Promise<SignInOutcome> => {
    try {
      const result = await serverSignIn({ data: { username, password, powToken, credentialId } });
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

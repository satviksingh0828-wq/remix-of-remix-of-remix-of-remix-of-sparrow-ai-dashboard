import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

const KEY = "tms.session";

// Single built-in operator account for this internal tool.
const OPERATOR_ID = "admin";
const OPERATOR_PASSWORD = "testplay";

type SessionValue = {
  ready: boolean;
  user: string | null;
  signIn: (id: string, password: string) => boolean;
  signOut: () => void;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUser(window.localStorage.getItem(KEY));
    setReady(true);
  }, []);

  const signIn = useCallback((id: string, password: string) => {
    if (id.trim().toLowerCase() !== OPERATOR_ID || password !== OPERATOR_PASSWORD) return false;
    window.localStorage.setItem(KEY, OPERATOR_ID);
    setUser(OPERATOR_ID);
    return true;
  }, []);

  const signOut = useCallback(() => {
    window.localStorage.removeItem(KEY);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ ready, user, signIn, signOut }), [ready, user, signIn, signOut]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}

import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { useSession } from "@/lib/session";
import { canAccessAccounts } from "@/lib/roles";

export function AccountsAccessGuard({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { ready, user } = useSession();

  useEffect(() => {
    if (ready && (!user || !canAccessAccounts(user.role))) {
      navigate({ to: "/home", replace: true });
    }
  }, [navigate, ready, user]);

  return (
    <RequireAuth>{ready && user && canAccessAccounts(user.role) ? children : null}</RequireAuth>
  );
}

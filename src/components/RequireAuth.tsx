import { useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useSession } from "@/lib/session";
import { Skeleton } from "@/components/ui/skeleton";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { ready, user } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (ready && !user) navigate({ to: "/", replace: true });
  }, [ready, user, navigate]);

  if (!ready || !user) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

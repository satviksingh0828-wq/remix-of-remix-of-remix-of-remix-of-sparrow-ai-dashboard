import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Bird } from "lucide-react";
import type { ReactNode } from "react";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";

export function AppShell({
  children,
  breadcrumb,
}: {
  children: ReactNode;
  breadcrumb?: ReactNode;
}) {
  const { signOut, user } = useSession();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-6">
          <Link to="/home" className="flex items-center gap-2.5">
            <span
              className="flex size-9 items-center justify-center rounded-xl text-primary-foreground"
              style={{ backgroundImage: "var(--gradient-brand)" }}
            >
              <Bird className="size-4.5" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold tracking-tight">
                Sparrow AI Solutions
              </span>
              <span className="block text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Project TMS
              </span>
            </span>
          </Link>
          <div className="ml-2 hidden md:block">{breadcrumb}</div>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              Signed in as <span className="font-medium text-foreground">{user}</span>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                signOut();
                navigate({ to: "/", replace: true });
              }}
            >
              <LogOut className="size-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}

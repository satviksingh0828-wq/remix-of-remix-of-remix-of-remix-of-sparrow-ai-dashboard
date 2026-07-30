import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, ShieldCheck, User } from "lucide-react";
import type { ReactNode } from "react";
import { useSession } from "@/lib/session";
import { useSparrowAI } from "@/lib/sparrow-context";
import { Button } from "@/components/ui/button";
import { SparrowAITrigger } from "@/components/SparrowAI";
import { cn } from "@/lib/utils";

export function AppShell({
  children,
  breadcrumb,
  headerEnd,
}: {
  children: ReactNode;
  breadcrumb?: ReactNode;
  /** Extra content rendered between the breadcrumb and the user area (e.g. sidebar toggle) */
  headerEnd?: ReactNode;
}) {
  const { signOut, user } = useSession();
  const navigate = useNavigate();
  const { open } = useSparrowAI();
  const isAdmin = user?.role === "admin";

  return (
    <div className={cn("min-h-screen bg-background transition-all duration-300", isAdmin && open ? "mr-[360px]" : "")}>
      <header className="sticky top-0 z-30 border-b border-border bg-card/85 backdrop-blur">
        <div className="mx-auto max-w-screen-xl flex h-16 items-center gap-3 px-4 sm:px-6">
          <Link to="/home" className="shrink-0">
            <img src="/garuda-logo.png" alt="Garuda Logistics Solution" className="h-10 w-auto" />
          </Link>
          {breadcrumb && <div className="ml-2 hidden md:block shrink-0">{breadcrumb}</div>}
          {headerEnd && <div className="ml-2 hidden lg:block">{headerEnd}</div>}
          <div className="ml-auto flex items-center gap-2 sm:gap-3 min-w-0">
            {user?.role === "admin" && <SparrowAITrigger />}
            <span className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex min-w-0">
              {user?.role === "admin" ? (
                <ShieldCheck className="size-3.5 text-primary shrink-0" />
              ) : (
                <User className="size-3.5 shrink-0" />
              )}
              <span className="font-medium text-foreground truncate max-w-[120px]">
                {user?.fullName ?? user?.username}
              </span>
              <span className="hidden md:inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide shrink-0">
                {user?.role === "admin" ? "Admin" : "User"}
              </span>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                signOut();
                navigate({ to: "/", replace: true });
              }}
              className="shrink-0"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-screen-xl px-4 sm:px-6 py-6 sm:py-8">{children}</main>
    </div>
  );
}

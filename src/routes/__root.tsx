import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useMemo, type ReactNode } from "react";
import { toast } from "sonner";
import { createIdbPersister } from "../lib/query-persist";
import { initSecurity } from "../lib/security";

import appCss from "../styles.css?url";
import { SessionProvider } from "../lib/session";
import { ThemeProvider } from "../lib/theme";
import { Toaster } from "../components/ui/sonner";
import { PasskeyGate } from "../components/PasskeyGate";
import { InactivityChallenge } from "../components/InactivityChallenge";
import { MobileBlock } from "../components/MobileBlock";
import { SparrowAIProvider } from "../lib/sparrow-context";
import { SparrowAIPanel } from "../components/SparrowAI";
import { useSparrowAI } from "../lib/sparrow-context";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  console.error("[AppError]", error?.message, error?.stack);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-xl text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        {error?.message && (
          <pre className="mt-4 rounded-lg bg-destructive/10 px-4 py-3 text-left text-xs text-destructive overflow-auto max-h-40 whitespace-pre-wrap break-all">
            {error.message}
          </pre>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "author", content: "Garuda Logistics Solution" },
      { property: "og:image", content: "/garuda-logo.png" },
      { name: "robots", content: "noindex, nofollow, noarchive, nosnippet, noimageindex" },
      { name: "googlebot", content: "noindex, nofollow" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "icon", href: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { rel: "icon", href: "/favicon-16.png", type: "image/png", sizes: "16x16" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
    ],
    scripts: [
      { src: "https://js.puter.com/v2/", async: true },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="sky">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function SecurityInit() {
  useEffect(() => {
    initSecurity();
  }, []);
  return null;
}

/** Listens for session-expired custom events dispatched by SessionProvider and
 *  shows an appropriate toast so the user knows why they were signed out. */
function SessionExpiredListener() {
  useEffect(() => {
    const handler = (e: Event) => {
      const reason = (e as CustomEvent<{ reason: string }>).detail?.reason;
      if (reason === "elsewhere") {
        toast.warning("You were signed out because your account was opened on another device.", {
          duration: 8000,
        });
      } else {
        toast.info("You were signed out due to inactivity.", { duration: 6000 });
      }
    };
    window.addEventListener("tms:session-expired", handler);
    return () => window.removeEventListener("tms:session-expired", handler);
  }, []);
  return null;
}

/** Renders the SPARROW AI panel as a fixed right-side copilot that persists across route changes */
function SparrowAIPanelMount() {
  const { open } = useSparrowAI();
  if (!open) return null;
  return (
    <div className="fixed right-0 top-0 z-50 h-screen w-[360px] shadow-[-4px_0_32px_rgba(0,0,0,0.12)]">
      <SparrowAIPanel />
    </div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const persister = useMemo(
    () => (typeof window === "undefined" ? null : createIdbPersister()),
    [],
  );

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: persister ?? {
          persistClient: async () => {},
          restoreClient: async () => undefined,
          removeClient: async () => {},
        },
        maxAge: 24 * 60 * 60 * 1000,
      }}
    >
      <SessionProvider>
        <ThemeProvider>
          <SparrowAIProvider>
            <SecurityInit />
            <SessionExpiredListener />
            {/* MobileBlock: desktop-only wall before anything else */}
            <MobileBlock>
            {/* PasskeyGate: device-level WebAuthn check before any page renders */}
            <PasskeyGate>
              <Outlet />
            </PasskeyGate>
            </MobileBlock>
            <InactivityChallenge />
            <Toaster position="top-right" />
            <SparrowAIPanelMount />
          </SparrowAIProvider>
        </ThemeProvider>
      </SessionProvider>
    </PersistQueryClientProvider>
  );
}

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
import { createIdbPersister } from "../lib/query-persist";
import { initSecurity } from "../lib/security";

import appCss from "../styles.css?url";
import { SessionProvider } from "../lib/session";
import { ThemeProvider } from "../lib/theme";
import { Toaster } from "../components/ui/sonner";
import { PasskeyGate } from "../components/PasskeyGate";
import { InactivityChallenge } from "../components/InactivityChallenge";
import { MobileBlock } from "../components/MobileBlock";

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
  void error;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
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
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
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
          <SecurityInit />
          {/* MobileBlock: desktop-only wall before anything else */}
          <MobileBlock>
          {/* PasskeyGate: device-level WebAuthn check before any page renders */}
          <PasskeyGate>
            <Outlet />
          </PasskeyGate>
          </MobileBlock>
          <InactivityChallenge />
          <Toaster position="top-right" />
        </ThemeProvider>
      </SessionProvider>
    </PersistQueryClientProvider>
  );
}

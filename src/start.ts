import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";

const mobileBrowserBlockMiddleware = createMiddleware().server(
  async ({ request, pathname, handlerType, next }) => {
    const userAgent = request.headers.get("user-agent") ?? "";
    const isMobileBrowser = /Android.*Mobile|iPhone|iPad|iPod|Mobile Safari/i.test(userAgent);
    const isApi = pathname.startsWith("/api/");
    if (handlerType === "router" && isMobileBrowser && !isApi) {
      return new Response(
        '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Use the Garuda mobile app</title></head><body style="font-family:system-ui;background:#f9f7f3;color:#3d0b1b;padding:48px 24px;text-align:center"><h1>Use the Garuda mobile app</h1><p>Mobile-browser access is unavailable. Please open the installed Garuda mobile app to continue.</p><p>Desktop browser access remains protected by the existing sign-in and Turnstile security check.</p></body></html>',
        {
          status: 403,
          headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
        },
      );
    }
    return next();
  },
);

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

// Note: attachSupabaseAuth is intentionally omitted.
// This app uses its own app_users table + localStorage sessions (not Supabase Auth).
// Adding the Supabase auth middleware globally caused login to break when
// VITE_SUPABASE_URL was not baked in at Vercel build time.
export const startInstance = createStart(() => ({
  functionMiddleware: [],
  requestMiddleware: [errorMiddleware, mobileBrowserBlockMiddleware, csrfMiddleware],
}));

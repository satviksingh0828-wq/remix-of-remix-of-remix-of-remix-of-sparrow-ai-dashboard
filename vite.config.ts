import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig({
  plugins: [
    // tanstackStart includes the TanStack Router plugin internally —
    // do NOT add TanStackRouterVite separately or plugins will duplicate.
    tanstackStart({
      server: { entry: "server" },
    }),
    react(),
    tailwindcss(),
    tsConfigPaths(),
  ],
  server: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true,
    strictPort: false,
  },
});

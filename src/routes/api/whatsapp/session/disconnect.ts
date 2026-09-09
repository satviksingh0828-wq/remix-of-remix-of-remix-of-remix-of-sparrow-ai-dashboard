import { createFileRoute } from "@tanstack/react-router";
import { proxyWhatsAppJson } from "@/lib/whatsapp.server";

export const Route = createFileRoute("/api/whatsapp/session/disconnect")({
  server: { handlers: { POST: ({ request }) => proxyWhatsAppJson(request, "/api/session/disconnect", "POST") } },
});


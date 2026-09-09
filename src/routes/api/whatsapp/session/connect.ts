import { createFileRoute } from "@tanstack/react-router";
import { proxyWhatsAppJson } from "@/lib/whatsapp.server";

export const Route = createFileRoute("/api/whatsapp/session/connect")({
  server: { handlers: { POST: ({ request }) => proxyWhatsAppJson(request, "/api/session/connect", "POST") } },
});


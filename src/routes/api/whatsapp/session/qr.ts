import { createFileRoute } from "@tanstack/react-router";
import { proxyWhatsAppJson } from "@/lib/whatsapp.server";

export const Route = createFileRoute("/api/whatsapp/session/qr")({
  server: { handlers: { GET: ({ request }) => proxyWhatsAppJson(request, "/api/session/qr") } },
});


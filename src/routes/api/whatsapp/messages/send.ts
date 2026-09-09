import { createFileRoute } from "@tanstack/react-router";
import { proxyWhatsAppJson } from "@/lib/whatsapp.server";

export const Route = createFileRoute("/api/whatsapp/messages/send")({
  server: { handlers: { POST: ({ request }) => proxyWhatsAppJson(request, "/api/messages/send", "POST") } },
});


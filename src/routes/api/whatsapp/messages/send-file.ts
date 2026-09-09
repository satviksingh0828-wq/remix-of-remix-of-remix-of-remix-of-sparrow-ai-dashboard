import { createFileRoute } from "@tanstack/react-router";
import { proxyWhatsAppMultipart } from "@/lib/whatsapp.server";

export const Route = createFileRoute("/api/whatsapp/messages/send-file")({
  server: { handlers: { POST: ({ request }) => proxyWhatsAppMultipart(request, "/api/messages/send-file") } },
});


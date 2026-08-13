import { createFileRoute } from "@tanstack/react-router";
import { syncScheduledNotificationEmails } from "@/lib/notifications";

export const Route = createFileRoute("/api/notify-admin")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env.CRON_SECRET;
        if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        try {
          const result = await syncScheduledNotificationEmails();
          return Response.json({ ok: true, ...result });
        } catch (error) {
          console.error("[notify-admin] Scheduled notification email failed:", error);
          return Response.json(
            { error: error instanceof Error ? error.message : "Notification email failed" },
            { status: 500 },
          );
        }
      },
    },
  },
});

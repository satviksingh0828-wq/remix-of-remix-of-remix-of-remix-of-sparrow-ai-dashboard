import { createFileRoute } from "@tanstack/react-router";

import { limitToPermittedBranches, mobileJson, requireMobileUser } from "@/lib/mobile-api";

export const Route = createFileRoute("/api/mobile/operations")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await requireMobileUser(request);
        if (user instanceof Response) return user;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const scoped = <T extends { in: (column: string, values: string[]) => T }>(query: T) =>
          limitToPermittedBranches(query, user);
        const [tripsResult, closedResult, incomesResult, expensesResult] = await Promise.all([
          scoped(
            supabaseAdmin
              .from("trips")
              .select(
                "id, trip_code, ownership, branch_id, start_date, start_time, end_date, end_time, vehicle_id, driver_id, transporter_id, created_at",
              )
              .order("created_at", { ascending: false })
              .limit(100),
          ),
          scoped(
            supabaseAdmin
              .from("closed_trips")
              .select(
                "id, trip_code, branch_id, branch_name, start_date, end_date, total_income, total_expense, net_income, closed_at",
              )
              .order("closed_at", { ascending: false })
              .limit(100),
          ),
          scoped(
            supabaseAdmin
              .from("incomes")
              .select(
                "id, income_name, amount, note, entry_date, branch_id, is_received, received_date, created_at",
              )
              .order("created_at", { ascending: false })
              .limit(100),
          ),
          scoped(
            supabaseAdmin
              .from("expenditures")
              .select(
                "id, expenditure_name, amount, note, entry_date, branch_id, is_paid, paid_date, created_at",
              )
              .order("created_at", { ascending: false })
              .limit(100),
          ),
        ]);
        const issue = [tripsResult, closedResult, incomesResult, expensesResult].find(
          (result) => result.error,
        )?.error;
        if (issue) return Response.json({ error: issue.message }, { status: 500 });
        return mobileJson({
          user,
          trips: tripsResult.data ?? [],
          closedTrips: closedResult.data ?? [],
          incomes: incomesResult.data ?? [],
          expenses: expensesResult.data ?? [],
        });
      },
      POST: async ({ request }) => {
        const user = await requireMobileUser(request);
        if (user instanceof Response) return user;
        if (user.role === "viewer")
          return Response.json(
            { error: "Your role cannot update payment status." },
            { status: 403 },
          );
        const body = (await request.json().catch(() => null)) as {
          type?: "income" | "expense";
          id?: string;
          paid?: boolean;
        } | null;
        if (!body?.id || !body.type || typeof body.paid !== "boolean") {
          return Response.json(
            { error: "A record, record type, and payment state are required." },
            { status: 400 },
          );
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const table = body.type === "income" ? "incomes" : "expenditures";
        const paidColumn = body.type === "income" ? "is_received" : "is_paid";
        const dateColumn = body.type === "income" ? "received_date" : "paid_date";
        let lookup = supabaseAdmin.from(table).select("id, branch_id").eq("id", body.id);
        if (user.role !== "admin") {
          lookup = lookup.in(
            "branch_id",
            user.branchIds.length ? user.branchIds : ["00000000-0000-0000-0000-000000000000"],
          );
        }
        const { data: record, error: lookupError } = await lookup.maybeSingle();
        if (lookupError || !record)
          return Response.json(
            { error: "The record is unavailable for your branches." },
            { status: 404 },
          );
        const date = body.paid ? new Date().toISOString().slice(0, 10) : "";
        const { error } = await supabaseAdmin
          .from(table)
          .update({ [paidColumn]: body.paid, [dateColumn]: date })
          .eq("id", record.id);
        if (error) return Response.json({ error: error.message }, { status: 500 });
        return mobileJson({ ok: true, id: record.id, paid: body.paid });
      },
    },
  },
});

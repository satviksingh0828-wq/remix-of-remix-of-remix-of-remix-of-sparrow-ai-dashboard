import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { verifyAppToken } from "@/lib/user-auth";
import { adminAlertEmails, emailTemplate, sendResendEmail } from "@/lib/email";
import type { AppRole } from "@/lib/roles";

export type MisScheduleType = "daily" | "weekly" | "day_of_month" | "twice_monthly";
export type MisActivity = {
  id: string;
  activity_name: string;
  schedule_type: MisScheduleType;
  schedule_value: number | null;
  schedule_value_2: number | null;
  sort_order: number;
};
export type MisEntry = { activity_id: string; due_date: string; completed: boolean; note: string };
export type MisForm = {
  id: string;
  branch_id: string;
  branch_name: string;
  mis_month: string;
  status: "draft" | "submitted";
  submitted_at: string | null;
  activities: MisActivity[];
  entries: MisEntry[];
};
export type MisReportRow = {
  id: string;
  branch_id: string;
  branch_name: string;
  mis_month: string;
  status: "draft" | "submitted";
  due: number;
  done: number;
  missed: number;
  compliance: number;
  submitted_at: string | null;
  snapshot: { branch_name?: string; activities: MisActivity[]; entries: MisEntry[] } | null;
};

const tokenSchema = z.string().min(20);

async function caller(token: string) {
  const parsed = await verifyAppToken(token);
  if (!parsed) throw new Error("Your session has expired. Please sign in again.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabaseAdmin as any;
  const { data: user, error } = await db
    .from("app_users")
    .select("id,role,is_active")
    .eq("id", parsed.uid)
    .maybeSingle();
  if (error || !user || !user.is_active) throw new Error("Unauthorized session.");
  const { data: session, error: sessionError } = await db
    .from("user_sessions")
    .select("session_token")
    .eq("user_id", parsed.uid)
    .maybeSingle();
  if (sessionError || !session || session.session_token !== token)
    throw new Error("This session is no longer active.");
  const { data: access } = await db
    .from("user_branch_access")
    .select("branch_id")
    .eq("user_id", parsed.uid);
  return {
    db,
    userId: parsed.uid,
    role: user.role as AppRole,
    branchIds: (access ?? []).map((x: { branch_id: string }) => x.branch_id),
  };
}

function datesForActivity(activity: MisActivity, month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const result: string[] = [];
  for (let day = 1; day <= days; day += 1) {
    const date = new Date(Date.UTC(year, monthNumber - 1, day));
    const isSunday = date.getUTCDay() === 0;
    if (isSunday && (activity.schedule_type === "daily" || activity.schedule_type === "weekly")) {
      continue;
    }
    const due =
      activity.schedule_type === "daily" ||
      (activity.schedule_type === "weekly" && date.getUTCDay() === activity.schedule_value) ||
      (activity.schedule_type === "day_of_month" && day === activity.schedule_value) ||
      (activity.schedule_type === "twice_monthly" &&
        (day === activity.schedule_value || day === activity.schedule_value_2));
    if (due) result.push(`${month}-${String(day).padStart(2, "0")}`);
  }
  return result;
}

function calculate(entries: MisEntry[]) {
  const today = new Date().toISOString().slice(0, 10);
  const due = entries.length;
  const done = entries.filter((entry) => entry.completed).length;
  const missed = entries.filter((entry) => !entry.completed && entry.due_date < today).length;
  return { due, done, missed, compliance: due ? Math.round((done / due) * 1000) / 10 : 100 };
}

export const serverLoadMisForm = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: tokenSchema,
      branchId: z.string().uuid(),
      month: z.string().regex(/^\d{4}-\d{2}$/),
    }),
  )
  .handler(async ({ data }): Promise<MisForm | null> => {
    const auth = await caller(data.token);
    if (auth.role === "basic" && !auth.branchIds.includes(data.branchId))
      throw new Error("You do not have access to this branch.");
    const { data: branch } = await auth.db
      .from("branches")
      .select("branch_name")
      .eq("id", data.branchId)
      .maybeSingle();
    const { data: instance } = await auth.db
      .from("monthly_mis_instances")
      .select("*")
      .eq("branch_id", data.branchId)
      .eq("mis_month", `${data.month}-01`)
      .maybeSingle();
    if (instance?.status === "submitted") {
      const snap = instance.snapshot as { activities: MisActivity[]; entries: MisEntry[] };
      return {
        id: instance.id,
        branch_id: data.branchId,
        branch_name: branch?.branch_name ?? "",
        mis_month: data.month,
        status: "submitted",
        submitted_at: instance.submitted_at,
        activities: snap.activities,
        entries: snap.entries,
      };
    }
    const { data: activities } = await auth.db
      .from("monthly_mis_activities")
      .select("*")
      .eq("branch_id", data.branchId)
      .eq("is_active", true)
      .order("sort_order");
    if (!activities?.length && !instance) return null;
    const typed = (activities ?? []) as MisActivity[];
    const existingEntries = (instance?.draft_data?.entries ?? []) as MisEntry[];
    const existing = new Map(
      existingEntries.map((entry) => [`${entry.activity_id}:${entry.due_date}`, entry]),
    );
    const entries = typed.flatMap((activity) =>
      datesForActivity(activity, data.month).map(
        (due_date) =>
          existing.get(`${activity.id}:${due_date}`) ?? {
            activity_id: activity.id,
            due_date,
            completed: false,
            note: "",
          },
      ),
    );
    return {
      id: instance?.id ?? "",
      branch_id: data.branchId,
      branch_name: branch?.branch_name ?? "",
      mis_month: data.month,
      status: "draft",
      submitted_at: null,
      activities: typed,
      entries,
    };
  });

const entrySchema = z.object({
  activity_id: z.string().uuid(),
  due_date: z.string(),
  completed: z.boolean(),
  note: z.string().max(500),
});
export const serverSaveMisForm = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: tokenSchema,
      branchId: z.string().uuid(),
      month: z.string().regex(/^\d{4}-\d{2}$/),
      entries: z.array(entrySchema),
      submit: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    const auth = await caller(data.token);
    if (auth.role === "viewer")
      throw new Error("Viewer accounts are read-only.");
    if (auth.role === "basic" && !auth.branchIds.includes(data.branchId))
      throw new Error("You do not have access to this branch.");
    const form = await serverLoadMisForm({
      data: { token: data.token, branchId: data.branchId, month: data.month },
    });
    if (!form) throw new Error("No Monthly MIS form is configured for this branch.");
    if (form.status === "submitted")
      throw new Error("This Monthly MIS was already submitted and is locked.");
    const allowed = new Set(form.entries.map((e) => `${e.activity_id}:${e.due_date}`));
    if (data.entries.some((e) => !allowed.has(`${e.activity_id}:${e.due_date}`)))
      throw new Error("The form contains an invalid activity or date.");
    const now = new Date().toISOString();
    const metrics = calculate(data.entries);
    const payload = {
      branch_id: data.branchId,
      mis_month: `${data.month}-01`,
      status: data.submit ? "submitted" : "draft",
      draft_data: data.submit ? null : { entries: data.entries },
      updated_by: auth.userId,
      updated_at: now,
      ...(data.submit
        ? {
            submitted_at: now,
            submitted_by: auth.userId,
            snapshot: {
              version: 1,
              branch_id: data.branchId,
              branch_name: form.branch_name,
              mis_month: data.month,
              activities: form.activities,
              entries: data.entries,
              metrics,
              submitted_at: now,
            },
          }
        : {}),
    };
    const { data: saved, error } = await auth.db
      .from("monthly_mis_instances")
      .upsert(payload, { onConflict: "branch_id,mis_month" })
      .select("id")
      .single();
    if (error) throw new Error(`Unable to save Monthly MIS: ${error.message}`);
    if (data.submit) {
      await auth.db.from("notifications").upsert(
        {
          kind: "monthly_mis",
          ref_id: `monthly-mis-${saved.id}`,
          title: "Monthly MIS submitted",
          detail: `${form.branch_name} submitted Monthly MIS for ${data.month}.`,
          days_left: null,
          updated_at: now,
        },
        { onConflict: "kind,ref_id" },
      );
      const { data: branch } = await auth.db
        .from("branches")
        .select("branch_email,email_address,manager_email")
        .eq("id", data.branchId)
        .maybeSingle();
      const adminEmails = adminAlertEmails();
      const depotEmail = branch?.branch_email || branch?.email_address || branch?.manager_email;
      if (process.env.RESEND_API_KEY && (depotEmail || adminEmails.length)) {
        try {
          await sendResendEmail({
            to: [...adminEmails, ...(depotEmail ? [depotEmail] : [])],
            subject: `Monthly MIS submitted — ${form.branch_name} — ${data.month}`,
            html: emailTemplate({ title: "Monthly MIS submitted", eyebrow: "Operations report",
              intro: `<strong>${form.branch_name}</strong> submitted its Monthly MIS for <strong>${data.month}</strong>.`,
              content: `<table style="width:100%;border-collapse:collapse"><tr>${[["Due",metrics.due],["Done",metrics.done],["Missed",metrics.missed],["Compliance",`${metrics.compliance}%`]].map(([k,v]) => `<td style="padding:14px 8px;text-align:center;background:#f8fafc;border:1px solid #e2e8f0"><strong style="font-size:18px">${v}</strong><br><span style="font-size:11px;color:#64748b">${k}</span></td>`).join("")}</tr></table>` }),
          });
          // The MIS email above already reached all admins, so do not send a
          // duplicate when the notification bell performs its next sync.
          await auth.db.from("notifications").update({ emailed_at: new Date().toISOString() })
            .eq("kind", "monthly_mis").eq("ref_id", `monthly-mis-${saved.id}`);
        } catch (emailError) { console.error("[Monthly MIS] Email failed:", emailError); }
      }
    }
    return { ok: true, submitted: data.submit, metrics };
  });

export const serverSaveMisActivities = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: tokenSchema,
      branchId: z.string().uuid(),
      activities: z.array(
        z.object({
          id: z.string().uuid().optional(),
          activity_name: z.string().trim().min(1).max(200),
          schedule_type: z.enum(["daily", "weekly", "day_of_month", "twice_monthly"]),
          schedule_value: z.number().int().min(0).max(31).nullable(),
          schedule_value_2: z.number().int().min(1).max(31).nullable(),
        }),
      ),
    }),
  )
  .handler(async ({ data }) => {
    const auth = await caller(data.token);
    if (auth.role !== "admin" && auth.role !== "semi_admin") throw new Error("Admin access required.");
    const { data: current } = await auth.db
      .from("monthly_mis_activities")
      .select("id")
      .eq("branch_id", data.branchId)
      .eq("is_active", true);
    const keep = new Set(data.activities.flatMap((a) => (a.id ? [a.id] : [])));
    const remove = (current ?? [])
      .filter((x: { id: string }) => !keep.has(x.id))
      .map((x: { id: string }) => x.id);
    if (remove.length)
      await auth.db
        .from("monthly_mis_activities")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .in("id", remove);
    for (let index = 0; index < data.activities.length; index += 1) {
      const activity = data.activities[index];
      if (
        activity.schedule_type === "twice_monthly" &&
        activity.schedule_value === activity.schedule_value_2
      )
        throw new Error("Twice-a-month activities require two different dates.");
      const row = {
        branch_id: data.branchId,
        activity_name: activity.activity_name,
        schedule_type: activity.schedule_type,
        schedule_value: activity.schedule_type === "daily" ? null : activity.schedule_value,
        schedule_value_2:
          activity.schedule_type === "twice_monthly" ? activity.schedule_value_2 : null,
        sort_order: index,
        is_active: true,
        updated_by: auth.userId,
      };
      const query = activity.id
        ? auth.db
            .from("monthly_mis_activities")
            .update(row)
            .eq("id", activity.id)
            .eq("branch_id", data.branchId)
        : auth.db.from("monthly_mis_activities").insert(row);
      const { error } = await query;
      if (error) throw new Error(`Unable to save activity: ${error.message}`);
    }
    return { ok: true };
  });

export const serverReopenMisForm = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: tokenSchema,
      branchId: z.string().uuid(),
      month: z.string().regex(/^\d{4}-\d{2}$/),
    }),
  )
  .handler(async ({ data }) => {
    const auth = await caller(data.token);
    if (auth.role !== "admin" && auth.role !== "semi_admin") throw new Error("Admin access required.");
    const { data: instance } = await auth.db
      .from("monthly_mis_instances")
      .select("id,status,snapshot")
      .eq("branch_id", data.branchId)
      .eq("mis_month", `${data.month}-01`)
      .maybeSingle();
    if (!instance || instance.status !== "submitted")
      throw new Error("Only a submitted Monthly MIS can be reopened.");
    const snapshot = instance.snapshot as { entries?: MisEntry[] } | null;
    const { error } = await auth.db
      .from("monthly_mis_instances")
      .update({
        status: "draft",
        draft_data: { entries: snapshot?.entries ?? [] },
        snapshot: null,
        submitted_at: null,
        submitted_by: null,
        updated_by: auth.userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", instance.id);
    if (error) throw new Error(`Unable to reopen Monthly MIS: ${error.message}`);
    return { ok: true };
  });

export const serverLoadMisReports = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: tokenSchema,
      branchId: z.string().optional(),
      month: z.string().regex(/^\d{4}-\d{2}$/),
    }),
  )
  .handler(async ({ data }): Promise<MisReportRow[]> => {
    const auth = await caller(data.token);
    if (auth.role === "basic") throw new Error("Reports require manager or admin access.");
    let query = auth.db
      .from("monthly_mis_instances")
      .select(
        "id,branch_id,mis_month,status,draft_data,snapshot,submitted_at,branches(branch_name)",
      )
      .eq("mis_month", `${data.month}-01`);
    if (data.branchId && data.branchId !== "all") query = query.eq("branch_id", data.branchId);
    const { data: rows, error } = await query.order("submitted_at", { ascending: false });
    if (error) throw new Error(`Unable to load reports: ${error.message}`);
    return (rows ?? []).map((row: Record<string, unknown>) => {
      const snapshot = row.snapshot as {
        branch_name?: string;
        activities: MisActivity[];
        entries: MisEntry[];
      } | null;
      const draft = row.draft_data as { entries?: MisEntry[] } | null;
      const branch = row.branches as { branch_name?: string } | null;
      const entries = snapshot?.entries ?? draft?.entries ?? [];
      return {
        id: row.id,
        branch_id: row.branch_id,
        branch_name: branch?.branch_name ?? snapshot?.branch_name ?? "",
        mis_month: String(row.mis_month).slice(0, 7),
        status: row.status as "draft" | "submitted",
        ...calculate(entries),
        submitted_at: row.submitted_at as string | null,
        snapshot,
      };
    });
  });

import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { ReportMasterPage } from "@/components/report-master/ReportMasterPage";

export const Route = createFileRoute("/report-master")({
  head: () => ({ meta: [{ title: "Report Master — Garuda Logistics Solutions" }] }),
  component: () => <RequireAuth><ReportMasterPage /></RequireAuth>,
});

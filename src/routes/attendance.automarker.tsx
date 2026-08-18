import { createFileRoute } from "@tanstack/react-router";
import { AttendanceAutomarker } from "@/components/hr/attendance-automarker";

export const Route = createFileRoute("/attendance/automarker")({
  component: AttendanceAutomarker,
});

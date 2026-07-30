import { createFileRoute } from "@tanstack/react-router";
import { TripImport } from "@/components/import/TripImport";

export const Route = createFileRoute("/import-trips")({
  component: TripImport,
});

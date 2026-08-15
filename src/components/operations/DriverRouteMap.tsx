import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

import type { DriverRoutePoint } from "@/lib/driver-location-trace";

export function DriverRouteMap({
  points,
  tripCode,
}: {
  points: DriverRoutePoint[];
  tripCode: string;
}) {
  const mapElement = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mapElement.current || points.length === 0) return;
    let cancelled = false;
    let map: import("leaflet").Map | null = null;

    void (async () => {
      const L = await import("leaflet");
      if (cancelled || !mapElement.current) return;
      const latLngs = points.map((point) => L.latLng(point.latitude, point.longitude));
      map = L.map(mapElement.current, { scrollWheelZoom: false, zoomControl: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      if (latLngs.length > 1) {
        const trace = L.polyline(latLngs, {
          color: "#7c3aed",
          weight: 4,
          opacity: 0.86,
          lineJoin: "round",
        }).addTo(map);
        map.fitBounds(trace.getBounds(), { padding: [28, 28], maxZoom: 16 });
      } else {
        map.setView(latLngs[0], 16);
      }

      L.circleMarker(latLngs[0], {
        radius: 7,
        color: "#ea580c",
        fillColor: "#fb923c",
        fillOpacity: 1,
        weight: 2,
      })
        .bindTooltip("Route start", { direction: "top" })
        .addTo(map);
      L.circleMarker(latLngs.at(-1)!, {
        radius: 8,
        color: "#0369a1",
        fillColor: "#38bdf8",
        fillOpacity: 1,
        weight: 2,
      })
        .bindTooltip("Latest location", { direction: "top" })
        .addTo(map);
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [points]);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-muted/30 p-1.5 shadow-sm sm:p-2">
      <div
        ref={mapElement}
        aria-label={`Recorded driver route trace for trip ${tripCode}`}
        className="h-52 w-full rounded-lg bg-muted sm:h-[min(52dvh,420px)] sm:min-h-72"
      />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-2 pb-1 pt-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <i className="size-2.5 rounded-full bg-orange-400 ring-2 ring-orange-600" /> Route start
        </span>
        <span className="flex items-center gap-1.5">
          <i className="size-2.5 rounded-full bg-sky-400 ring-2 ring-sky-700" /> Latest location
        </span>
        {points.length > 1 ? (
          <span className="flex items-center gap-1.5">
            <i className="h-0.5 w-4 bg-violet-600" /> Recorded route trace
          </span>
        ) : null}
      </div>
    </div>
  );
}

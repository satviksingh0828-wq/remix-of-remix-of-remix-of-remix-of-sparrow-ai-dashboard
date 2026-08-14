import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Loader2, Map, MapPin, QrCode, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TripRow } from "./TripForm";

type QrPayload = {
  token: string;
  trip_code: string;
  expires_at?: string | null;
  stable?: boolean;
};

type LiveLocation = {
  trip_code?: string;
  latitude?: number;
  longitude?: number;
  accuracy_m?: number | null;
  recorded_at?: string;
  last_seen_at?: string;
  active?: boolean;
} | null;

function isOwnTrip(trip: TripRow) {
  return trip.ownership === "own" && !(trip.end_date ?? "").trim() && Boolean(trip.id);
}

function formatLocationTime(value?: string) {
  if (!value) return "No location received yet";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function supabaseErrorMessage(error: unknown, fallback: string) {
  const value = error as {
    message?: string;
    details?: string;
    hint?: string;
    code?: string;
  } | null;
  const message = [value?.message, value?.details, value?.hint].filter(Boolean).join(" — ");
  if (!message) return fallback;
  if (value?.code === "42883" || /does not exist|schema cache/i.test(message)) {
    return "Driver App SQL is not installed in Supabase. Apply 20260814000000_driver_app_links.sql, then retry.";
  }
  return message;
}

export function DriverTripActions({ trip }: { trip: TripRow }) {
  const [qrOpen, setQrOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [qr, setQr] = useState<QrPayload | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [location, setLocation] = useState<LiveLocation>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);

  const ownTrip = isOwnTrip(trip);

  useEffect(() => {
    if (!qr) {
      setQrImage(null);
      return;
    }
    const qrValue = JSON.stringify({
      type: "garuda-driver-trip",
      token: qr.token,
      tripCode: qr.trip_code,
    });
    QRCode.toDataURL(qrValue, { width: 320, margin: 2, errorCorrectionLevel: "M" })
      .then(setQrImage)
      .catch(() => toast.error("Could not render the trip QR code"));
  }, [qr]);

  async function issueQr() {
    if (!ownTrip || !trip.id) return;
    setLoadingQr(true);
    try {
      const { data, error } = await supabase.rpc(
        "issue_driver_trip_qr" as never,
        {
          p_trip_id: trip.id,
        } as never,
      );
      if (error) throw error;
      setQr(data as unknown as QrPayload);
      setQrOpen(true);
    } catch (error) {
      toast.error(supabaseErrorMessage(error, "Could not create a trip QR code"));
    } finally {
      setLoadingQr(false);
    }
  }

  async function loadLocation() {
    if (!ownTrip || !trip.id) return;
    setLoadingLocation(true);
    try {
      const { data, error } = await supabase.rpc(
        "get_trip_live_location" as never,
        {
          p_trip_id: trip.id,
        } as never,
      );
      if (error) throw error;
      setLocation(data as unknown as LiveLocation);
    } catch (error) {
      toast.error(supabaseErrorMessage(error, "Could not load live location"));
    } finally {
      setLoadingLocation(false);
    }
  }

  function openLocation() {
    setLocationOpen(true);
    void loadLocation();
  }

  if (!ownTrip) return null;

  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void issueQr()}
          disabled={loadingQr}
          title="Show Trip QR Code"
          aria-label={`Show Trip QR Code for ${trip.trip_code}`}
        >
          {loadingQr ? <Loader2 className="size-4 animate-spin" /> : <QrCode className="size-4" />}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={openLocation}
          title="View live driver location"
          aria-label={`View live driver location for ${trip.trip_code}`}
        >
          <MapPin className="size-4" />
        </Button>
      </div>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="size-5 text-primary" />
              Trip QR Code
            </DialogTitle>
            <DialogDescription>
              Scan this permanent Trip QR Code. It remains the same for this own-vehicle trip.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            {qrImage ? (
              <img
                src={qrImage}
                alt={`Trip QR Code for trip ${trip.trip_code}`}
                className="size-72 rounded-xl border border-border p-2"
              />
            ) : (
              <div className="flex size-72 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                Preparing QR code…
              </div>
            )}
            <div className="w-full rounded-xl bg-muted/50 p-3 text-center">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Trip code</p>
              <p className="mt-1 text-lg font-semibold tracking-tight">{trip.trip_code}</p>
              <p className="mt-1 text-xs text-muted-foreground">Permanent trip QR code</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={locationOpen} onOpenChange={setLocationOpen}>
        <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100dvw-1rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-h-[calc(100dvh-2rem)] sm:w-full">
          <DialogHeader className="shrink-0 px-5 pb-3 pt-6 pr-12 sm:px-7 sm:pt-7">
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="size-5 text-primary" />
              Live driver location
            </DialogTitle>
            <DialogDescription>
              Own-vehicle trip {trip.trip_code}. The map shows the latest location received from the linked device.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-5 sm:space-y-5 sm:px-7 sm:pb-7">
            {loadingLocation ? (
              <div className="flex min-h-52 items-center justify-center gap-2 rounded-2xl bg-muted/50 p-8 text-sm text-muted-foreground sm:min-h-72">
                <Loader2 className="size-4 animate-spin" /> Loading latest location…
              </div>
            ) : location?.latitude != null && location.longitude != null ? (
              <>
                <div className="overflow-hidden rounded-2xl border border-border bg-muted/30 p-1.5 shadow-sm sm:p-2">
                  <iframe
                    title={`Live location map for trip ${trip.trip_code}`}
                    className="h-52 w-full rounded-xl border-0 bg-muted sm:h-[min(52dvh,420px)] sm:min-h-72"
                    loading="lazy"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${location.longitude - 0.01}%2C${location.latitude - 0.01}%2C${location.longitude + 0.01}%2C${location.latitude + 0.01}&layer=mapnik&marker=${location.latitude}%2C${location.longitude}`}
                  />
                  <a
                    className="mt-1.5 flex items-center justify-center gap-1 rounded-xl px-3 py-2.5 text-xs font-medium text-primary hover:bg-primary/5 hover:underline"
                    href={`https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=16/${location.latitude}/${location.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Map className="size-3.5" /> Open full map
                  </a>
                </div>
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-stretch">
                  <div className="rounded-2xl border border-border bg-muted/30 p-4 text-sm sm:p-5">
                    <p className="font-medium">
                      {location.active ? "Tracking active" : "Tracking ended"}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      Last GPS update: {formatLocationTime(location.recorded_at)}
                    </p>
                    {location.accuracy_m != null ? (
                      <p className="text-muted-foreground">
                        Accuracy: ±{Math.round(location.accuracy_m)} m
                      </p>
                    ) : null}
                    <p className="mt-3 break-all font-mono text-xs">
                      {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </p>
                  </div>
                  <a
                    className="flex min-h-12 items-center justify-center rounded-xl bg-primary px-4 py-3 text-center text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 sm:w-44"
                    href={`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open in Google Maps
                  </a>
                </div>
              </>
            ) : (
              <div className="flex min-h-52 items-center justify-center rounded-2xl bg-muted/50 p-8 text-center text-sm text-muted-foreground sm:min-h-72">
                No live location has been received for this trip yet.
              </div>
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => void loadLocation()}
              disabled={loadingLocation}
            >
              <RefreshCw className="size-4" /> Refresh location
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

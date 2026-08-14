import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Loader2, MapPin, QrCode, RefreshCw, Smartphone } from "lucide-react";
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
  expires_at: string;
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
  return trip.ownership === "own" && Boolean(trip.id);
}

function formatLocationTime(value?: string) {
  if (!value) return "No location received yet";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
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
          p_ttl_minutes: 30,
        } as never,
      );
      if (error) throw error;
      setQr(data as unknown as QrPayload);
      setQrOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create a trip QR code");
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
      toast.error(error instanceof Error ? error.message : "Could not load live location");
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
          title="Show Driver’s App QR code"
          aria-label={`Show Driver’s App QR code for ${trip.trip_code}`}
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
              <Smartphone className="size-5 text-primary" />
              Driver’s App trip link
            </DialogTitle>
            <DialogDescription>
              Scan this code from the Driver’s App. It is valid for 30 minutes and can link only
              this own-vehicle trip.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            {qrImage ? (
              <img
                src={qrImage}
                alt={`Driver’s App QR code for trip ${trip.trip_code}`}
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
              {qr?.expires_at ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Expires {formatLocationTime(qr.expires_at)}
                </p>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={locationOpen} onOpenChange={setLocationOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="size-5 text-primary" />
              Live driver location
            </DialogTitle>
            <DialogDescription>
              Own-vehicle trip {trip.trip_code}. The location is supplied by the linked Driver’s App
              device.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {loadingLocation ? (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-muted/50 p-8 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Loading latest location…
              </div>
            ) : location?.latitude != null && location.longitude != null ? (
              <>
                <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
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
                  <p className="mt-3 font-mono text-xs">
                    {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  </p>
                </div>
                <a
                  className="block rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                  href={`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open location in Google Maps
                </a>
              </>
            ) : (
              <div className="rounded-xl bg-muted/50 p-8 text-center text-sm text-muted-foreground">
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

import { useEffect, useId, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

type FabricaConfig = {
  supabaseUrl: string;
  supabaseKey: string;
  title: string;
  theme: "light" | "dark";
  tables: Array<{
    name: string;
    use: string;
    columns: Array<{ name: string; type: "string" | "number" | "date"; use: string }>;
  }>;
};

declare global {
  interface Window {
    OrcaFabrica?: {
      mount: (selector: string, config: FabricaConfig) => void;
      unmount: (selector: string) => void;
    };
  }
}

const DARK_THEMES = new Set(["neon", "midnight", "forest", "storm"]);

function appTheme(): "light" | "dark" {
  return DARK_THEMES.has(document.documentElement.dataset.theme ?? "") ? "dark" : "light";
}

function loadBundle() {
  if (window.OrcaFabrica) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-orca-fabrica="true"]');
    const script = existing ?? document.createElement("script");
    const loaded = () =>
      window.OrcaFabrica
        ? resolve()
        : reject(
            new Error("The Orca Fabrica bundle loaded but did not expose OrcaFabrica.mount()."),
          );
    script.addEventListener("load", loaded, { once: true });
    script.addEventListener(
      "error",
      () =>
        reject(
          new Error("Orca Fabrica is not installed. Copy orca-fabrica.js into the public folder."),
        ),
      { once: true },
    );
    if (!existing) {
      script.src = "/orca-fabrica.js";
      script.async = true;
      script.dataset.orcaFabrica = "true";
      document.head.appendChild(script);
    }
  });
}

export function OrcaFabricaPanel() {
  const reactId = useId();
  const elementId = `orca-fabrica-${reactId.replaceAll(":", "")}`;
  const selector = `#${elementId}`;
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let mounted = false;
    let observer: MutationObserver | undefined;

    const mount = () => {
      if (!active || !window.OrcaFabrica) return;
      if (mounted) window.OrcaFabrica.unmount(selector);
      window.OrcaFabrica.mount(selector, {
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
        supabaseKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        title: "Garuda AI Analytics",
        theme: appTheme(),
        tables: [
          {
            name: "closed_trips",
            use: "One row is a completed logistics trip with its final financial totals and branch assignment.",
            columns: [
              {
                name: "trip_code",
                type: "string",
                use: "Unique business code of the completed trip.",
              },
              {
                name: "branch_name",
                type: "string",
                use: "Depot or branch responsible for the trip.",
              },
              {
                name: "closed_at",
                type: "date",
                use: "Date and time when the trip was finalized.",
              },
              {
                name: "total_income",
                type: "number",
                use: "Total income earned by the trip in INR.",
              },
              {
                name: "total_expense",
                type: "number",
                use: "Total expense incurred by the trip in INR.",
              },
              {
                name: "net_income",
                type: "number",
                use: "Trip profit or loss in INR after expenses.",
              },
            ],
          },
          {
            name: "branches",
            use: "One row is a company depot or operating branch.",
            columns: [
              { name: "branch_name", type: "string", use: "Display name of the depot or branch." },
              {
                name: "branch_type",
                type: "string",
                use: "Operational classification of the branch.",
              },
              { name: "city", type: "string", use: "City in which the branch operates." },
              { name: "state", type: "string", use: "State in which the branch operates." },
            ],
          },
        ],
      });
      mounted = true;
      setStatus("ready");
    };

    loadBundle()
      .then(() => {
        if (!active) return;
        mount();
        observer = new MutationObserver(mount);
        observer.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["data-theme"],
        });
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : String(reason));
        setStatus("error");
      });

    return () => {
      active = false;
      observer?.disconnect();
      if (mounted) window.OrcaFabrica?.unmount(selector);
    };
  }, [selector]);

  return (
    <section className="relative min-h-[650px] overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {status === "loading" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading AI analytics…
          </div>
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-card p-6">
          <div className="max-w-lg rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-center">
            <AlertTriangle className="mx-auto size-7 text-amber-600" />
            <h2 className="mt-3 font-semibold">AI Analytics bundle required</h2>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <p className="mt-3 text-xs text-muted-foreground">
              Expected file:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5">public/orca-fabrica.js</code>
            </p>
          </div>
        </div>
      )}
      <div id={elementId} className="min-h-[650px] text-foreground" />
    </section>
  );
}

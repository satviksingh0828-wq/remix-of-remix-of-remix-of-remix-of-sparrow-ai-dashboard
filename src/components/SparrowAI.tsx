import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { ChevronRight, Loader2, Send, X } from "lucide-react";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

// ── Puter.js type shim ──────────────────────────────────────────────────────
declare global {
  interface Window {
    puter?: {
      ai: {
        chat: (
          messages: { role: string; content: string }[],
          options?: { model?: string },
        ) => Promise<{ message: { content: string } }>;
      };
    };
  }
}

// ── Route knowledge (role-gated) ─────────────────────────────────────────────
const ADMIN_ROUTES = [
  { path: "/home",       label: "Workspace Home" },
  { path: "/operations", label: "Operations" },
  { path: "/masters",    label: "Masters" },
  { path: "/dashboard",  label: "Dashboard" },
  { path: "/reports",    label: "Reports" },
  { path: "/users",      label: "Users" },
  { path: "/settings",   label: "Settings" },
];
const BASIC_ROUTES = [
  { path: "/home",       label: "Workspace Home" },
  { path: "/operations", label: "Operations" },
  { path: "/masters",    label: "Masters" },
];

// ── System prompt ─────────────────────────────────────────────────────────────
function buildSystemPrompt(role: string, userName: string, currentPath: string): string {
  const isAdmin = role === "admin";
  const routes = isAdmin ? ADMIN_ROUTES : BASIC_ROUTES;

  const routeList = routes.map((r) => `  • ${r.label} → ${r.path}`).join("\n");

  const operationsTabs = isAdmin
    ? ["Trip", "Income", "Expenditure", "Driver Payroll", "Fixed Income (admin)", "Trip Averages (admin)", "EMI Scheduler (admin)", "Yearly Expenses (admin)", "Import Trips (admin)"]
    : ["Trip", "Income", "Expenditure", "Driver Payroll"];

  const mastersTabs = isAdmin
    ? ["Vehicle (admin)", "Driver", "Transporter", "Locations (admin)", "Sources/Contracts (admin)"]
    : ["Driver", "Transporter"];

  const adminSections = isAdmin ? `
SETTINGS (admin): Company profile, Branch management, Theme.
USERS (admin): User accounts (username, full name, password, role, branch access), Devices (passkey approvals), Activity Logs.
DASHBOARD & REPORTS (admin): P&L overview, period comparison reports.
FIXED INCOME: Contract-based recurring charges.
EMI SCHEDULER: Vehicle loan and EMI tracking.
YEARLY EXPENSES: Annual fixed cost tracker.
` : "";

  return `You are SPARROW AI, an assistant embedded in a Transport Management System (TMS) for Garuda Logistics Solutions.

USER: ${userName} | ROLE: ${isAdmin ? "Admin" : "Basic User"} | CURRENT PAGE: ${currentPath}

RULES:
- Be concise and direct. No filler phrases.
- ${isAdmin ? "You have full access to all modules." : "Basic user: never suggest admin-only routes (Dashboard, Reports, Users, Settings) or admin-only features."}
- You CANNOT save, create, edit, or delete any data. You only guide the user.
- When navigating, emit exactly: [[NAVIGATE:/route]] on its own line.
- Only suggest routes this user can access.

ALLOWED ROUTES:
${routeList}

OPERATIONS TABS (accessible):
${operationsTabs.map((t) => `  • ${t}`).join("\n")}

MASTERS TABS (accessible):
${mastersTabs.map((t) => `  • ${t}`).join("\n")}

TRIP FORM: ownership (Own Vehicle / Third Party), vehicle/driver or transporter, branch, from/to location, start date/time, odometer. Tabs: Manifest (source, route, weight, qty), Expenses (name, amount, note)${isAdmin ? ", Other Income, Summary" : ""}.
DRIVER FORM: driver code, full name, DOB, gender, blood group, mobile, emergency contact, address, licence (number, type, RTO, dates), salary type/amount, bank details.
TRANSPORTER FORM: name, contact, address, GST, bank details.
VEHICLE FORM (admin): registration number, manufacturer, model, fuel type, engine/chassis no, purchase date/cost.
CONTRACT/SOURCE FORM (admin): source name, fixed monthly/yearly charges, contract entries with from/to locations and freight slabs.
${adminSections}
Keep responses under 150 words unless a step-by-step guide is needed. Use bullet points for steps. Use **bold** for field names.`;
}

// ── Types ─────────────────────────────────────────────────────────────────────
type Message = { id: string; role: "assistant" | "user"; content: string };

function uid() { return Math.random().toString(36).slice(2); }

// ── Safe inline markdown → React nodes ───────────────────────────────────────
function parseInline(line: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) parts.push(<span key={i++}>{line.slice(last, m.index)}</span>);
    if (m[1] !== undefined) parts.push(<strong key={i++}>{m[1]}</strong>);
    else if (m[2] !== undefined) parts.push(<em key={i++}>{m[2]}</em>);
    last = re.lastIndex;
  }
  if (last < line.length) parts.push(<span key={i}>{line.slice(last)}</span>);
  return parts;
}

function renderMessage(text: string): React.ReactNode {
  const clean = text.replace(/\[\[NAVIGATE:[^\]]+\]\]/g, "").trim();
  const lines = clean.split("\n");
  const nodes: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = (key: string) => {
    if (!listItems.length) return;
    nodes.push(
      <ul key={key} className="my-1 ml-3 space-y-0.5 list-disc">
        {listItems.map((item, idx) => <li key={idx}>{parseInline(item)}</li>)}
      </ul>,
    );
    listItems = [];
  };

  lines.forEach((line, i) => {
    const bullet = line.match(/^[•\-]\s+(.+)/);
    if (bullet) {
      listItems.push(bullet[1]);
    } else {
      flushList(`l${i}`);
      if (line.trim() === "") {
        nodes.push(<div key={`s${i}`} className="h-1.5" />);
      } else {
        nodes.push(<div key={`p${i}`}>{parseInline(line)}</div>);
      }
    }
  });
  flushList("end");
  return <>{nodes}</>;
}

// ── Quick chips ───────────────────────────────────────────────────────────────
const ADMIN_CHIPS = ["Create a new trip", "Add a driver", "Open Dashboard", "Manage users", "Add a vehicle", "View Reports"];
const BASIC_CHIPS = ["Create a new trip", "Add a driver", "Add a transporter", "Record an expense", "View my trips"];

// ── AI call with timeout ──────────────────────────────────────────────────────
async function callPuterAI(
  messages: { role: string; content: string }[],
  timeoutMs = 25000,
): Promise<string> {
  if (!window.puter?.ai?.chat) {
    throw new Error("AI engine not available. Please reload the page and try again.");
  }
  const race = await Promise.race([
    window.puter.ai.chat(messages, { model: "gpt-4o-mini" }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out. Please try again.")), timeoutMs),
    ),
  ]);
  return (race as { message: { content: string } }).message?.content ?? "No response received.";
}

// ── Panel ─────────────────────────────────────────────────────────────────────
interface SparrowAIPanelProps {
  open: boolean;
  onClose: () => void;
}

export function SparrowAIPanel({ open, onClose }: SparrowAIPanelProps) {
  const { user } = useSession();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const role = user?.role ?? "basic";
  const isAdmin = role === "admin";
  const displayName = user?.fullName ?? user?.username ?? "there";
  const chips = isAdmin ? ADMIN_CHIPS : BASIC_CHIPS;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const handleNavigation = useCallback(
    (text: string) => {
      const match = text.match(/\[\[NAVIGATE:([^\]]+)\]\]/);
      if (!match) return;
      const path = match[1].trim();
      const allowed = isAdmin ? ADMIN_ROUTES : BASIC_ROUTES;
      if (!allowed.some((r) => r.path === path)) return;
      setTimeout(() => { navigate({ to: path as "/" }); onClose(); }, 400);
    },
    [navigate, isAdmin, onClose],
  );

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMsg: Message = { id: uid(), role: "user", content: trimmed };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      try {
        const systemPrompt = buildSystemPrompt(role, displayName, currentPath);
        const history = [...messages, userMsg].slice(-12).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const aiText = await callPuterAI([
          { role: "system", content: systemPrompt },
          ...history,
        ]);

        setMessages((prev) => [...prev, { id: uid(), role: "assistant", content: aiText }]);
        handleNavigation(aiText);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
        setMessages((prev) => [...prev, { id: uid(), role: "assistant", content: msg }]);
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, role, displayName, currentPath, handleNavigation],
  );

  if (!open || !user) return null;

  return (
    <div
      className={cn(
        "fixed right-0 top-16 z-40 flex flex-col",
        "h-[calc(100vh-4rem)] w-[360px]",
        "border-l border-border bg-card",
        "shadow-[-4px_0_24px_rgba(0,0,0,0.06)]",
        "animate-in slide-in-from-right duration-250",
      )}
      role="complementary"
      aria-label="SPARROW AI"
    >
      {/* Panel header */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <div>
          <span className="text-sm font-semibold tracking-tight text-foreground">SPARROW AI</span>
          <span className="ml-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            {isAdmin ? "Admin" : "User"}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 text-sm">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center gap-2 py-8">
            <p className="font-medium text-foreground">How can I help, {displayName.split(" ")[0]}?</p>
            <p className="text-xs text-muted-foreground max-w-[220px]">
              I can navigate the app, guide you through forms, and answer any questions.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                msg.role === "user"
                  ? "rounded-tr-sm bg-primary text-primary-foreground"
                  : "rounded-tl-sm bg-muted text-foreground",
              )}
            >
              {renderMessage(msg.content)}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2 justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
              <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
              <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
              <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Quick chips — shown only when no conversation yet */}
      {messages.length === 0 && (
        <div className="shrink-0 border-t border-border px-4 py-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Quick actions
          </p>
          <div className="flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => send(chip)}
                disabled={loading}
                className="flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs text-foreground transition-colors hover:border-primary/60 hover:bg-primary/5 hover:text-primary disabled:opacity-40"
              >
                <ChevronRight className="size-3 shrink-0" />
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="shrink-0 border-t border-border bg-card p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
            }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
            }}
            placeholder="Ask anything…"
            rows={1}
            disabled={loading}
            className={cn(
              "flex-1 resize-none rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm",
              "placeholder:text-muted-foreground",
              "focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
              "disabled:opacity-50 min-h-[40px] max-h-[120px]",
            )}
          />
          <button
            type="button"
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              "bg-primary text-primary-foreground transition-colors hover:bg-primary/90",
              "disabled:opacity-40 disabled:cursor-not-allowed",
            )}
            aria-label="Send"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground/50">
          POWERED BY SPARROW AI SOLUTIONS
        </p>
      </div>
    </div>
  );
}

// ── Header trigger button ─────────────────────────────────────────────────────
export function SparrowAITrigger({ onClick, active }: { onClick: () => void; active: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground",
      )}
      aria-label="Toggle SPARROW AI"
    >
      SPARROW AI
    </button>
  );
}

// ── Container (state lives here, placed in AppShell) ─────────────────────────
export function SparrowAIContainer() {
  const { user } = useSession();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      <SparrowAITrigger onClick={() => setOpen((v) => !v)} active={open} />
      <SparrowAIPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}

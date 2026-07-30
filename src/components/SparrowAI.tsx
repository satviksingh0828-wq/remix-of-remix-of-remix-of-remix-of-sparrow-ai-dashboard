import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Bot, ChevronRight, Loader2, Send, Sparkles, X } from "lucide-react";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

// ── Puter.js type shim ──────────────────────────────────────────────────────
declare global {
  interface Window {
    puter?: {
      ai: {
        chat: (
          messages: { role: string; content: string }[],
          options?: { model?: string; stream?: boolean },
        ) => Promise<{ message: { content: string } }>;
      };
    };
  }
}

// ── Route knowledge base ────────────────────────────────────────────────────
const ADMIN_ROUTES = [
  { path: "/home",       label: "Workspace Home",       desc: "Home screen with all module cards" },
  { path: "/operations", label: "Operations",            desc: "Trips, consignments, income, expenditure, driver payroll, EMI, fixed income" },
  { path: "/masters",    label: "Masters",               desc: "Vehicles, drivers, transporters, locations, sources/contracts" },
  { path: "/dashboard",  label: "Dashboard",             desc: "P&L and revenue overview (admin only)" },
  { path: "/reports",    label: "Reports",               desc: "P&L comparison and period reports (admin only)" },
  { path: "/users",      label: "Users",                 desc: "User accounts, devices, activity logs (admin only)" },
  { path: "/settings",   label: "Settings",              desc: "Company profile, branches, theme (admin only)" },
];

const BASIC_ROUTES = [
  { path: "/home",       label: "Workspace Home",       desc: "Home screen with available modules" },
  { path: "/operations", label: "Operations",            desc: "Trips, income, expenditure, driver payroll" },
  { path: "/masters",    label: "Masters",               desc: "Drivers and transporters" },
];

// ── Tabs within each module ──────────────────────────────────────────────────
const OPERATIONS_ADMIN_TABS = [
  "Trip – view live & closed trips, create new trips with manifest, income, expenses",
  "Income – other income entries branch-wise",
  "Expenditure – other spending entries branch-wise",
  "Driver Payroll – salary, advances, deductions per driver",
  "Fixed Income – contract recurring monthly charges (admin only)",
  "Trip Averages – monthly distribution analysis (admin only)",
  "EMI Scheduler – vehicle loan & EMI tracker (admin only)",
  "Yearly Expenses – fixed yearly cost tracker (admin only)",
  "Import Trips – bulk import historical trip data (admin only)",
];

const OPERATIONS_BASIC_TABS = [
  "Trip – view trips, create new trips with manifest and expenses (no income summary)",
  "Income – other income entries",
  "Expenditure – other spending entries",
  "Driver Payroll – salary and advances",
];

const MASTERS_ADMIN_TABS = [
  "Vehicle – fleet registration, specs, engine/chassis, purchase info",
  "Driver – staff details, licence, address, salary, bank info",
  "Transporter – owner/broker details, GST, bank info",
  "Locations – pickup and drop point details with PIN codes",
  "Sources – freight contracts with slabs, rates and ranges",
];

const MASTERS_BASIC_TABS = [
  "Driver – staff details, licence info",
  "Transporter – transporter/broker details",
];

// ── Trip form fields guide ───────────────────────────────────────────────────
const TRIP_FORM_GUIDE = `
TRIP FORM FIELDS:
- Trip ownership: Own Vehicle or Third Party (Rented)
- Own vehicle: select Vehicle, Driver, Branch, From/To location, Start date/time, Odometer start
- Third party: select Transporter, enter vehicle number, Branch, From/To location, Start date/time
- Tabs inside trip: Manifest (rows with source, from/to location+PIN, weight, qty), Other Income (admin), Expenses (name, amount, note), Vehicle/Driver details, Summary (admin)
- To close a trip: fill Odometer end + End date/time, then click Close Trip (admin can Reopen)
`;

const DRIVER_FORM_GUIDE = `
DRIVER FORM FIELDS:
- Driver Code, Full Name, Father's/Guardian's Name, Date of Birth, Gender, Blood Group
- Mobile Number, Alternate Mobile, Email, Emergency Contact
- Permanent & Current Address (line1, line2, city, state, country, PIN)
- Driving Licence: number, type (LMV/HMV), issuing RTO, issue date, expiry date
- Salary Type (Monthly/Per Trip/Per KM/Daily), Salary Amount
- Bank: account number, IFSC, bank name, account holder name
`;

const VEHICLE_FORM_GUIDE = `
VEHICLE FORM FIELDS (admin only):
- Registration Number (required), Internal Vehicle Code, Nickname
- Manufacturer, Model, Year of Manufacture, Fuel Type, Payload Capacity
- Purchase Date, Purchase Cost
- Engine No., Chassis No.
- Branch assignment
`;

const TRANSPORTER_FORM_GUIDE = `
TRANSPORTER FORM FIELDS:
- Transporter Name (required)
- Contact, Address, GST details, Bank info
`;

const CONTRACT_FORM_GUIDE = `
CONTRACT / SOURCE FORM FIELDS (admin only):
- Source Name
- Fixed monthly charge + note, Fixed yearly charge + note
- Optionally: Company details (name, legal name, PAN, GSTIN, CIN, address, contact)
- Contract Entries: From/To location pairs, freight slabs (weight/qty range, rate/fixed value), loading ranges
`;

const SETTINGS_GUIDE = `
SETTINGS TABS (admin only):
- Company: company name, address, GST, contact, logo
- Branch: add/edit branches (name, type, prefix)
- Theme: choose colour theme for the app
`;

const USERS_GUIDE = `
USERS MODULE (admin only):
- Users tab: create/edit users (username, full name, password, role admin/basic, status, branch access)
- Devices tab: manage Windows Hello / Passkey device approvals
- Activity Logs: full audit trail of all actions; filter by module; clear logs
`;

// ── System prompt builder ─────────────────────────────────────────────────────
function buildSystemPrompt(role: string, userName: string, currentPath: string): string {
  const isAdmin = role === "admin";
  const routes = isAdmin ? ADMIN_ROUTES : BASIC_ROUTES;
  const opTabs = isAdmin ? OPERATIONS_ADMIN_TABS : OPERATIONS_BASIC_TABS;
  const mastersTabs = isAdmin ? MASTERS_ADMIN_TABS : MASTERS_BASIC_TABS;

  const routeList = routes
    .map((r) => `  • ${r.label} (${r.path}): ${r.desc}`)
    .join("\n");

  const adminExtra = isAdmin
    ? `\n${VEHICLE_FORM_GUIDE}\n${CONTRACT_FORM_GUIDE}\n${SETTINGS_GUIDE}\n${USERS_GUIDE}`
    : "";

  return `You are SPARROW AI, the intelligent assistant built into this Transport Management System (TMS) for Garuda Logistics Solutions, powered by Sparrow AI Solutions.

CURRENT USER: ${userName} (role: ${isAdmin ? "Admin" : "Basic User"})
CURRENT PAGE: ${currentPath}

YOUR PERSONALITY:
- Friendly, concise, professional. Use simple language. Avoid jargon.
- Always address the user by their first name when appropriate.
- Be proactive — anticipate what they need next.

YOUR CAPABILITIES:
1. Navigate the user to any page they have access to.
2. Guide them step-by-step through any form or task.
3. Answer questions about features, data, or how things work.
4. Provide smart shortcuts and tips.

IMPORTANT RESTRICTIONS:
- You CANNOT save, create, edit, or delete any data yourself. You only guide the user.
- ${isAdmin ? "You have full access to all modules." : "You are a Basic User. Never suggest admin-only routes (Dashboard, Reports, Users, Settings) or admin-only features."}
- Never suggest routes or features the user's role doesn't allow.
- Never make up data or invent values. Guide the user to enter real data.

NAVIGATION COMMAND:
When the user asks to go somewhere or open a module, include EXACTLY this tag in your response (on its own line):
[[NAVIGATE:/route]]
Example: [[NAVIGATE:/operations]] or [[NAVIGATE:/masters]] or [[NAVIGATE:/home]]
Only suggest routes the user is allowed to access.

ALLOWED ROUTES FOR THIS USER:
${routeList}

OPERATIONS MODULE TABS (user can access):
${opTabs.map((t) => `  • ${t}`).join("\n")}

MASTERS MODULE TABS (user can access):
${mastersTabs.map((t) => `  • ${t}`).join("\n")}

${TRIP_FORM_GUIDE}
${DRIVER_FORM_GUIDE}
${TRANSPORTER_FORM_GUIDE}
${adminExtra}

RESPONSE FORMAT:
- Keep responses under 200 words unless a detailed step-by-step guide is needed.
- Use bullet points for steps. Use **bold** for field names and important terms.
- If navigating, explain what you're opening and why, then include the [[NAVIGATE:/route]] tag.
- Always end with a short follow-up prompt like "Want me to walk you through the next step?"`;
}

// ── Message types ─────────────────────────────────────────────────────────────
type Message = {
  id: string;
  role: "assistant" | "user";
  content: string;
  ts: number;
};

function makeId() {
  return Math.random().toString(36).slice(2);
}

// ── Safe markdown-lite renderer → React nodes ────────────────────────────────
// No dangerouslySetInnerHTML is used. All text is escaped by React's JSX renderer.

type InlineSegment = { bold?: boolean; italic?: boolean; text: string };

/** Parse **bold** and *italic* in a single line into safe React spans. */
function parseInline(line: string): React.ReactNode {
  const segments: InlineSegment[] = [];
  // tokenise: **bold**, *italic*, or plain text
  const re = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) segments.push({ text: line.slice(last, m.index) });
    if (m[1] !== undefined) segments.push({ bold: true, text: m[1] });
    else if (m[2] !== undefined) segments.push({ italic: true, text: m[2] });
    last = re.lastIndex;
  }
  if (last < line.length) segments.push({ text: line.slice(last) });

  return segments.map((s, i) => {
    if (s.bold) return <strong key={i}>{s.text}</strong>;
    if (s.italic) return <em key={i}>{s.text}</em>;
    return <span key={i}>{s.text}</span>;
  });
}

function renderContent(text: string): React.ReactNode {
  // Strip navigate commands from display
  const clean = text.replace(/\[\[NAVIGATE:[^\]]+\]\]/g, "").trim();

  const lines = clean.split("\n");
  const nodes: React.ReactNode[] = [];
  let listBuffer: string[] = [];

  const flushList = (key: string) => {
    if (listBuffer.length === 0) return;
    nodes.push(
      <ul key={key} className="mt-1 space-y-0.5 ml-3 list-disc">
        {listBuffer.map((item, i) => (
          <li key={i}>{parseInline(item)}</li>
        ))}
      </ul>,
    );
    listBuffer = [];
  };

  lines.forEach((line, i) => {
    const bulletMatch = line.match(/^[•\-]\s+(.+)/);
    if (bulletMatch) {
      listBuffer.push(bulletMatch[1]);
    } else {
      flushList(`list-${i}`);
      if (line.trim() === "") {
        nodes.push(<br key={`br-${i}`} />);
      } else {
        nodes.push(<span key={`line-${i}`} className="block">{parseInline(line)}</span>);
      }
    }
  });
  flushList("list-end");

  return <>{nodes}</>;
}

// ── Greeting messages per time of day ────────────────────────────────────────
function getGreeting(name: string): string {
  const h = new Date().getHours();
  const first = name.split(" ")[0];
  if (h < 12) return `Good morning, ${first}! ☀️ I'm SPARROW AI. How can I help you today?`;
  if (h < 17) return `Good afternoon, ${first}! 👋 I'm SPARROW AI, your app assistant. What do you need?`;
  return `Good evening, ${first}! 🌙 I'm SPARROW AI. Ready to help whenever you are.`;
}

// ── Quick action chips ────────────────────────────────────────────────────────
const ADMIN_CHIPS = [
  "Create a new trip",
  "Add a driver",
  "View Dashboard",
  "Open Reports",
  "Manage users",
  "Add a vehicle",
];

const BASIC_CHIPS = [
  "Create a new trip",
  "Add a driver",
  "Add a transporter",
  "View my trips",
  "Record an expense",
];

// ── Main SparrowAI component ──────────────────────────────────────────────────
interface SparrowAIProps {
  open: boolean;
  onClose: () => void;
}

export function SparrowAI({ open, onClose }: SparrowAIProps) {
  const { user } = useSession();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [puterReady, setPuterReady] = useState(false);
  const [greeted, setGreeted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const role = user?.role ?? "basic";
  const isAdmin = role === "admin";
  const displayName = user?.fullName ?? user?.username ?? "there";
  const chips = isAdmin ? ADMIN_CHIPS : BASIC_CHIPS;

  // ── Check puter.js availability ──────────────────────────────────────────
  useEffect(() => {
    const check = () => {
      if (window.puter?.ai) {
        setPuterReady(true);
      }
    };
    check();
    const t = setInterval(check, 500);
    return () => clearInterval(t);
  }, []);

  // ── Greet on open ────────────────────────────────────────────────────────
  useEffect(() => {
    if (open && !greeted && user) {
      const greetMsg: Message = {
        id: makeId(),
        role: "assistant",
        content: getGreeting(displayName),
        ts: Date.now(),
      };
      setMessages([greetMsg]);
      setGreeted(true);
    }
  }, [open, greeted, user, displayName]);

  // ── Auto-scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Focus input when opened ──────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  // ── Parse and execute navigation commands ───────────────────────────────
  const handleNavigation = useCallback(
    (text: string) => {
      const match = text.match(/\[\[NAVIGATE:([^\]]+)\]\]/);
      if (!match) return;
      const path = match[1].trim();

      // Validate path is allowed for this user
      const allowed = isAdmin ? ADMIN_ROUTES : BASIC_ROUTES;
      const isAllowed = allowed.some((r) => r.path === path);
      if (!isAllowed) return;

      setTimeout(() => {
        navigate({ to: path as "/" });
        onClose();
      }, 600);
    },
    [navigate, isAdmin, onClose],
  );

  // ── Send message ─────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMsg: Message = {
        id: makeId(),
        role: "user",
        content: trimmed,
        ts: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      try {
        if (!window.puter?.ai) {
          throw new Error("SPARROW AI is loading. Please try again in a moment.");
        }

        const systemPrompt = buildSystemPrompt(role, displayName, currentPath);

        // Build message history for puter (last 10 messages for context)
        const history = messages
          .slice(-10)
          .map((m) => ({ role: m.role, content: m.content }));

        const puterMessages = [
          { role: "system", content: systemPrompt },
          ...history,
          { role: "user", content: trimmed },
        ];

        const response = await window.puter.ai.chat(puterMessages, {
          model: "gpt-4o-mini",
        });

        const aiContent = response?.message?.content ?? "I'm sorry, I didn't get a response. Please try again.";

        const aiMsg: Message = {
          id: makeId(),
          role: "assistant",
          content: aiContent,
          ts: Date.now(),
        };

        setMessages((prev) => [...prev, aiMsg]);
        handleNavigation(aiContent);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
        const errorMsg: Message = {
          id: makeId(),
          role: "assistant",
          content: `⚠️ ${errMsg}`,
          ts: Date.now(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, role, displayName, currentPath, handleNavigation],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop (subtle) */}
      <div
        className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={cn(
          "fixed right-0 top-0 z-50 flex h-screen w-[380px] flex-col",
          "bg-card border-l border-border shadow-2xl",
          "animate-in slide-in-from-right duration-300",
        )}
        role="dialog"
        aria-label="SPARROW AI Assistant"
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border bg-primary px-4 py-3 shrink-0">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary-foreground/20">
            <Sparkles className="size-4 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-primary-foreground leading-none">SPARROW AI</p>
            <p className="mt-0.5 text-[10px] text-primary-foreground/70 leading-none">
              {puterReady ? "Ready · Powered by Puter" : "Connecting…"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-lg text-primary-foreground/70 transition-colors hover:bg-primary-foreground/20 hover:text-primary-foreground"
            aria-label="Close SPARROW AI"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Role badge */}
        <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-2 shrink-0">
          <span className="text-xs text-muted-foreground">
            Signed in as <strong className="text-foreground">{displayName}</strong>
          </span>
          <span
            className={cn(
              "ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
              isAdmin
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground",
            )}
          >
            {isAdmin ? "Admin" : "User"}
          </span>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-2",
                msg.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              {msg.role === "assistant" && (
                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary mt-0.5">
                  <Bot className="size-3.5 text-primary-foreground" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "rounded-tr-sm bg-primary text-primary-foreground"
                    : "rounded-tl-sm bg-muted text-foreground",
                )}
              >
                {renderContent(msg.content)}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-2 justify-start">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary mt-0.5">
                <Bot className="size-3.5 text-primary-foreground" />
              </div>
              <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
                <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
                <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
                <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick action chips */}
        {messages.length <= 1 && (
          <div className="shrink-0 border-t border-border px-4 py-3 bg-muted/20">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Quick actions
            </p>
            <div className="flex flex-wrap gap-1.5">
              {chips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => sendMessage(chip)}
                  disabled={loading || !puterReady}
                  className="flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
                >
                  <ChevronRight className="size-3 shrink-0" />
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="shrink-0 border-t border-border bg-card p-3">
          {!puterReady && (
            <div className="mb-2 flex items-center gap-1.5 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              Loading AI engine…
            </div>
          )}
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything…"
              rows={1}
              disabled={loading || !puterReady}
              className={cn(
                "flex-1 resize-none rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm",
                "placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
                "disabled:opacity-50 max-h-32 min-h-[40px]",
              )}
              style={{ height: "auto" }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
              }}
            />
            <button
              type="button"
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim() || !puterReady}
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                "bg-primary text-primary-foreground hover:bg-primary/90",
                "disabled:opacity-40 disabled:cursor-not-allowed",
              )}
              aria-label="Send message"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground/50">
            SPARROW AI · Powered by Puter · Cannot save or delete data
          </p>
        </div>
      </div>
    </>
  );
}

// ── Header trigger button (used inside AppShell) ──────────────────────────────
interface SparrowAITriggerProps {
  onClick: () => void;
  showGreeting: boolean;
  greetingText: string;
}

export function SparrowAITrigger({ onClick, showGreeting, greetingText }: SparrowAITriggerProps) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "relative flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5",
          "text-xs font-medium text-primary transition-all duration-200",
          "hover:bg-primary/20 hover:border-primary/60 hover:shadow-sm",
        )}
        aria-label="Open SPARROW AI"
      >
        <Sparkles className="size-3.5" />
        <span className="hidden sm:inline">SPARROW AI</span>
        {/* Pulse dot */}
        <span className="absolute -right-0.5 -top-0.5 flex size-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-primary" />
        </span>
      </button>

      {/* Greeting bubble */}
      {showGreeting && (
        <div
          className={cn(
            "absolute right-0 top-full mt-2 z-50",
            "w-56 rounded-xl rounded-tr-sm border border-border bg-card px-3 py-2.5 shadow-lg",
            "animate-in fade-in slide-in-from-top-1 duration-300",
          )}
        >
          <div className="absolute -top-1.5 right-3 size-3 rotate-45 border-l border-t border-border bg-card" />
          <p className="text-xs text-foreground leading-relaxed">{greetingText}</p>
          <p className="mt-1 text-[10px] text-muted-foreground">Click to open ✨</p>
        </div>
      )}
    </div>
  );
}

// ── SparrowAI container — manages state, used in AppShell ─────────────────────
export function SparrowAIContainer() {
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const [greetingText, setGreetingText] = useState("");
  const greetingShownRef = useRef(false);

  // Show greeting bubble once per session when user is loaded
  useEffect(() => {
    if (!user || greetingShownRef.current) return;
    greetingShownRef.current = true;

    const h = new Date().getHours();
    const first = (user.fullName ?? user.username).split(" ")[0];
    const greeting =
      h < 12
        ? `Good morning, ${first}! 👋`
        : h < 17
          ? `Hello, ${first}! How can I help?`
          : `Good evening, ${first}! 🌙`;

    setGreetingText(greeting);

    // Delay slightly so the page has rendered
    const showTimer = setTimeout(() => setShowGreeting(true), 1200);
    // Auto-hide after 5 seconds
    const hideTimer = setTimeout(() => setShowGreeting(false), 6500);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [user]);

  if (!user) return null;

  return (
    <>
      <SparrowAITrigger
        onClick={() => {
          setShowGreeting(false);
          setOpen(true);
        }}
        showGreeting={showGreeting}
        greetingText={greetingText}
      />
      <SparrowAI open={open} onClose={() => setOpen(false)} />
    </>
  );
}

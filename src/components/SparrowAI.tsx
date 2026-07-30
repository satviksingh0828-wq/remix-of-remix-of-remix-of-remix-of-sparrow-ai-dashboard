import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { ChevronRight, Loader2, Send, X } from "lucide-react";
import { useSession } from "@/lib/session";
import { useSparrowAI } from "@/lib/sparrow-context";
import { cn } from "@/lib/utils";

// ── Puter.js type shim ────────────────────────────────────────────────────────
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

// ── Routes (role-gated) ───────────────────────────────────────────────────────
const ADMIN_ROUTES = ["/home", "/operations", "/masters", "/dashboard", "/reports", "/users", "/settings"];
const BASIC_ROUTES = ["/home", "/operations", "/masters"];

// ── DOM action types ──────────────────────────────────────────────────────────
type SparrowAction =
  | { type: "navigate"; path: string }
  | { type: "wait"; ms: number }
  | { type: "click_button"; text: string }
  | { type: "click_tab"; text: string }
  | { type: "fill_input"; label: string; value: string }
  | { type: "fill_placeholder"; placeholder: string; value: string }
  | { type: "scroll_to"; label: string };

// ── DOM utilities ─────────────────────────────────────────────────────────────
function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function fillReactInput(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto =
    el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const nativeSetter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (nativeSetter) {
    nativeSetter.call(el, value);
  } else {
    el.value = value;
  }
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  el.focus();
}

function findInputByLabel(labelText: string): HTMLInputElement | HTMLTextAreaElement | null {
  const lower = labelText.toLowerCase().trim();
  // 1. Match by <label> text content
  for (const label of Array.from(document.querySelectorAll("label"))) {
    const text = label.textContent?.toLowerCase().trim() ?? "";
    if (text.includes(lower) || lower.includes(text.replace(/[*]/g, "").trim())) {
      const forId = label.getAttribute("for");
      if (forId) {
        const el = document.getElementById(forId);
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return el;
      }
      const nested = label.querySelector("input, textarea");
      if (nested) return nested as HTMLInputElement;
    }
  }
  // 2. Match by placeholder or aria-label
  const inputs = Array.from(
    document.querySelectorAll("input, textarea"),
  ) as (HTMLInputElement | HTMLTextAreaElement)[];
  return (
    inputs.find(
      (i) =>
        i.placeholder?.toLowerCase().includes(lower) ||
        i.getAttribute("aria-label")?.toLowerCase().includes(lower),
    ) ?? null
  );
}

// Buttons with these words must never be clicked by SPARROW AI
const BLOCKED_BUTTON_WORDS = ["save", "delete", "remove", "destroy", "submit trip", "close trip"];
function isBlockedButton(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return BLOCKED_BUTTON_WORDS.some((w) => lower.includes(w));
}

function findButtonByText(text: string): HTMLButtonElement | null {
  const lower = text.toLowerCase().trim();
  const all = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));
  // Exact first
  const exact = all.find((b) => b.textContent?.trim().toLowerCase() === lower);
  if (exact) return exact;
  // Contains
  return all.find((b) => b.textContent?.trim().toLowerCase().includes(lower)) ?? null;
}

async function executeActions(
  actions: SparrowAction[],
  navigateFn: (path: string) => void,
  allowedRoutes: string[],
  onLog: (msg: string) => void,
) {
  for (const act of actions) {
    switch (act.type) {
      case "navigate": {
        if (!allowedRoutes.includes(act.path)) {
          onLog(`Navigation to ${act.path} not allowed for your role.`);
          break;
        }
        navigateFn(act.path);
        break;
      }
      case "wait":
        await sleep(Math.min(act.ms, 3000));
        break;
      case "click_button": {
        if (isBlockedButton(act.text)) {
          onLog(`Blocked: will not click "${act.text}" (save/delete action).`);
          break;
        }
        const btn = findButtonByText(act.text);
        if (btn && !btn.disabled) {
          btn.click();
        } else {
          onLog(`Button "${act.text}" not found on page.`);
        }
        break;
      }
      case "click_tab": {
        // Find in nav sidebar or tab bar — look for button with matching text
        const btn = findButtonByText(act.text);
        if (btn && !btn.disabled) {
          btn.click();
        } else {
          onLog(`Tab "${act.text}" not found.`);
        }
        break;
      }
      case "fill_input": {
        const el = findInputByLabel(act.label);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          await sleep(150);
          fillReactInput(el, act.value);
        } else {
          onLog(`Field "${act.label}" not found.`);
        }
        break;
      }
      case "fill_placeholder": {
        const inputs = Array.from(
          document.querySelectorAll("input, textarea"),
        ) as (HTMLInputElement | HTMLTextAreaElement)[];
        const el = inputs.find((i) =>
          i.placeholder?.toLowerCase().includes(act.placeholder.toLowerCase()),
        );
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          await sleep(150);
          fillReactInput(el, act.value);
        } else {
          onLog(`Field with placeholder "${act.placeholder}" not found.`);
        }
        break;
      }
      case "scroll_to": {
        const el = findInputByLabel(act.label);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        break;
      }
    }
    await sleep(180);
  }
}

// ── Parse action block from AI response ──────────────────────────────────────
function parseActions(text: string): { actions: SparrowAction[]; displayText: string } {
  const startTag = "<<SPARROW_ACTIONS>>";
  const endTag = "<<END_ACTIONS>>";
  const start = text.indexOf(startTag);
  const end = text.indexOf(endTag);
  if (start === -1 || end === -1 || end <= start) {
    return { actions: [], displayText: text };
  }
  const jsonStr = text.slice(start + startTag.length, end).trim();
  const displayText = (text.slice(0, start) + text.slice(end + endTag.length)).trim();
  try {
    const actions = JSON.parse(jsonStr) as SparrowAction[];
    return { actions, displayText };
  } catch {
    return { actions: [], displayText: text };
  }
}

// ── System prompt ─────────────────────────────────────────────────────────────
function buildSystemPrompt(role: string, userName: string, currentPath: string): string {
  const isAdmin = role === "admin";
  const routes = isAdmin ? ADMIN_ROUTES : BASIC_ROUTES;

  return `You are SPARROW AI, an assistant embedded in a Transport Management System (TMS) for Garuda Logistics Solutions, built by Sparrow AI Solutions.

USER: ${userName} | ROLE: ${isAdmin ? "Admin" : "Basic User"} | PAGE: ${currentPath}

CORE RULES:
- Be concise and action-oriented. Skip filler phrases.
- ${isAdmin ? "Full access to all modules." : "Basic user: never use admin routes (Dashboard, Reports, Users, Settings) or admin features."}
- You CAN navigate, click buttons, fill fields. You CANNOT save, delete, or submit.
- When you do something in the app, ALWAYS include an action block.

ALLOWED ROUTES: ${routes.join(", ")}

OPERATIONS TABS: Trip, Income, Expenditure, Driver Payroll${isAdmin ? ", Fixed Income, Trip Averages, EMI Scheduler, Yearly Expenses, Import Trips" : ""}
MASTERS TABS: Driver, Transporter${isAdmin ? ", Vehicle, Locations, Sources" : ""}
TRIP FORM TABS: Manifest, Other Income, Expenses, Vehicle, Driver, Transporter${isAdmin ? ", Summary" : ""}

EXACT BUTTON TEXTS (use these exactly in click_button actions):
- "New trip" — opens the New Trip form
- "New Vehicle", "New Driver", "New Transporter", "New Locations", "New Sources" — master record forms
- "New income", "New expenditure" — finance entry forms  
- "Generate Payroll", "Give Advance" — driver payroll
- "Create manifest" — adds a manifest row in trip form
- "Add field" — adds expense or income row in trip form

ACTION FORMAT — include this block in your response to DO something:
<<SPARROW_ACTIONS>>
[
  {"type":"navigate","path":"/route"},
  {"type":"wait","ms":700},
  {"type":"click_tab","text":"Vehicle"},
  {"type":"wait","ms":400},
  {"type":"click_button","text":"New Vehicle"},
  {"type":"wait","ms":500},
  {"type":"fill_input","label":"Registration Number","value":"MH12AB1234"},
  {"type":"fill_input","label":"Manufacturer","value":"Tata"},
  {"type":"scroll_to","label":"Engine No."}
]
<<END_ACTIONS>>

ACTION RULES:
- Always navigate first, then wait 700ms, then interact
- Wait 400-600ms after clicking a button that opens a form
- NEVER use click_button with text containing save, delete, remove, submit, close trip
- Chain multiple fill_input actions without waits between them
- Use click_tab to switch sidebar nav or form tabs

RESPONSE FORMAT: Plain text explanation + action block. Under 120 words of text. Use **bold** for field names. No bullet lists unless genuinely needed for steps.`;
}

// ── Safe renderer (no dangerouslySetInnerHTML) ────────────────────────────────
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
  return parts.length ? parts : line;
}

function renderMessage(text: string): React.ReactNode {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let list: string[] = [];
  const flushList = (k: string) => {
    if (!list.length) return;
    nodes.push(
      <ul key={k} className="my-1 ml-4 space-y-0.5 list-disc">
        {list.map((item, idx) => <li key={idx}>{parseInline(item)}</li>)}
      </ul>,
    );
    list = [];
  };
  lines.forEach((line, i) => {
    const bullet = line.match(/^[•\-]\s+(.+)/);
    if (bullet) {
      list.push(bullet[1]);
    } else {
      flushList(`l${i}`);
      if (line.trim() === "") nodes.push(<div key={`s${i}`} className="h-1.5" />);
      else nodes.push(<div key={`p${i}`}>{parseInline(line)}</div>);
    }
  });
  flushList("end");
  return <>{nodes}</>;
}

// ── Message type ──────────────────────────────────────────────────────────────
type Msg = { id: string; role: "user" | "assistant"; content: string; executing?: boolean };
const uid = () => Math.random().toString(36).slice(2);

// ── Quick chips ───────────────────────────────────────────────────────────────
const ADMIN_CHIPS = ["Open trip form", "Add a vehicle", "Add a driver", "Open dashboard", "Add expenditure"];
const BASIC_CHIPS = ["Open trip form", "Add a driver", "Add a transporter", "Record an expense"];

// ── Puter AI call with timeout ────────────────────────────────────────────────
async function callPuter(messages: { role: string; content: string }[]): Promise<string> {
  const puter = window.puter;
  if (!puter?.ai?.chat) {
    throw new Error("AI engine not ready. Please reload the page and try again.");
  }
  type PuterResult = { message: { content: string } };
  const result = await Promise.race<PuterResult>([
    puter.ai.chat(messages, { model: "gpt-4o-mini" }) as Promise<PuterResult>,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out after 25s. Please try again.")), 25000),
    ),
  ]);
  return result.message?.content ?? "No response.";
}

// ── Main panel ────────────────────────────────────────────────────────────────
export function SparrowAIPanel() {
  const { open, setOpen } = useSparrowAI();
  const { user } = useSession();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const role = user?.role ?? "basic";
  const isAdmin = role === "admin";
  const displayName = (user?.fullName ?? user?.username ?? "there").split(" ")[0];
  const chips = isAdmin ? ADMIN_CHIPS : BASIC_CHIPS;
  const allowedRoutes = isAdmin ? ADMIN_ROUTES : BASIC_ROUTES;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMsg: Msg = { id: uid(), role: "user", content: trimmed };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      try {
        const systemPrompt = buildSystemPrompt(role, displayName, currentPath);
        const history = [...messages, userMsg].slice(-14).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const rawText = await callPuter([{ role: "system", content: systemPrompt }, ...history]);
        const { actions, displayText } = parseActions(rawText);

        const aiMsg: Msg = {
          id: uid(),
          role: "assistant",
          content: displayText,
          executing: actions.length > 0,
        };
        setMessages((prev) => [...prev, aiMsg]);

        if (actions.length > 0) {
          await executeActions(actions, (path) => navigate({ to: path as "/" }), allowedRoutes, (log) => {
            setMessages((prev) => [
              ...prev,
              { id: uid(), role: "assistant", content: `Note: ${log}` },
            ]);
          });
          setMessages((prev) =>
            prev.map((m) => (m.id === aiMsg.id ? { ...m, executing: false } : m)),
          );
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
        setMessages((prev) => [...prev, { id: uid(), role: "assistant", content: msg }]);
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, role, displayName, currentPath, navigate, allowedRoutes],
  );

  if (!user) return null;

  return (
    <div
      className={cn(
        "flex flex-col h-full",
        "border-l border-border bg-card",
      )}
      role="complementary"
      aria-label="SPARROW AI"
    >
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tracking-tight text-foreground">SPARROW AI</span>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
            {isAdmin ? "Admin" : "User"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 text-sm">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center">
            <p className="font-medium text-foreground">How can I help, {displayName}?</p>
            <p className="text-xs text-muted-foreground max-w-[200px]">
              I can navigate, fill forms, and click buttons for you.
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
                "max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                msg.role === "user"
                  ? "rounded-tr-sm bg-primary text-primary-foreground"
                  : "rounded-tl-sm bg-muted text-foreground",
              )}
            >
              {renderMessage(msg.content)}
              {msg.executing && (
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" />
                  <span>Working…</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
              <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
              <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
              <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Quick chips */}
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
                className="flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs text-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary disabled:opacity-40"
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
            placeholder="Ask anything or give an instruction…"
            rows={1}
            disabled={loading}
            className={cn(
              "flex-1 resize-none rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm",
              "placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
              "disabled:opacity-50 min-h-[40px] max-h-[120px]",
            )}
          />
          <button
            type="button"
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
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

// ── Trigger button (used in AppShell header) ──────────────────────────────────
export function SparrowAITrigger() {
  const { open, toggle } = useSparrowAI();
  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
        open
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      SPARROW AI
    </button>
  );
}

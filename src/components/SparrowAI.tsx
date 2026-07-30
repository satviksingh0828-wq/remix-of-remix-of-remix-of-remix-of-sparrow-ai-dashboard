import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Bot, ChevronRight, Loader2, Send, X } from "lucide-react";
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
  | { type: "open_picker"; label: string; search: string }
  | { type: "scroll_to"; label: string };

// ── DOM helpers ───────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function fillReactInput(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto =
    el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const nativeSetter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  nativeSetter ? nativeSetter.call(el, value) : (el.value = value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  el.focus();
}

/** Get clean text content of an element (strips icon SVG whitespace) */
function getCleanText(el: Element): string {
  return (el.textContent ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

/** Find an input/textarea associated with a given label text. */
function findInputByLabel(labelText: string): HTMLInputElement | HTMLTextAreaElement | null {
  const needle = labelText.toLowerCase().replace(/[₹*()]/g, "").trim();

  for (const label of Array.from(document.querySelectorAll<HTMLLabelElement>("label"))) {
    const ltext = (label.textContent ?? "").toLowerCase().replace(/[₹*()]/g, "").trim();
    if (!ltext.includes(needle) && !needle.includes(ltext)) continue;

    // 1. for=id
    const forId = label.getAttribute("for");
    if (forId) {
      const el = document.getElementById(forId);
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return el;
    }
    // 2. nested input
    const nested = label.querySelector<HTMLInputElement | HTMLTextAreaElement>("input, textarea");
    if (nested) return nested;
    // 3. sibling inside parent (shadcn pattern)
    const sibling = label.parentElement?.querySelector<HTMLInputElement | HTMLTextAreaElement>(
      "input, textarea",
    );
    if (sibling) return sibling;
  }

  // Fallback: placeholder or aria-label
  return (
    Array.from(
      document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea"),
    ).find(
      (i) =>
        i.placeholder?.toLowerCase().includes(needle) ||
        i.getAttribute("aria-label")?.toLowerCase().includes(needle),
    ) ?? null
  );
}

async function findInputRetry(
  label: string,
  maxAttempts = 5,
  delay = 450,
): Promise<HTMLInputElement | HTMLTextAreaElement | null> {
  for (let i = 0; i < maxAttempts; i++) {
    const el = findInputByLabel(label);
    if (el) return el;
    if (i < maxAttempts - 1) await sleep(delay);
  }
  return null;
}

const BLOCKED = ["save", "delete", "remove record", "confirm delete", "submit trip"];
const isBlocked = (text: string) => BLOCKED.some((w) => text.toLowerCase().includes(w));

/**
 * Find a button by text — robust to icon+text combos.
 * Checks both textContent and innerText after stripping SVG whitespace.
 */
function findButtonByText(text: string): HTMLButtonElement | null {
  const needle = text.toLowerCase().trim();
  const all = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));

  // Exact match first (clean text)
  const exact = all.find((b) => getCleanText(b) === needle);
  if (exact) return exact;

  // Contains match
  const contains = all.find((b) => getCleanText(b).includes(needle));
  if (contains) return contains;

  // innerText fallback (handles some edge cases with icon spacing)
  return (
    all.find((b) => (b.innerText ?? "").toLowerCase().trim() === needle) ??
    all.find((b) => (b.innerText ?? "").toLowerCase().trim().includes(needle)) ??
    null
  );
}

async function findButtonRetry(
  text: string,
  maxAttempts = 6,
  delay = 500,
): Promise<HTMLButtonElement | null> {
  for (let i = 0; i < maxAttempts; i++) {
    const btn = findButtonByText(text);
    if (btn) return btn;
    if (i < maxAttempts - 1) await sleep(delay);
  }
  return null;
}

/**
 * Find and open an EntityPicker (combobox) by its label, then type a search term.
 * The picker sits inside a <div> that contains a <Label> and a <button role="combobox">.
 */
async function openPickerByLabel(
  labelText: string,
  searchTerm: string,
): Promise<{ ok: boolean; message: string }> {
  const needle = labelText.toLowerCase().replace(/[₹*()]/g, "").trim();

  for (const label of Array.from(document.querySelectorAll<HTMLLabelElement>("label"))) {
    const ltext = (label.textContent ?? "").toLowerCase().replace(/[₹*()]/g, "").trim();
    if (!ltext.includes(needle) && !needle.includes(ltext)) continue;

    // Find the combobox button sibling
    const container = label.closest("div");
    if (!container) continue;
    const btn = container.querySelector<HTMLButtonElement>('[role="combobox"]');
    if (!btn) continue;

    btn.scrollIntoView({ behavior: "smooth", block: "center" });
    await sleep(100);
    btn.click();
    await sleep(500);

    // Type in the CommandInput search box that appeared
    const searchInput = document.querySelector<HTMLInputElement>('[cmdk-input]');
    if (searchInput) {
      fillReactInput(searchInput, searchTerm);
      await sleep(400);

      // Click the first matching item
      const items = Array.from(document.querySelectorAll<HTMLElement>('[cmdk-item]'));
      const match = items.find(
        (i) => (i.textContent ?? "").toLowerCase().includes(searchTerm.toLowerCase()),
      );
      if (match) {
        match.click();
        return { ok: true, message: `Selected "${match.textContent?.trim()}" for ${labelText}` };
      }
      return { ok: false, message: `No match for "${searchTerm}" in ${labelText} picker` };
    }
    return { ok: false, message: `Search input not found in ${labelText} picker` };
  }

  return { ok: false, message: `Picker "${labelText}" not found on page` };
}

// ── Detect active Operations tab from DOM ─────────────────────────────────────
function getActiveTabFromDOM(): string {
  // Desktop nav: the active item has bg-primary-soft
  const activeNavBtn = document.querySelector<HTMLButtonElement>(
    "nav button.bg-primary-soft, nav button[class*='bg-primary-soft']",
  );
  if (activeNavBtn) {
    const text = (activeNavBtn.innerText ?? activeNavBtn.textContent ?? "").split("\n")[0].trim();
    if (text) return text;
  }
  // Mobile tab bar: active has bg-primary text-primary-foreground
  const mobileBtns = document.querySelectorAll<HTMLButtonElement>("button.bg-primary");
  for (const b of Array.from(mobileBtns)) {
    const text = (b.innerText ?? b.textContent ?? "").trim();
    if (text && text.length < 30) return text;
  }
  return "";
}

// ── Action executor ───────────────────────────────────────────────────────────
async function executeActions(
  actions: SparrowAction[],
  navigateFn: (path: string) => void,
  allowedRoutes: string[],
  onLog: (msg: string) => void,
  onStep: (step: string) => void,
) {
  for (const act of actions) {
    switch (act.type) {
      case "navigate": {
        if (!allowedRoutes.includes(act.path)) {
          onLog(`Navigation to ${act.path} is not available for your role.`);
          break;
        }
        onStep(`Navigating to ${act.path}…`);
        navigateFn(act.path);
        break;
      }

      case "wait":
        await sleep(Math.min(act.ms, 4000));
        break;

      case "click_button": {
        if (isBlocked(act.text)) {
          onLog(`Blocked: will not click "${act.text}" (save/delete action).`);
          break;
        }
        onStep(`Clicking "${act.text}"…`);
        const btn = await findButtonRetry(act.text);
        if (btn && !btn.disabled) {
          btn.scrollIntoView({ behavior: "smooth", block: "nearest" });
          await sleep(80);
          btn.click();
        } else {
          onLog(`Button "${act.text}" was not found on the page.`);
        }
        break;
      }

      case "click_tab": {
        onStep(`Switching to "${act.text}" tab…`);
        const btn = await findButtonRetry(act.text, 6, 400);
        if (btn && !btn.disabled) {
          btn.click();
        } else {
          onLog(`Tab "${act.text}" was not found.`);
        }
        break;
      }

      case "fill_input": {
        onStep(`Filling "${act.label}"…`);
        const el = await findInputRetry(act.label);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          await sleep(100);
          fillReactInput(el, act.value);
        } else {
          onLog(`Field "${act.label}" was not found on the page.`);
        }
        break;
      }

      case "fill_placeholder": {
        onStep(`Filling field…`);
        const needle = act.placeholder.toLowerCase();
        const el = Array.from(
          document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea"),
        ).find((i) => i.placeholder?.toLowerCase().includes(needle));
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          await sleep(100);
          fillReactInput(el, act.value);
        } else {
          onLog(`Field with placeholder "${act.placeholder}" not found.`);
        }
        break;
      }

      case "open_picker": {
        onStep(`Selecting "${act.search}" in ${act.label}…`);
        const result = await openPickerByLabel(act.label, act.search);
        if (!result.ok) onLog(result.message);
        break;
      }

      case "scroll_to": {
        const el = findInputByLabel(act.label);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        break;
      }
    }
    await sleep(160);
  }
  onStep("");
}

// ── Parse action block ────────────────────────────────────────────────────────
function parseActions(text: string): { actions: SparrowAction[]; displayText: string } {
  const S = "<<SPARROW_ACTIONS>>";
  const E = "<<END_ACTIONS>>";
  const s = text.indexOf(S);
  const e = text.indexOf(E);
  if (s === -1 || e === -1 || e <= s) return { actions: [], displayText: text };
  const jsonStr = text.slice(s + S.length, e).trim();
  const displayText = (text.slice(0, s) + text.slice(e + E.length)).trim();
  try {
    return { actions: JSON.parse(jsonStr) as SparrowAction[], displayText };
  } catch {
    return { actions: [], displayText: text };
  }
}

// ── System prompt ─────────────────────────────────────────────────────────────
function buildSystemPrompt(role: string, userName: string, currentPath: string, activeTab: string): string {
  const isAdmin = role === "admin";
  const routes = isAdmin ? ADMIN_ROUTES : BASIC_ROUTES;
  const tabCtx = activeTab ? ` | ACTIVE TAB: ${activeTab}` : "";

  return `You are SPARROW AI — an intelligent assistant embedded in a Transport Management System (TMS) for Garuda Logistics Solutions.

USER: ${userName} | ROLE: ${isAdmin ? "Admin" : "Basic User"} | CURRENT PAGE: ${currentPath}${tabCtx}

━━━ CORE RULES ━━━
- Be concise (under 80 words). Say what you're doing and do it.
- ${isAdmin ? "Full admin access to all modules." : "Basic user: NEVER suggest admin-only routes (Dashboard, Reports, Users, Settings)."}
- You CAN navigate, click buttons, fill forms, open pickers. You CANNOT save, delete, or submit.
- Whenever you interact with the app, you MUST include a <<SPARROW_ACTIONS>> block.
- Never tell the user to do it themselves if you can do it with actions.

ALLOWED ROUTES: ${routes.join(", ")}

━━━ TERMINOLOGY ALIASES (user may say these, map to the real field) ━━━
- "location" / "city" / "place" / "where" → "Note" field (free text, put the city/place name here)
- "department" / "branch" / "office" / "branch office" → "Branch (required)" picker
- "expense type" / "type of expense" / "category" / "what expense" → "Expenditure name" field
- "expense name" / "name" → "Expenditure name" field
- "how much" / "price" / "cost" / "rupees" → "Amount" field (label shown as "Amount (₹)")
- "status" / "payment status" → Status dropdown (Unpaid / Paid)

━━━ EXACT BUTTON TEXTS ━━━
- "New trip" → opens trip form
- "New expenditure" → opens expenditure form (must be on Expenditure tab first)
- "New income" → opens income form (must be on Income tab first)
- "New Vehicle", "New Driver", "New Transporter", "New Locations" → master forms
- "Generate Payroll", "Give Advance" → driver payroll
- "Create manifest" → adds manifest row in trip form
- "Add field" → adds expense/income row in trip form

━━━ EXACT FIELD LABELS BY FORM ━━━
Expenditure form fields (use these EXACT strings in fill_input):
  - "Expenditure name"   ← the type/name of the expense (e.g. "Tea Expenses")
  - "Amount"             ← numeric amount (label shows "Amount (₹)" but use "Amount")
  - "Date"               ← date field
  - "Note"               ← free text, use for city/location/remarks (e.g. "Ludhiana")
  - "Branch (required)"  ← PICKER — use open_picker action, NOT fill_input

Income form: "Income name", "Amount", "Date", "Note", "Branch (required)"
Trip form: "From", "To", "Start Date", "End Date"
Driver form: "Driver Code", "Full Name", "Date of Birth", "Mobile Number", "Driving Licence Number"
Vehicle form: "Vehicle Number (Registration Number)", "Manufacturer", "Model", "Engine No.", "Chassis No."

━━━ OPERATIONS SIDEBAR TABS (click these to switch) ━━━
Trip | Income | Expenditure | Driver Payroll${isAdmin ? " | Fixed Income | Trip Averages | EMI Scheduler | Yearly Expenses | Import Trips" : ""}

━━━ ACTION FORMAT ━━━
<<SPARROW_ACTIONS>>
[
  {"type":"navigate","path":"/operations"},
  {"type":"wait","ms":1200},
  {"type":"click_tab","text":"Expenditure"},
  {"type":"wait","ms":800},
  {"type":"click_button","text":"New expenditure"},
  {"type":"wait","ms":700},
  {"type":"fill_input","label":"Expenditure name","value":"Tea Expenses"},
  {"type":"fill_input","label":"Amount","value":"20000"},
  {"type":"fill_input","label":"Note","value":"Ludhiana"}
]
<<END_ACTIONS>>

━━━ ACTION RULES ━━━
- Always navigate first, then wait ≥1200ms before clicking anything
- After click_button that opens a form/dialog: wait ≥700ms before filling fields
- After click_tab: wait ≥800ms before next action
- NEVER click_button with: save, delete, remove, submit trip, close trip
- Pickers (Branch, Vehicle, Driver, Transporter) need open_picker, NOT fill_input
- fill_input only works on text/number/date inputs with matching labels`;
}

// ── Safe markdown renderer ────────────────────────────────────────────────────
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
    if (bullet) { list.push(bullet[1]); }
    else {
      flushList(`l${i}`);
      if (line.trim() === "") nodes.push(<div key={`s${i}`} className="h-1.5" />);
      else nodes.push(<div key={`p${i}`}>{parseInline(line)}</div>);
    }
  });
  flushList("end");
  return <>{nodes}</>;
}

// ── Types + helpers ───────────────────────────────────────────────────────────
type Msg = { id: string; role: "user" | "assistant"; content: string; executing?: boolean };
const uid = () => Math.random().toString(36).slice(2);

const ADMIN_CHIPS = ["Open trip form", "New expenditure", "Add a vehicle", "Add a driver", "Open dashboard"];
const BASIC_CHIPS = ["Open trip form", "New expenditure", "Add a driver", "Add a transporter"];

async function callPuter(messages: { role: string; content: string }[]): Promise<string> {
  const p = window.puter;
  if (!p?.ai?.chat) throw new Error("AI engine not ready. Please reload and try again.");
  type R = { message: { content: string } };
  const result = await Promise.race<R>([
    p.ai.chat(messages, { model: "gpt-4o-mini" }) as Promise<R>,
    new Promise<never>((_, rej) =>
      setTimeout(() => rej(new Error("Request timed out. Please try again.")), 28000),
    ),
  ]);
  return result.message?.content ?? "No response received.";
}

// ── Panel ─────────────────────────────────────────────────────────────────────
export function SparrowAIPanel() {
  const { open, setOpen } = useSparrowAI();
  const { user } = useSession();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const role = user?.role ?? "basic";
  const isAdmin = role === "admin";
  const displayName = (user?.fullName ?? user?.username ?? "there").split(" ")[0];
  const chips = isAdmin ? ADMIN_CHIPS : BASIC_CHIPS;
  const allowedRoutes = isAdmin ? ADMIN_ROUTES : BASIC_ROUTES;

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading, currentStep]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 80); }, [open]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const activeTab = getActiveTabFromDOM();
      const userMsg: Msg = { id: uid(), role: "user", content: trimmed };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);
      setCurrentStep("");

      try {
        const systemPrompt = buildSystemPrompt(role, displayName, currentPath, activeTab);
        const history = [...messages, userMsg].slice(-12).map((m) => ({
          role: m.role, content: m.content,
        }));

        const rawText = await callPuter([{ role: "system", content: systemPrompt }, ...history]);
        const { actions, displayText } = parseActions(rawText);

        const aiMsgId = uid();
        const aiMsg: Msg = {
          id: aiMsgId,
          role: "assistant",
          content: displayText,
          executing: actions.length > 0,
        };
        setMessages((prev) => [...prev, aiMsg]);

        if (actions.length > 0) {
          await executeActions(
            actions,
            (path) => navigate({ to: path as "/" }),
            allowedRoutes,
            (log) => setMessages((prev) => [...prev, { id: uid(), role: "assistant", content: `⚠️ ${log}` }]),
            (step) => setCurrentStep(step),
          );
          setMessages((prev) =>
            prev.map((m) => (m.id === aiMsgId ? { ...m, executing: false } : m)),
          );
          setCurrentStep("");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
        setMessages((prev) => [...prev, { id: uid(), role: "assistant", content: msg }]);
        setCurrentStep("");
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, role, displayName, currentPath, navigate, allowedRoutes],
  );

  if (!user) return null;

  return (
    <div className="flex flex-col h-full bg-card border-l border-border" role="complementary" aria-label="SPARROW AI">
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4 bg-card">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
            <Bot className="size-4 text-primary" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground">SPARROW AI</span>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
            {isAdmin ? "Admin" : "User"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 text-sm">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 py-10 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
              <Bot className="size-7 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">How can I help, {displayName}?</p>
              <p className="mt-1 text-xs text-muted-foreground max-w-[200px]">
                I can navigate, fill forms, and click buttons for you.
              </p>
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                msg.role === "user"
                  ? "rounded-tr-sm bg-primary text-primary-foreground"
                  : "rounded-tl-sm bg-muted text-foreground",
              )}
            >
              {renderMessage(msg.content)}
              {msg.executing && (
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" />
                  <span>{currentStep || "Working…"}</span>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && !messages.find((m) => m.executing) && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
              <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
              <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
              <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}
        {/* Floating step indicator when executing */}
        {currentStep && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-xl bg-primary/8 border border-primary/20 px-3 py-2 text-xs text-primary">
              <Loader2 className="size-3 animate-spin shrink-0" />
              <span>{currentStep}</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Quick chips */}
      {messages.length === 0 && (
        <div className="shrink-0 border-t border-border px-4 py-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Quick actions</p>
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
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
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
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground/50">POWERED BY SPARROW AI SOLUTIONS</p>
      </div>
    </div>
  );
}

// ── Trigger button ────────────────────────────────────────────────────────────
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
      <Bot className="size-3.5" />
      SPARROW AI
    </button>
  );
}

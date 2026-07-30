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

/** Get clean trimmed text of an element, stripping icon SVG whitespace. */
function cleanText(el: Element): string {
  return (el.textContent ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Find an input/textarea associated with a label text.
 * Searches the whole document including open dialogs/portals.
 * Handles: for=id, nested input, sibling pattern, placeholder/aria-label fallback.
 */
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
    // 2. nested
    const nested = label.querySelector<HTMLInputElement | HTMLTextAreaElement>("input, textarea");
    if (nested) return nested;
    // 3. sibling in same parent (shadcn / custom Field pattern)
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
  maxAttempts = 6,
  delay = 400,
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
 * Strips icon SVG whitespace and tries exact → contains matches,
 * then falls back to innerText for elements where textContent differs.
 */
function findButtonByText(text: string): HTMLButtonElement | null {
  const needle = text.toLowerCase().trim();
  const all = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));

  // exact clean-text match
  const exact = all.find((b) => cleanText(b) === needle);
  if (exact) return exact;

  // contains match (handles icon+text where SVG adds whitespace)
  const contains = all.find((b) => cleanText(b).includes(needle));
  if (contains) return contains;

  // innerText fallback (may differ from textContent in icon buttons)
  return (
    all.find((b) => (b.innerText ?? "").toLowerCase().trim() === needle) ??
    all.find((b) => (b.innerText ?? "").toLowerCase().trim().includes(needle)) ??
    null
  );
}

async function findButtonRetry(
  text: string,
  maxAttempts = 7,
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
 * Open an EntityPicker (combobox) by its label, type a search term,
 * and click the first matching item in the command list.
 */
async function openPickerByLabel(
  labelText: string,
  searchTerm: string,
): Promise<{ ok: boolean; message: string }> {
  const needle = labelText.toLowerCase().replace(/[₹*()]/g, "").trim();

  for (const label of Array.from(document.querySelectorAll<HTMLLabelElement>("label"))) {
    const ltext = (label.textContent ?? "").toLowerCase().replace(/[₹*()]/g, "").trim();
    if (!ltext.includes(needle) && !needle.includes(ltext)) continue;

    const container = label.closest("div");
    if (!container) continue;
    const btn = container.querySelector<HTMLButtonElement>('[role="combobox"]');
    if (!btn) continue;

    btn.scrollIntoView({ behavior: "smooth", block: "center" });
    await sleep(120);
    btn.click();
    await sleep(500);

    const searchInput = document.querySelector<HTMLInputElement>('[cmdk-input]');
    if (searchInput) {
      fillReactInput(searchInput, searchTerm);
      await sleep(400);
      const items = Array.from(document.querySelectorAll<HTMLElement>('[cmdk-item]'));
      const match = items.find(
        (i) => (i.textContent ?? "").toLowerCase().includes(searchTerm.toLowerCase()),
      );
      if (match) {
        match.click();
        return { ok: true, message: `Selected "${match.textContent?.trim()}"` };
      }
      return { ok: false, message: `No match for "${searchTerm}" in ${labelText} picker` };
    }
    return { ok: false, message: `Picker search box not found for "${labelText}"` };
  }
  return { ok: false, message: `Picker "${labelText}" not found on page` };
}

// ── Detect active sidebar tab from DOM ───────────────────────────────────────
function getActiveTabFromDOM(): string {
  // Desktop nav active item has bg-primary-soft class
  const desktopActive = document.querySelector<HTMLButtonElement>(
    "nav button.bg-primary-soft, nav li button.bg-primary-soft",
  );
  if (desktopActive) {
    const lines = (desktopActive.innerText ?? desktopActive.textContent ?? "").split("\n");
    const text = lines[0]?.trim();
    if (text && text.length < 30) return text;
  }
  // Mobile tab active = bg-primary text-primary-foreground
  const mobileActive = document.querySelector<HTMLButtonElement>(
    "button.bg-primary.text-primary-foreground",
  );
  if (mobileActive) {
    const text = (mobileActive.innerText ?? mobileActive.textContent ?? "").trim();
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
        await sleep(Math.min(act.ms, 5000));
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
        const btn = await findButtonRetry(act.text, 7, 400);
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

  return `You are SPARROW AI — a smart assistant embedded in a Transport Management System (TMS) for Garuda Logistics Solutions.

USER: ${userName} | ROLE: ${isAdmin ? "Admin" : "Basic User"} | CURRENT PAGE: ${currentPath}${tabCtx}

━━━ CORE RULES ━━━
- Be concise (under 80 words). State what you're doing, then do it.
- ${isAdmin ? "Full admin access to all modules." : "Basic user: NEVER use admin routes (Dashboard, Reports, Users, Settings)."}
- You CAN navigate, click, fill text fields, open pickers. You CANNOT save, delete, submit.
- ALWAYS include <<SPARROW_ACTIONS>> whenever you interact with the app.
- Never say "you can do it yourself" if you can do it via actions.

ALLOWED ROUTES: ${routes.join(", ")}

━━━ WHERE THINGS LIVE ━━━
- Trips, Income, Expenditure, Driver Payroll → /operations (sidebar tabs)
- Drivers, Vehicles, Transporters, Locations, Sources → /masters (sidebar tabs)
- Dashboard, Reports → /dashboard, /reports (admin only)

━━━ EXACT MODULE → TAB → BUTTON FLOW ━━━
New driver:       navigate /masters → click_tab "Driver"       → click_button "New driver"
New vehicle:      navigate /masters → click_tab "Vehicle"      → click_button "New vehicle"  (admin)
New transporter:  navigate /masters → click_tab "Transporter"  → click_button "New transporter"
New location:     navigate /masters → click_tab "Locations"    → click_button "New location" (admin)
New trip:         navigate /operations → click_tab "Trip"         → click_button "New trip"
New expenditure:  navigate /operations → click_tab "Expenditure"  → click_button "New expenditure"
New income:       navigate /operations → click_tab "Income"       → click_button "New income"

━━━ EXACT FIELD LABELS — use these EXACTLY in fill_input ━━━
Expenditure / Income form:
  "Expenditure name"  — type of expense (e.g. "Tea Expenses")
  "Amount"            — number (label shows "Amount (₹)", use "Amount")
  "Date"              — date picker
  "Note"              — city/remarks (e.g. "Ludhiana")
  "Branch (required)" — PICKER, use open_picker NOT fill_input
  "Vehicle"           — PICKER
  "Driver"            — PICKER  
  "Transporter"       — PICKER

Manifest form (inside trip, click "Create manifest" to open):
  "Cnmt No."          — consignment number
  "Weight (kg)"       — weight in kilograms
  "Quantity (units)"  — number of units  ← NOT "Units", NOT "Quantity"

Trip form tabs (visible after opening a trip):
  Manifest | Other Income | Expenses | Vehicle | Driver | Transporter | Summary

Driver form (at /masters Driver tab):
  "Driver Code", "Full Name", "Date of Birth", "Mobile Number", "Driving Licence Number"

Vehicle form (at /masters Vehicle tab):
  "Vehicle Number (Registration Number)", "Manufacturer", "Model", "Engine No.", "Chassis No."

━━━ TERMINOLOGY ALIASES — map user words to real fields ━━━
- "location" / "city" / "place" / "where" → fill "Note" field
- "department" / "branch" / "office"      → "Branch (required)" (picker — user must select)
- "expense type" / "type" / "category"    → "Expenditure name"
- "units" / "qty"                         → "Quantity (units)"
- "weight"                                → "Weight (kg)"

━━━ BRANCH PICKER — important ━━━
Branch is a dropdown picker, not a text field. You CANNOT type it — the user must click it.
When a task needs a branch: fill all text fields first, then tell the user:
"Please select a branch from the Branch dropdown to complete the form."

━━━ ACTION TIMING RULES ━━━
- After navigate: wait 1500ms before any click
- After click_tab: wait 900ms
- After click_button that opens a dialog/form: wait 1200ms before filling fields
- After open_picker: wait 500ms
- Use fill_input only on text/number/date inputs with a matching Label

━━━ ACTION FORMAT ━━━
<<SPARROW_ACTIONS>>
[
  {"type":"navigate","path":"/masters"},
  {"type":"wait","ms":1500},
  {"type":"click_tab","text":"Driver"},
  {"type":"wait","ms":900},
  {"type":"click_button","text":"New driver"},
  {"type":"wait","ms":1200},
  {"type":"fill_input","label":"Driver Code","value":"DRV-001"},
  {"type":"fill_input","label":"Full Name","value":"Rajan Singh"}
]
<<END_ACTIONS>>

BLOCKED buttons (never click): save, delete, remove, submit trip, close trip`;
}

// ── Minimal markdown renderer ─────────────────────────────────────────────────
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

const ADMIN_CHIPS = ["New expenditure", "New driver", "Open trip form", "Add vehicle", "Open dashboard"];
const BASIC_CHIPS = ["New expenditure", "New driver", "Open trip form", "New transporter"];

async function callPuter(messages: { role: string; content: string }[]): Promise<string> {
  const p = window.puter;
  if (!p?.ai?.chat) throw new Error("AI engine not ready. Please reload and try again.");
  type R = { message: { content: string } };
  const result = await Promise.race<R>([
    p.ai.chat(messages, { model: "gpt-4o-mini" }) as Promise<R>,
    new Promise<never>((_, rej) =>
      setTimeout(() => rej(new Error("Request timed out. Please try again.")), 30000),
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
  const messagesRef = useRef<HTMLDivElement>(null);

  const role = user?.role ?? "basic";
  const isAdmin = role === "admin";
  const displayName = (user?.fullName ?? user?.username ?? "there").split(" ")[0];
  const chips = isAdmin ? ADMIN_CHIPS : BASIC_CHIPS;
  const allowedRoutes = isAdmin ? ADMIN_ROUTES : BASIC_ROUTES;

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading, currentStep]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 100); }, [open]);

  // Auto-resize textarea
  const resizeTextarea = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  };

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const activeTab = getActiveTabFromDOM();
      const userMsg: Msg = { id: uid(), role: "user", content: trimmed };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      // Reset textarea height
      if (inputRef.current) { inputRef.current.style.height = "auto"; }
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
        setMessages((prev) => [...prev, {
          id: aiMsgId,
          role: "assistant",
          content: displayText,
          executing: actions.length > 0,
        }]);

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

      {/* ── Header ── */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2.5">
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

      {/* ── Messages ── */}
      <div
        ref={messagesRef}
        className="sparrow-scroll flex-1 overflow-y-auto px-4 py-4 space-y-3 text-sm"
      >

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}
          >
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
                  <Loader2 className="size-3 animate-spin shrink-0" />
                  <span>{currentStep || "Working…"}</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing dots while waiting for AI response */}
        {loading && !messages.find((m) => m.executing) && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
              <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
              <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
              <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        {/* Floating step banner when executing actions */}
        {currentStep && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/6 px-3 py-2 text-xs text-primary">
              <Loader2 className="size-3 animate-spin shrink-0" />
              <span>{currentStep}</span>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* ── Quick chips (empty state only) ── */}
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

      {/* ── ChatGPT-style input box ── */}
      <div className="shrink-0 p-3">
        <div className={cn(
          "rounded-2xl border border-border bg-muted/30 transition-colors",
          "focus-within:border-primary/50 focus-within:bg-background focus-within:shadow-sm",
        )}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); resizeTextarea(); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Message SPARROW AI…"
            rows={1}
            disabled={loading}
            className={cn(
              "block w-full resize-none bg-transparent px-4 pt-3 pb-1 text-sm",
              "placeholder:text-muted-foreground focus:outline-none",
              "disabled:opacity-50 min-h-[40px] max-h-[140px]",
            )}
          />
          <div className="flex items-center justify-between px-3 pb-2.5">
            <span className="text-[10px] text-muted-foreground/40 select-none">
              ↵ send · shift+↵ newline
            </span>
            <button
              type="button"
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
              className={cn(
                "flex size-8 items-center justify-center rounded-xl transition-all",
                input.trim() && !loading
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                  : "bg-muted text-muted-foreground cursor-not-allowed opacity-40",
              )}
            >
              {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            </button>
          </div>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground/40">
          POWERED BY SPARROW AI SOLUTIONS
        </p>
      </div>
    </div>
  );
}

// ── Trigger button ─────────────────────────────────────────────────────────────
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

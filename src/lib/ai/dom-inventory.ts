import { classifyButtonAction } from "./safety";

function text(el: Element | null | undefined) {
  return (el?.textContent ?? "").replace(/\s+/g, " ").trim();
}

function visible(el: HTMLElement) {
  const style = window.getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
}

function labelFor(el: HTMLElement) {
  const data = el.getAttribute("data-ai-label") || el.getAttribute("aria-label");
  if (data) return data.trim();
  if (el.id) {
    const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    const labelText = text(label);
    if (labelText) return labelText;
  }
  return text(el.closest("[class*='space-y'], [class*='grid'], [class*='field']")?.querySelector("label"));
}

export function scanVisiblePage() {
  const headings = Array.from(document.querySelectorAll<HTMLElement>("main h1, main h2, [role='dialog'] h2, [role='dialog'] h3"))
    .filter(visible).map(text).filter(Boolean).slice(0, 8);
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button"))
    .filter(visible).map((button) => ({ text: text(button), disabled: button.disabled, safety: classifyButtonAction(text(button)) }))
    .filter((b) => b.text).slice(0, 60);
  const fields = Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea"))
    .filter((field) => field.type !== "hidden" && visible(field))
    .map((field) => ({ label: labelFor(field), placeholder: field.placeholder, type: field.type || field.tagName.toLowerCase(), value: field.value ? "filled" : "", required: field.required }))
    .slice(0, 80);
  const pickers = Array.from(document.querySelectorAll<HTMLElement>('[role="combobox"], [data-radix-select-trigger]'))
    .filter(visible).map((picker) => ({ label: labelFor(picker), text: text(picker), expanded: picker.getAttribute("aria-expanded") === "true" }))
    .slice(0, 40);
  const options = Array.from(document.querySelectorAll<HTMLElement>('[role="option"], [cmdk-item], [data-radix-select-item]'))
    .filter(visible).map(text).filter(Boolean).slice(0, 60);
  const rows = Array.from(document.querySelectorAll<HTMLElement>("tbody tr, [data-row]"))
    .filter(visible).slice(0, 8).map((row) => text(row).slice(0, 180));
  return { headings, buttons, fields, pickers, options, rows };
}

export function getCompactPageInventory() {
  try { return JSON.stringify(scanVisiblePage()).slice(0, 6000); }
  catch { return "{}"; }
}

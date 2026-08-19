import { Check, ChevronDown, type LucideIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type MobileTab = {
  id: string;
  label: string;
  desc: string;
  icon: LucideIcon;
};

/** Compact navigation for small screens; desktop sidebars remain unchanged. */
export function MobileTabDropdown<T extends MobileTab>({
  tabs,
  activeId,
  label,
  onChange,
}: {
  tabs: readonly T[];
  activeId: T["id"];
  label: string;
  onChange: (id: T["id"]) => void;
}) {
  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];
  if (!active) return null;

  const ActiveIcon = active.icon;

  return (
    <nav aria-label={`${label} sections`} className="lg:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left shadow-sm outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ActiveIcon className="size-4 shrink-0 text-primary" />
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {label} section
              </span>
              <span className="block truncate text-sm font-semibold">{active.label}</span>
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-[min(70dvh,var(--radix-dropdown-menu-content-available-height))] w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto overscroll-contain">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const selected = tab.id === activeId;
            return (
              <DropdownMenuItem
                key={tab.id}
                onSelect={() => onChange(tab.id)}
                className="flex cursor-pointer items-center gap-3 py-2.5"
              >
                <Icon className={`size-4 shrink-0 ${selected ? "text-primary" : ""}`} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{tab.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{tab.desc}</span>
                </span>
                {selected && <Check className="size-4 shrink-0 text-primary" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}

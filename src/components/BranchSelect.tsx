import { Check, ChevronsUpDown, Search } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useBranches } from "@/lib/use-branches";

export function BranchSelect({
  value,
  onChange,
  label = "Controlling Branch",
}: {
  value: string | null | undefined;
  onChange: (id: string | null) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const branches = useBranches();
  const selected = branches.find((b) => b.id === value);

  return (
    <div className="space-y-1.5 sm:col-span-2">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-10 w-full justify-between font-normal"
          >
            <span className="flex min-w-0 items-center gap-2 truncate">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              {selected ? (
                <span className="truncate">
                  {selected.branch_name}
                  {selected.branch_type ? (
                    <span className="ml-1 text-muted-foreground">
                      ({selected.branch_type})
                    </span>
                  ) : null}
                </span>
              ) : (
                <span className="text-muted-foreground">Select branch</span>
              )}
            </span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search branches…" />
            <CommandList>
              <CommandEmpty>No branches found.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="__none__"
                  onSelect={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("size-4", !value ? "opacity-100" : "opacity-0")} />
                  <span className="text-muted-foreground">No branch</span>
                </CommandItem>
                {branches.map((b) => (
                  <CommandItem
                    key={b.id}
                    value={`${b.branch_name} ${b.branch_type ?? ""}`}
                    onSelect={() => {
                      onChange(b.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn("size-4", value === b.id ? "opacity-100" : "opacity-0")}
                    />
                    <span className="truncate">{b.branch_name}</span>
                    {b.branch_type ? (
                      <span className="ml-auto text-xs text-muted-foreground">
                        {b.branch_type}
                      </span>
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

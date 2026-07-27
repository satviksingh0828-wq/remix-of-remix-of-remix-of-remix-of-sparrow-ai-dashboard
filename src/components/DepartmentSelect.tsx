import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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

type Dept = { id: string; name: string; code: string | null };

export function DepartmentSelect({
  value,
  onChange,
  label = "Controlling Department",
}: {
  value: string | null | undefined;
  onChange: (id: string | null) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [depts, setDepts] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("departments")
        .select("id,name,code")
        .order("name", { ascending: true });
      setDepts((data as Dept[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const selected = depts.find((d) => d.id === value);

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
                  {selected.name}
                  {selected.code ? (
                    <span className="ml-1 text-muted-foreground">({selected.code})</span>
                  ) : null}
                </span>
              ) : (
                <span className="text-muted-foreground">
                  {loading ? "Loading…" : "Select department"}
                </span>
              )}
            </span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search departments…" />
            <CommandList>
              <CommandEmpty>No departments found.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="__none__"
                  onSelect={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn("size-4", !value ? "opacity-100" : "opacity-0")}
                  />
                  <span className="text-muted-foreground">No department</span>
                </CommandItem>
                {depts.map((d) => (
                  <CommandItem
                    key={d.id}
                    value={`${d.name} ${d.code ?? ""}`}
                    onSelect={() => {
                      onChange(d.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn("size-4", value === d.id ? "opacity-100" : "opacity-0")}
                    />
                    <span className="truncate">{d.name}</span>
                    {d.code ? (
                      <span className="ml-auto text-xs text-muted-foreground">{d.code}</span>
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

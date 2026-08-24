import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Loader2, RotateCcw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/lib/session";
import {
  ACCESS_ROLES,
  ACCESS_SCOPES,
  serverGetAccessMatrix,
  serverSaveAccessMatrix,
  type AccessAction,
  type AccessRole,
  type BranchMode,
  type RoleAccess,
} from "@/lib/access-control";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROLE_LABELS: Record<AccessRole, string> = {
  admin: "Admin",
  viewer: "Manager",
  basic: "Basic User",
};
const ACTION_LABELS: Record<AccessAction, string> = {
  read: "Read",
  create: "Create",
  update: "Write",
  delete: "Delete",
  approve: "Approve",
  close: "Close",
  reopen: "Reopen",
  import: "Import",
  export: "Export",
  manage: "Manage",
};

export function AccessLevelSettings() {
  const { user } = useSession();
  const token = user?.sessionToken ?? "";
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(() => new Set(["Operations"]));
  const query = useQuery({
    queryKey: ["access-level-matrix"],
    queryFn: () => serverGetAccessMatrix({ data: token }),
    enabled: user?.role === "admin" && Boolean(token),
  });
  const mutation = useMutation({
    mutationFn: serverSaveAccessMatrix,
    onMutate: async ({ data }) => {
      await queryClient.cancelQueries({ queryKey: ["access-level-matrix"] });
      const previous = queryClient.getQueryData<Record<AccessRole, RoleAccess>>([
        "access-level-matrix",
      ]);
      queryClient.setQueryData<Record<AccessRole, RoleAccess>>(
        ["access-level-matrix"],
        (current) => {
          if (!current) return current;
          return {
            ...current,
            [data.role]: {
              permissions: {
                ...current[data.role].permissions,
                [data.scopeKey]: {
                  ...current[data.role].permissions[data.scopeKey],
                  [data.action]: data.allowed,
                },
              },
              branchModes: {
                ...current[data.role].branchModes,
                [data.scopeKey]: data.branchMode,
              },
            },
          };
        },
      );
      return { previous };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["access-level-matrix"] }),
    onError: (error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(["access-level-matrix"], context.previous);
      toast.error(error instanceof Error ? error.message : "Could not update access");
    },
  });
  const modules = useMemo(() => [...new Set(ACCESS_SCOPES.map((scope) => scope.module))], []);

  function toggleModule(module: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(module)) next.delete(module);
      else next.add(module);
      return next;
    });
  }

  function save(
    role: AccessRole,
    scopeKey: string,
    action: AccessAction,
    allowed: boolean,
    branchMode: BranchMode,
  ) {
    mutation.mutate({ data: { token, role, scopeKey, action, allowed, branchMode } });
  }

  // Defence in depth: Settings already redirects non-admins, and both server
  // functions verify an HMAC-signed admin token. Never render this panel for a
  // non-admin even if it is accidentally mounted somewhere else in the future.
  if (user?.role !== "admin") return null;

  if (!token)
    return (
      <div className="surface-card p-6 text-center">
        <p className="text-sm font-medium">Your admin session needs to be refreshed.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Sign out and sign in again, then open Access Level.
        </p>
      </div>
    );

  if (query.isLoading)
    return (
      <div className="surface-card flex min-h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  if (query.isError || !query.data)
    return (
      <div className="surface-card p-6 text-center">
        <p className="text-sm font-medium">Access Level tables are not available.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Run ACCESS_LEVELS_SUPABASE.sql in Supabase, then retry.
        </p>
        <Button className="mt-4" variant="outline" onClick={() => query.refetch()}>
          <RotateCcw className="size-4" />
          Retry
        </Button>
      </div>
    );

  return (
    <div className="space-y-5 animate-fade-up">
      <section className="surface-card p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <h3 className="text-sm font-semibold">Role permission matrix</h3>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">
              Expand a scope group and grant or withdraw individual rights. Manager is stored as the
              existing Viewer role. Basic User branch-aware scopes remain limited to assigned
              branches by default. Changes apply without a deployment.
            </p>
          </div>
        </div>
      </section>

      <section className="surface-card overflow-hidden">
        <div className="grid grid-cols-[minmax(220px,1.25fr)_repeat(3,minmax(210px,1fr))] border-b bg-muted/40 text-xs font-semibold uppercase tracking-wide">
          <div className="p-4">Scope</div>
          {ACCESS_ROLES.map((role) => (
            <div key={role} className="border-l p-4 text-center">
              {ROLE_LABELS[role]}
            </div>
          ))}
        </div>
        <div className="divide-y">
          {modules.map((module) => {
            const scopes = ACCESS_SCOPES.filter((scope) => scope.module === module);
            const open = expanded.has(module);
            return (
              <div key={module}>
                <button
                  type="button"
                  onClick={() => toggleModule(module)}
                  className="flex w-full items-center gap-2 bg-muted/20 px-4 py-3 text-left text-sm font-semibold hover:bg-muted/40"
                >
                  <ChevronDown
                    className={`size-4 transition-transform ${open ? "" : "-rotate-90"}`}
                  />
                  {module}
                  <Badge variant="secondary" className="ml-1">
                    {scopes.length}
                  </Badge>
                </button>
                {open && (
                  <div className="divide-y">
                    {scopes.map((scope) => (
                      <div
                        key={scope.key}
                        className="grid grid-cols-[minmax(220px,1.25fr)_repeat(3,minmax(210px,1fr))]"
                      >
                        <div className="p-4">
                          <p className="text-sm font-medium">{scope.label}</p>
                          <p className="mt-1 text-xs leading-4 text-muted-foreground">
                            {scope.description}
                          </p>
                          {scope.branchAware && (
                            <Badge variant="outline" className="mt-2 text-[10px]">
                              Branch-wise
                            </Badge>
                          )}
                        </div>
                        {ACCESS_ROLES.map((role) => {
                          const roleData = query.data[role];
                          const branchMode =
                            roleData.branchModes[scope.key] ??
                            (scope.branchAware ? (role === "basic" ? "assigned" : "all") : "none");
                          return (
                            <div key={role} className="space-y-3 border-l p-3">
                              <div className="grid grid-cols-2 gap-2">
                                {scope.actions.map((action) => {
                                  const checked =
                                    roleData.permissions[scope.key]?.[action] === true;
                                  return (
                                    <label
                                      key={action}
                                      className="flex items-center gap-2 rounded-md px-1.5 py-1 text-xs hover:bg-muted/50"
                                    >
                                      <Checkbox
                                        checked={checked}
                                        onCheckedChange={(value) =>
                                          save(role, scope.key, action, value === true, branchMode)
                                        }
                                      />
                                      {ACTION_LABELS[action]}
                                    </label>
                                  );
                                })}
                              </div>
                              {scope.branchAware && (
                                <Select
                                  value={branchMode}
                                  onValueChange={(value: BranchMode) => {
                                    const firstAction = scope.actions[0];
                                    save(
                                      role,
                                      scope.key,
                                      firstAction,
                                      roleData.permissions[scope.key]?.[firstAction] === true,
                                      value,
                                    );
                                  }}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">All branches</SelectItem>
                                    <SelectItem value="assigned">Assigned branches</SelectItem>
                                    <SelectItem value="none">No branch access</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

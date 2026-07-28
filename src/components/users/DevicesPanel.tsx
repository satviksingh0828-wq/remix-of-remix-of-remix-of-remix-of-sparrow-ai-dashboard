/**
 * DevicesPanel — Admin panel to manage WebAuthn device registrations.
 * Approve / reject devices and assign each to one or more app user accounts.
 */
import { useEffect, useState } from "react";
import { CheckCircle, Fingerprint, RefreshCw, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  serverListDevices, serverUpdateDevice, serverDeleteDevice, serverListAppUsers,
  type DeviceRow, type AppUserOption,
} from "@/lib/passkey";

const STATUS_BADGE: Record<string, string> = {
  pending:  "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  approved: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

// ── Multi-user checkbox list ───────────────────────────────────────────────────

function UserCheckList({
  users,
  selected,
  onChange,
}: {
  users: AppUserOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  }

  if (users.length === 0) {
    return <p className="text-xs text-muted-foreground">No active users found.</p>;
  }

  return (
    <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
      {users.map(u => (
        <label
          key={u.id}
          className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/50 border-b border-border/40 last:border-0"
        >
          <input
            type="checkbox"
            checked={selected.includes(u.id)}
            onChange={() => toggle(u.id)}
            className="size-4 accent-primary"
          />
          <span className="text-sm">
            <span className="font-medium">{u.full_name || u.username}</span>
            {u.full_name ? (
              <span className="ml-1.5 text-xs text-muted-foreground">({u.username})</span>
            ) : null}
          </span>
        </label>
      ))}
    </div>
  );
}

// ── Approve / Edit modal ──────────────────────────────────────────────────────

function ApproveModal({
  device,
  users,
  onClose,
  onDone,
}: {
  device: DeviceRow;
  users: AppUserOption[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>(device.assigned_user_ids);
  const [saving, setSaving] = useState(false);

  async function handleApprove() {
    setSaving(true);
    try {
      const result = await serverUpdateDevice({
        data: {
          id: device.id,
          status: "approved",
          appUserIds: selectedIds,
        },
      });
      if (result.error) { toast.error(result.error); return; }
      toast.success("Device approved.");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not approve device");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-1 flex items-center gap-2">
          <CheckCircle className="size-5 text-green-500" />
          <h3 className="text-base font-semibold">Approve Device</h3>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Approve <strong>{device.requester_name}</strong> and assign permitted user accounts.
          Only the selected users will be able to log in from this device.
          Leave all unchecked to allow any user.
        </p>

        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Allowed Users
              {selectedIds.length > 0 && (
                <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-normal">
                  {selectedIds.length} selected
                </span>
              )}
            </label>
            <UserCheckList users={users} selected={selectedIds} onChange={setSelectedIds} />
            {selectedIds.length === 0 && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                No users selected — any user account may log in from this device.
              </p>
            )}
          </div>

          <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Device info:</span>{" "}
            {device.device_info ? device.device_info.slice(0, 80) + (device.device_info.length > 80 ? "…" : "") : "—"}
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <Button className="flex-1" onClick={handleApprove} disabled={saving}>
            <CheckCircle className="size-4" />
            {saving ? "Approving…" : "Approve"}
          </Button>
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function DevicesPanel() {
  const [devices, setDevices]     = useState<DeviceRow[]>([]);
  const [users, setUsers]         = useState<AppUserOption[]>([]);
  const [loading, setLoading]     = useState(true);
  const [approving, setApproving] = useState<DeviceRow | null>(null);
  const [working, setWorking]     = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [devs, usrs] = await Promise.all([serverListDevices(), serverListAppUsers()]);
      setDevices(devs);
      setUsers(usrs);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load devices");
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleReject(device: DeviceRow) {
    if (!confirm(`Reject device for "${device.requester_name}"? They will see an Access Denied screen.`)) return;
    setWorking(device.id);
    try {
      const r = await serverUpdateDevice({ data: { id: device.id, status: "rejected", appUserIds: device.assigned_user_ids } });
      if (r.error) { toast.error(r.error); return; }
      toast.success("Device rejected.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setWorking(null);
    }
  }

  async function handleDelete(device: DeviceRow) {
    if (!confirm(`Delete device registration for "${device.requester_name}"? This cannot be undone.`)) return;
    setWorking(device.id);
    try {
      const r = await serverDeleteDevice({ data: device.id });
      if (r.error) { toast.error(r.error); return; }
      toast.success("Device deleted.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setWorking(null);
    }
  }

  const pending  = devices.filter(d => d.status === "pending");
  const approved = devices.filter(d => d.status === "approved");
  const rejected = devices.filter(d => d.status === "rejected");

  return (
    <div className="animate-fade-up space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Device Registrations</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage Windows Hello / Passkey device access requests.
            Approve devices and assign which user accounts can log in from each device.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "Pending",  count: pending.length,  cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800" },
          { label: "Approved", count: approved.length, cls: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800" },
          { label: "Rejected", count: rejected.length, cls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800" },
        ].map(s => (
          <span key={s.label} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-medium ${s.cls}`}>
            {s.label} <span className="font-bold">{s.count}</span>
          </span>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : devices.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-14 text-center">
          <Fingerprint className="mx-auto size-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">No device registrations yet.</p>
          <p className="text-xs text-muted-foreground">When someone requests access from a new device, it will appear here.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Requester</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Allowed Users</th>
                <th className="px-4 py-3">Device Info</th>
                <th className="px-4 py-3">Requested</th>
                <th className="px-4 py-3">Last Used</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {devices.map(d => (
                <tr key={d.id} className="border-b border-border/60 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Fingerprint className="size-4 text-primary" />
                      </div>
                      <span className="font-medium">{d.requester_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE[d.status] ?? ""}`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {d.assigned_user_names.length === 0 ? (
                      <span className="text-xs text-muted-foreground opacity-60">Any user</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {d.assigned_user_names.map((name, i) => (
                          <span key={i} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            {name}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <span className="line-clamp-1 text-xs text-muted-foreground" title={d.device_info}>
                      {d.device_info ? d.device_info.slice(0, 60) + (d.device_info.length > 60 ? "…" : "") : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {fmtDate(d.created_at)}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {fmtDate(d.last_used_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {d.status !== "approved" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2.5 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                          disabled={working === d.id}
                          onClick={() => setApproving(d)}
                        >
                          <CheckCircle className="size-3.5" />
                          Approve
                        </Button>
                      )}
                      {d.status === "approved" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2.5 text-xs"
                          disabled={working === d.id}
                          onClick={() => setApproving(d)}
                        >
                          Edit Users
                        </Button>
                      )}
                      {d.status !== "rejected" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                          disabled={working === d.id}
                          onClick={() => handleReject(d)}
                        >
                          <XCircle className="size-3.5" />
                          Reject
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600"
                        disabled={working === d.id}
                        onClick={() => handleDelete(d)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Approve / Edit modal */}
      {approving && (
        <ApproveModal
          device={approving}
          users={users}
          onClose={() => setApproving(null)}
          onDone={async () => {
            setApproving(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

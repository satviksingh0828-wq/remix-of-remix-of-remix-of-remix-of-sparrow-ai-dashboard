export type AppRole = "admin" | "semi_admin" | "basic" | "viewer";

export function isAdminLike(role: string | null | undefined): boolean {
  return role === "admin" || role === "semi_admin";
}

export function canAccessTms(role: string | null | undefined): boolean {
  return role === "admin" || role === "semi_admin" || role === "viewer";
}

export function canAccessHrms(role: string | null | undefined): boolean {
  return role === "admin" || role === "semi_admin" || role === "viewer";
}

export function canAccessReports(role: string | null | undefined): boolean {
  return role === "admin" || role === "semi_admin" || role === "basic" || role === "viewer";
}

export function canAccessSettingsOrUsers(role: string | null | undefined): boolean {
  return role === "admin";
}

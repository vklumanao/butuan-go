export const USER_ROLES = Object.freeze({
  REQUESTOR: "requestor",
  RUNNER: "runner",
  ADMIN: "admin",
});

export const ROLE_LABELS = {
  [USER_ROLES.REQUESTOR]: "Requestor",
  [USER_ROLES.RUNNER]: "Runner",
  [USER_ROLES.ADMIN]: "Admin",
};

export function getActiveRole(profile) {
  return profile?.active_role || profile?.role || null;
}

export function getDashboardPath(role) {
  if (role === USER_ROLES.REQUESTOR) return "/requestor/dashboard";
  if (role === USER_ROLES.RUNNER) return "/runner/dashboard";
  return "/unauthorized";
}

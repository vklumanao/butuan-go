export const USER_ROLES = Object.freeze({
  REQUESTOR: "requestor",
  RUNNER: "runner",
  ADMIN: "admin",
});

export const ACCOUNT_ACCESS_LEVELS = Object.freeze({
  RESTRICTED: "RESTRICTED",
  SUSPENDED: "SUSPENDED",
  BANNED: "BANNED",
});

export const ACCOUNT_ACCESS_LABELS = Object.freeze({
  [ACCOUNT_ACCESS_LEVELS.RESTRICTED]: "Restricted",
  [ACCOUNT_ACCESS_LEVELS.SUSPENDED]: "Suspended",
  [ACCOUNT_ACCESS_LEVELS.BANNED]: "Permanently banned",
});

export const ROLE_LABELS = {
  [USER_ROLES.REQUESTOR]: "Requestor",
  [USER_ROLES.RUNNER]: "Runner",
  [USER_ROLES.ADMIN]: "Admin",
};

export const CURRENT_TERMS_VERSION = "2026-07-31";

export function getActiveRole(profile) {
  return profile?.active_role || profile?.role || null;
}

export function hasCompletedOnboarding(profile) {
  return Boolean(profile?.onboarding_completed_at);
}

export function getDashboardPath(role) {
  if (role === USER_ROLES.REQUESTOR) return "/requestor/dashboard";
  if (role === USER_ROLES.RUNNER) return "/runner/dashboard";
  if (role === USER_ROLES.ADMIN) return "/admin/dashboard";
  return "/unauthorized";
}

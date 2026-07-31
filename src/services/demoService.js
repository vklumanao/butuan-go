const ACCOUNTS_KEY = "butuango_demo_accounts";
const SESSION_KEY = "butuango_demo_session";
const AUTH_EVENT = "butuango-demo-auth";

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function notify(session) {
  window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: session }));
}
function authError(message, code = "demo_error") {
  return { message, code };
}

export function getDemoSession() {
  return read(SESSION_KEY, null);
}
export function subscribeToDemoAuth(callback) {
  const handler = (event) => callback(event.detail);
  window.addEventListener(AUTH_EVENT, handler);
  return () => window.removeEventListener(AUTH_EVENT, handler);
}

export async function demoSignOut() {
  localStorage.removeItem(SESSION_KEY);
  notify(null);
  return { error: null };
}
export async function demoGetProfile(userId) {
  const account = read(ACCOUNTS_KEY, []).find(
    (item) => item.user.id === userId,
  );
  return account
    ? {
        data: {
          ...account.profile,
          active_role: account.profile.active_role || account.profile.role,
          onboarding_completed_at:
            account.profile.onboarding_completed_at ||
            account.profile.created_at ||
            new Date().toISOString(),
          terms_accepted_at: account.profile.terms_accepted_at || null,
          terms_version: account.profile.terms_version || null,
          signup_method: account.profile.signup_method || "legacy",
        },
        error: null,
      }
    : { data: null, error: authError("Profile not found", "PGRST116") };
}

export async function demoUpdateProfile(userId, values) {
  const accounts = read(ACCOUNTS_KEY, []);
  const index = accounts.findIndex((item) => item.user.id === userId);
  if (index < 0)
    return { data: null, error: authError("Profile not found", "PGRST116") };
  accounts[index].profile = {
    ...accounts[index].profile,
    full_name: values.fullName.trim(),
    phone_number: values.phoneNumber.trim(),
    updated_at: new Date().toISOString(),
  };
  write(ACCOUNTS_KEY, accounts);
  return { data: accounts[index].profile, error: null };
}

export async function demoSwitchActiveRole(userId, role) {
  if (!["requestor", "runner"].includes(role)) {
    return {
      data: null,
      error: authError("Active role must be requestor or runner"),
    };
  }
  const accounts = read(ACCOUNTS_KEY, []);
  const index = accounts.findIndex((item) => item.user.id === userId);
  if (index < 0)
    return { data: null, error: authError("Profile not found", "PGRST116") };
  accounts[index].profile = {
    ...accounts[index].profile,
    active_role: role,
    updated_at: new Date().toISOString(),
  };
  write(ACCOUNTS_KEY, accounts);
  return { data: accounts[index].profile, error: null };
}

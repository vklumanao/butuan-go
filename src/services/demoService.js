const ACCOUNTS_KEY = "butuango_demo_accounts";
const SESSION_KEY = "butuango_demo_session";
const AUTH_EVENT = "butuango-demo-auth";
const RECOVERY_KEY = "butuango_demo_recovery_email";

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

export async function demoSignUp({
  email,
  password,
  fullName,
  phoneNumber,
  role,
}) {
  const accounts = read(ACCOUNTS_KEY, []);
  const normalizedEmail = email.trim().toLowerCase();
  if (accounts.some((account) => account.profile.email === normalizedEmail))
    return { data: null, error: authError("User already registered") };
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const profile = {
    id,
    full_name: fullName.trim(),
    email: normalizedEmail,
    phone_number: phoneNumber.trim(),
    role,
    active_role: role,
    avatar_url: null,
    created_at: now,
    updated_at: now,
  };
  const user = { id, email: normalizedEmail, created_at: now };
  accounts.push({ user, profile, password });
  write(ACCOUNTS_KEY, accounts);
  const session = { access_token: `demo-${id}`, user };
  write(SESSION_KEY, session);
  notify(session);
  return { data: { user, session }, error: null };
}

export async function demoSignIn({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();
  const account = read(ACCOUNTS_KEY, []).find(
    (item) =>
      item.profile.email === normalizedEmail && item.password === password,
  );
  if (!account)
    return { data: null, error: authError("Invalid login credentials") };
  const session = {
    access_token: `demo-${account.user.id}`,
    user: account.user,
  };
  write(SESSION_KEY, session);
  notify(session);
  return { data: { user: account.user, session }, error: null };
}

export async function demoSignOut() {
  localStorage.removeItem(SESSION_KEY);
  notify(null);
  return { error: null };
}

export async function demoRequestPasswordReset(email) {
  const normalizedEmail = email.trim().toLowerCase();
  const exists = read(ACCOUNTS_KEY, []).some(
    (item) => item.profile.email === normalizedEmail,
  );
  if (exists) sessionStorage.setItem(RECOVERY_KEY, normalizedEmail);
  return { data: {}, error: null };
}

export async function demoUpdatePassword(password) {
  const email = sessionStorage.getItem(RECOVERY_KEY);
  if (!email)
    return { data: null, error: authError("Recovery session is missing") };
  const accounts = read(ACCOUNTS_KEY, []);
  const index = accounts.findIndex((item) => item.profile.email === email);
  if (index < 0)
    return { data: null, error: authError("Recovery session is invalid") };
  accounts[index].password = password;
  write(ACCOUNTS_KEY, accounts);
  sessionStorage.removeItem(RECOVERY_KEY);
  return { data: { user: accounts[index].user }, error: null };
}

export function hasDemoRecoverySession() {
  return Boolean(sessionStorage.getItem(RECOVERY_KEY));
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

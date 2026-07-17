import { isDemoMode, supabase } from "@/lib/supabase";
import {
  demoRequestPasswordReset,
  demoSignIn,
  demoSignOut,
  demoSignUp,
  demoUpdatePassword,
} from "./demoService";

export async function signUpWithEmail({
  email,
  password,
  fullName,
  phoneNumber,
  role,
}) {
  if (isDemoMode)
    return demoSignUp({ email, password, fullName, phoneNumber, role });
  return supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
      data: {
        full_name: fullName.trim(),
        phone_number: phoneNumber.trim(),
        role,
      },
    },
  });
}

export async function signInWithEmail({ email, password }) {
  if (isDemoMode) return demoSignIn({ email, password });
  return supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
}

export async function signOutUser() {
  if (isDemoMode) return demoSignOut();
  return supabase.auth.signOut();
}

export async function requestPasswordReset(email) {
  if (isDemoMode) return demoRequestPasswordReset(email);
  return supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${window.location.origin}/reset-password`,
  });
}

export async function changePassword(password) {
  if (isDemoMode) return demoUpdatePassword(password);
  return supabase.auth.updateUser({ password });
}

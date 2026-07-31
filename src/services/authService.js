import { isDemoMode, supabase } from "@/lib/supabase";
import { demoSignOut } from "./demoService";

export async function signInWithGoogle() {
  if (isDemoMode) {
    return {
      data: null,
      error: {
        code: "google_oauth_required",
        message:
          "Turn off demo mode and configure Supabase to use Google sign-in.",
      },
    };
  }

  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
}

export async function signOutUser() {
  if (isDemoMode) return demoSignOut();
  return supabase.auth.signOut();
}

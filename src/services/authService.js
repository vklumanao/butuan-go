import { isDemoMode, supabase } from "@/lib/supabase";
import { isPublicAuthEnabled } from "@/lib/appConfig";
import { demoSignOut } from "./demoService";

export async function signInWithGoogle() {
  if (!isPublicAuthEnabled) {
    return {
      data: null,
      error: {
        code: "public_auth_disabled",
        message: "Public Google access is not open yet.",
      },
    };
  }

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

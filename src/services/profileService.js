import { isDemoMode, supabase } from "@/lib/supabase";
import {
  demoGetProfile,
  demoSwitchActiveRole,
  demoUpdateProfile,
} from "./demoService";

const PROFILE_SELECT =
  "id, full_name, email, phone_number, role, active_role, avatar_url, created_at, updated_at";

export async function getProfile(userId) {
  if (isDemoMode) return demoGetProfile(userId);
  return supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", userId)
    .single();
}

export async function updateProfile(userId, values) {
  if (isDemoMode) return demoUpdateProfile(userId, values);
  return supabase
    .from("profiles")
    .update({
      full_name: values.fullName.trim(),
      phone_number: values.phoneNumber.trim(),
    })
    .eq("id", userId)
    .select(PROFILE_SELECT)
    .single();
}

export async function switchProfileActiveRole(userId, role) {
  if (isDemoMode) return demoSwitchActiveRole(userId, role);
  const { data, error } = await supabase.rpc("switch_active_role", {
    p_role: role,
  });
  return { data: Array.isArray(data) ? data[0] || null : data, error };
}
